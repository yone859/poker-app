// shared はブラウザとスマホ（React Native）の両方で動くので、型チェックでは DOM（document・window など）を読み込まない。
// 両方の環境にあるタイマーだけをここで宣言して使えるようにする。
declare function setInterval(handler: () => void, timeout?: number): number;
declare function clearInterval(id: number | undefined): void;
