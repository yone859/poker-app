import { useEffect, useState } from 'react';

/** 一定間隔で現在時刻を返すフック。タイマー表示の更新に使う */
export function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
