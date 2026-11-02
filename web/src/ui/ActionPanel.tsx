import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { currentPlayer, legalActions, totalPot, type HandState, type Player } from '@holdem/shared/engine';
import { chips } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';

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
  const { t } = useTranslation();
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
    { label: t('action.quickMin'), to: legal.minTo },
    { label: t('action.quickHalfPot'), to: clamp(roundChip(currentBet + potAfterCall / 2)) },
    { label: t('action.quickPot'), to: clamp(roundChip(currentBet + potAfterCall)) },
    { label: t('action.quickAllIn'), to: legal.maxTo },
  ];

  const isAllIn = amount === legal.maxTo;
  const valid = amount === legal.maxTo || (amount >= legal.minTo && amount <= legal.maxTo);
  const raiseLabel = isAllIn
    ? t('action.allIn', { amount: chips(amount) })
    : legal.isBet
      ? t('action.bet', { amount: chips(amount) })
      : t('action.raise', { amount: chips(amount) });

  return (
    <div className="panel action-panel">
      <div className="panel-title">
        <span>
          <Trans i18nKey="action.toAct" values={{ name }} components={{ b: <strong /> }} />
        </span>
        <span className="muted">
          {toCall > 0
            ? t('action.facingBet', { toCall: chips(legal.callAmount), stack: chips(hp.stack) })
            : t('action.noBet', { stack: chips(hp.stack) })}
        </span>
      </div>

      <div className="row gap">
        <button className="act fold" onClick={() => dispatch({ type: 'act', action: { type: 'fold' } })}>
          {t('action.fold')}
        </button>
        {legal.canCheck ? (
          <button className="act check" onClick={() => dispatch({ type: 'act', action: { type: 'check' } })}>
            {t('action.check')}
          </button>
        ) : (
          <button className="act call" onClick={() => dispatch({ type: 'act', action: { type: 'call' } })}>
            {legal.callAmount === hp.stack
              ? t('action.callAllIn', { amount: chips(legal.callAmount) })
              : t('action.call', { amount: chips(legal.callAmount) })}
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
            <button className="icon" aria-label={t('action.decrease')} onClick={() => setAmount(clamp(amount - hand.level.bigBlind))}>
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
            <button className="icon" aria-label={t('action.increase')} onClick={() => setAmount(clamp(amount + hand.level.bigBlind))}>
              +
            </button>
          </div>
          <div className="row gap">
            <input
              className="number-field amount"
              type="number"
              inputMode="numeric"
              aria-label={t('action.amount')}
              value={amount}
              step={minChip}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button
              className="act raise"
              disabled={!valid}
              onClick={() => dispatch({ type: 'act', action: { type: 'raise', to: amount } })}
            >
              {raiseLabel}
            </button>
          </div>
          {!valid && (
            <p className="hint warn">
              {t('action.range', { min: chips(legal.minTo), max: chips(legal.maxTo) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
