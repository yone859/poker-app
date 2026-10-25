import { useState } from 'react';
import { currentPlayer, legalActions, totalPot, type HandState, type Player } from '../engine';
import { chips } from '../state/format';
import type { GameAction } from '../state/gameReducer';

interface Props {
  hand: HandState;
  players: Player[];
  dispatch: (action: GameAction) => void;
}

/**
 * 手番の人のアクション入力。手番が変わるたびに作り直す（親で key を変える）ので、
 * 金額の初期値はいつもミニマムベット／レイズになる。
 */
export function ActionPanel({ hand, players, dispatch }: Props) {
  const legal = legalActions(hand)!;
  const hp = currentPlayer(hand)!;
  const name = players.find((p) => p.id === hp.playerId)!.name;
  const [amount, setAmount] = useState(legal.minTo);

  const { minChip, currentBet } = hand;
  const toCall = currentBet - hp.streetBet;
  const clamp = (v: number) => Math.min(Math.max(v, legal.minTo), legal.maxTo);
  const roundChip = (v: number) => Math.round(v / minChip) * minChip;

  // ポットサイズのレイズ ＝ コールした後のポットの額だけ上乗せ
  const potAfterCall = totalPot(hand) + toCall;
  const quick = [
    { label: 'Min', to: legal.minTo },
    { label: '½ポット', to: clamp(roundChip(currentBet + potAfterCall / 2)) },
    { label: 'ポット', to: clamp(roundChip(currentBet + potAfterCall)) },
    { label: 'オールイン', to: legal.maxTo },
  ];

  const isAllIn = amount === legal.maxTo;
  const valid = amount === legal.maxTo || (amount >= legal.minTo && amount <= legal.maxTo);
  const verb = legal.isBet ? 'ベット' : 'レイズ';

  return (
    <div className="panel action-panel">
      <div className="panel-title">
        <strong>{name}</strong> の番
        <span className="muted">
          {toCall > 0 ? ` コール ${chips(legal.callAmount)}` : ' 賭けなし'}・残り {chips(hp.stack)}
        </span>
      </div>

      <div className="row gap">
        <button className="act fold" onClick={() => dispatch({ type: 'act', action: { type: 'fold' } })}>
          フォールド
        </button>
        {legal.canCheck ? (
          <button className="act check" onClick={() => dispatch({ type: 'act', action: { type: 'check' } })}>
            チェック
          </button>
        ) : (
          <button className="act call" onClick={() => dispatch({ type: 'act', action: { type: 'call' } })}>
            {legal.callAmount === hp.stack ? 'オールイン' : 'コール'} {chips(legal.callAmount)}
          </button>
        )}
      </div>

      {legal.canRaise && (
        <div className="raise-box">
          <div className="row gap quick">
            {quick.map((q) => (
              <button key={q.label} className={amount === q.to ? 'selected' : ''} onClick={() => setAmount(q.to)}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="row gap">
            <button className="icon" aria-label="減らす" onClick={() => setAmount(clamp(amount - hand.level.bigBlind))}>
              −
            </button>
            <input
              className="slider"
              type="range"
              min={legal.minTo}
              max={legal.maxTo}
              step={minChip}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button className="icon" aria-label="増やす" onClick={() => setAmount(clamp(amount + hand.level.bigBlind))}>
              ＋
            </button>
          </div>
          <div className="row gap">
            <input
              className="number-field amount"
              type="number"
              inputMode="numeric"
              aria-label="金額"
              value={amount}
              step={minChip}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button
              className="act raise"
              disabled={!valid}
              onClick={() => dispatch({ type: 'act', action: { type: 'raise', to: amount } })}
            >
              {isAllIn ? `オールイン ${chips(amount)}` : `${verb} ${chips(amount)}`}
            </button>
          </div>
          {!valid && (
            <p className="hint warn">
              {chips(legal.minTo)}〜{chips(legal.maxTo)}の範囲で入力してください
            </p>
          )}
        </div>
      )}
    </div>
  );
}
