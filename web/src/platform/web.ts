/**
 * ブラウザ専用の機能はこのファイルに集める。
 * Expo版では、同じ名前の関数を AsyncStorage・expo-audio・expo-haptics・expo-keep-awake で作り直す。
 */
import { useEffect } from 'react';
import type { TournamentState } from '../engine';
import { deserialize, serialize, STORAGE_KEY, type SavedGame } from '../state/persistence';

// localStorage はプライベートブラウズなどで使えないことがあるので、失敗しても止まらないようにする

export function loadGame(): SavedGame | null {
  try {
    return deserialize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveGame(tournament: TournamentState | null, past: TournamentState[]): void {
  try {
    if (tournament) localStorage.setItem(STORAGE_KEY, serialize(tournament, past));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 保存できなくてもアプリは使える
  }
}

const SOUND_KEY = 'holdem-tracker/sound';

export function loadSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundOn(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // 設定が残らないだけ
  }
}

let audio: AudioContext | null = null;

/** レベルアップの合図（短い音を3回） */
export function playLevelUpSound(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const start = audio.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = i === 2 ? 1320 : 880;
      gain.gain.setValueAtTime(0.25, start + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, start + i * 0.25 + 0.2);
      osc.connect(gain).connect(audio.destination);
      osc.start(start + i * 0.25);
      osc.stop(start + i * 0.25 + 0.2);
    }
  } catch {
    // 音が出せない環境では何もしない
  }
}

export function vibrate(): void {
  navigator.vibrate?.([200, 100, 200]);
}

/** 画面がつけっぱなしになるようにする（卓の真ん中に置いて使うため） */
export function useKeepAwake(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    // 別のアプリに切り替えると解除されるので、戻ってきたら取り直す
    document.addEventListener('visibilitychange', request);
    request();
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, []);
}
