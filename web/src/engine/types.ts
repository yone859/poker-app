// ---- トーナメントの設定 ----

export interface BlindLevel {
  type: 'level';
  smallBlind: number;
  bigBlind: number;
  /** BBアンティ（BBの人がまとめて払う。Rule 86） */
  ante: number;
  minutes: number;
}

export interface Break {
  type: 'break';
  minutes: number;
}

export type StructureItem = BlindLevel | Break;

export interface ReentryRule {
  enabled: boolean;
  /** 1人あたりの最大エントリー数（初回を含む）。null は無制限 */
  maxEntries: number | null;
  /** このレベル番号の終わりまでリエントリー可（直後が休憩なら休憩明けまで。Rule 12） */
  lastLevel: number;
}

export interface TournamentConfig {
  startingStack: number;
  structure: StructureItem[];
  /** 場で使う一番小さいチップの額面。端数の分配に使う（Rule 73） */
  minChip: number;
  reentry: ReentryRule;
}

// ---- プレイヤー ----

export interface Player {
  id: string;
  name: string;
  seat: number;
  stack: number;
  entries: number;
  isOut: boolean;
}

export interface Elimination {
  playerId: string;
  handNumber: number;
  /** そのハンド開始時のスタック。同じハンドで脱落した人の順位付けに使う（Rule 126） */
  startingStack: number;
  /** リエントリーしたら true（最終順位には数えない） */
  reentered: boolean;
}

export interface Positions {
  buttonSeat: number;
  /** SBの席。そこに誰もいなければSBは払われない（デッドSB。Rule 85） */
  sbSeat: number;
  bbSeat: number;
}

// ---- 1ハンドの状態 ----

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export interface HandPlayer {
  playerId: string;
  seat: number;
  startingStack: number;
  stack: number;
  /** このストリートで出した額（ブラインドを含む） */
  streetBet: number;
  /** このハンドで出した合計額（アンティは含まない） */
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  /** このストリートで自分の意思でアクションしたか（ブラインドの支払いは含まない） */
  acted: boolean;
  /** 最後にアクションした時点のベット額。レイズの権利の判定に使う（Rule 96） */
  actedAt: number;
}

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** ベットとレイズの両方。to はこのストリートでの合計額 */
  | { type: 'raise'; to: number };

export interface ActionLog {
  seat: number;
  playerId: string;
  street: Street;
  kind: 'sb' | 'bb' | 'ante' | 'fold' | 'check' | 'call' | 'bet' | 'raise';
  /** 動いたチップの額 */
  amount: number;
  /** アクション後の、このストリートでの合計額（「600にレイズ」の600） */
  streetBet: number;
  allIn: boolean;
}

export interface Pot {
  amount: number;
  eligible: string[];
}

export interface Award {
  potIndex: number;
  winners: string[];
  /** playerId → 受け取った額 */
  shares: Record<string, number>;
}

export type HandPhase = 'betting' | 'showdown' | 'complete';

export interface HandState {
  handNumber: number;
  level: BlindLevel;
  minChip: number;
  positions: Positions;
  players: HandPlayer[];
  street: Street;
  phase: HandPhase;
  /** このストリートで今そろえるべき額 */
  currentBet: number;
  /** 最小の上乗せ額（直前のフルレイズの上乗せ額。Rule 96） */
  minRaise: number;
  toActSeat: number | null;
  /** アンティ。メインポットに入るデッドマネー */
  deadMoney: number;
  lastAggressorSeat: number | null;
  actions: ActionLog[];
  pots: Pot[];
  awards: Award[];
  /** ショーダウンで最初に手札を見せる席（Rule 72） */
  showFirstSeat: number | null;
  /** オールインで賭けが終わったとき、まだ開いていないストリート */
  runout: Street[];
}

export interface LegalActions {
  canCheck: boolean;
  canCall: boolean;
  /** コールで実際に出す額（スタックが足りなければオールイン額） */
  callAmount: number;
  canRaise: boolean;
  /** true ならベット、false ならレイズ */
  isBet: boolean;
  minTo: number;
  maxTo: number;
}
