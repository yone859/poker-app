/**
 * ルール上できない操作のエラー。
 * エンジンは言語に依存しないよう文章を持たず、種類（code）と数値（params）だけを返す。
 * 画面側で code を翻訳キー（errors.<code>）として表示する。
 */
export type RuleErrorCode =
  | 'noBigBlind'
  | 'noActor'
  | 'cannotCheck'
  | 'nothingToCall'
  | 'cannotRaise'
  | 'exceedsStack'
  | 'belowMinimum'
  | 'notShowdown'
  | 'potNeedsWinner'
  | 'winnerNotEligible'
  | 'playerCount'
  | 'handNotFinished'
  | 'notEnoughPlayers'
  | 'noHand'
  | 'handNotComplete'
  | 'cannotReenter'
  | 'cannotAddDuringHand'
  | 'registrationClosed'
  | 'seatUnavailable'
  | 'noTournament';

export type ErrorParams = Record<string, number>;

export class RuleError extends Error {
  readonly code: RuleErrorCode;
  readonly params: ErrorParams;

  constructor(code: RuleErrorCode, params: ErrorParams = {}) {
    super(code);
    this.code = code;
    this.params = params;
  }
}
