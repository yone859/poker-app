import { useEffect, useRef, useState } from 'react';
import { levelNumber, type StructureItem } from '../engine';
import { playLevelUpSound, vibrate } from '../platform/web';
import { blindsText } from '../state/format';

const SHOW_MS = 15_000;

/** レベルが上がったら音と振動で知らせ、しばらくバナーを出す */
export function useLevelAlert(index: number, structure: StructureItem[], soundOn: boolean) {
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
      ? `休憩です（${item.minutes}分）`
      : `Level ${levelNumber(structure, index)} になりました：${blindsText(item)}（次のハンドから）`;

  return { message, dismiss: () => setSeenIndex(index) };
}
