// 状態はJSONで表せる値だけで作るので、この方法で深いコピーができる（React Nativeでも動く）
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
