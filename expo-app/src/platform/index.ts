/**
 * 端末の機能はこのファイルに集める（Web版の web/src/platform/web.ts に対応）。
 * Expo のライブラリは Android・iOS・Web のどれでも動くので、OSごとの書き分けはほぼ不要。
 * AsyncStorage は非同期なので、読み込み系の関数は Promise を返す（Web版の localStorage との違い）。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getLocales } from 'expo-localization';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { TournamentState } from '@holdem/shared/engine';
import { isLanguage, type Language } from '@holdem/shared/i18n';
import { deserialize, serialize, STORAGE_KEY, type SavedGame } from '@holdem/shared/state/persistence';

const SOUND_KEY = 'holdem-tracker/sound';
const LANGUAGE_KEY = 'holdem-tracker/language';

// 保存に失敗してもアプリは使えるので、エラーで止めない

export async function loadGame(): Promise<SavedGame | null> {
  try {
    return deserialize(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function saveGame(tournament: TournamentState | null, past: TournamentState[]): Promise<void> {
  try {
    if (tournament) await AsyncStorage.setItem(STORAGE_KEY, serialize(tournament, past));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // 保存できなくてもアプリは使える
  }
}

export async function loadSoundOn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SOUND_KEY)) !== 'off';
  } catch {
    return true;
  }
}

export async function saveSoundOn(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // 設定が残らないだけ
  }
}

/** 端末の言語設定（優先順）。例：['ja-JP', 'en-US']。アプリごとの言語設定があればそちらが入る */
export function getDeviceLanguages(): readonly string[] {
  return getLocales().map((locale) => locale.languageTag);
}

/** 利用者が選んだ言語。まだ選んでいなければ null（端末の言語設定に合わせる） */
export async function loadLanguage(): Promise<Language | null> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

export async function saveLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // 設定が残らないだけ
  }
}

/** Web で動いているときだけ、ページの言語（<html lang>）とタイトルを合わせる */
export function setDocumentLanguage(language: Language, title: string): void {
  if (Platform.OS !== 'web') return;
  document.documentElement.lang = language;
  document.title = title;
}

let player: AudioPlayer | null = null;

/** レベルアップの合図（Web版と同じ短い音を3回） */
export function playLevelUpSound(): void {
  try {
    player ??= createAudioPlayer(require('../../assets/sounds/levelup.wav'));
    player.seekTo(0);
    player.play();
  } catch {
    // 音が出せない環境では何もしない
  }
}

export function vibrate(): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/**
 * 画面がつけっぱなしになるようにする（卓の真ん中に置いて使うため）。
 * expo-keep-awake の useKeepAwake は、有効になる前に画面を離れると Web でエラーになるので、
 * 有効化が終わるのを待ってから解除する。使えない環境（一部のブラウザ）では何もしない。
 */
export function useKeepAwake(): void {
  useEffect(() => {
    const tag = 'table-screen';
    const activated = activateKeepAwakeAsync(tag).then(
      () => true,
      () => false,
    );
    return () => {
      void activated.then((ok) => (ok ? deactivateKeepAwake(tag) : undefined)).catch(() => {});
    };
  }, []);
}
