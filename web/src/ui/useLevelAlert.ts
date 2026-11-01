import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { levelNumber, type StructureItem } from '@holdem/shared/engine';
import { playLevelUpSound, vibrate } from '../platform/web';
import { blindsText } from '@holdem/shared/state/format';

const SHOW_MS = 15_000;

/** レベルが上がったら音と振動で知らせ、しばらくバナーを出す */
export function useLevelAlert(index: number, structure: StructureItem[], soundOn: boolean) {
  const { t } = useTranslation();
  // 最後にバナーで知らせたレベル。index がこれより大きくなったらバナーを出す
  const [seenIndex, setSeenIndex] = useState(index);
  if (index < seenIndex) setSeenIndex(index);

  const prevIndex = useRef(index);
  useEffect(() => {
    if (index > prevIndex.current) {
      if (soundOn) playLevelUpSound();
      vibrate();
    }
    prevIndex.current = index;
  }, [index, soundOn]);

  const showing = index > seenIndex;
  useEffect(() => {
    if (!showing) return;
    const id = setTimeout(() => setSeenIndex(index), SHOW_MS);
    return () => clearTimeout(id);
  }, [showing, index]);

  const item = structure[index];
  const message = !showing
    ? null
    : item.type === 'break'
      ? t('levelAlert.break', { minutes: item.minutes })
      : t('levelAlert.level', { n: levelNumber(structure, index), blinds: blindsText(item, t) });

  return { message, dismiss: () => setSeenIndex(index) };
}
