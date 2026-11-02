import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { currentPlayer, legalActions, totalPot, type HandState, type Player } from '@holdem/shared/engine';
import { chips } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';
import { Btn, Card, NumberInput, Row, T } from './kit';
import { colors } from './theme';

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
    <Card testID="action-panel">
      <View>
        <Text style={styles.title} testID="to-act">
          <Trans i18nKey="action.toAct" values={{ name }} components={{ b: <Text style={{ fontWeight: '700' }} /> }} />
        </Text>
        <T variant="muted" testID="to-act-info">
          {toCall > 0
            ? t('action.facingBet', { toCall: chips(legal.callAmount), stack: chips(hp.stack) })
            : t('action.noBet', { stack: chips(hp.stack) })}
        </T>
      </View>

      <Row>
        <Btn variant="fold" flex onPress={() => dispatch({ type: 'act', action: { type: 'fold' } })} testID="act-fold">
          {t('action.fold')}
        </Btn>
        {legal.canCheck ? (
          <Btn variant="call" flex onPress={() => dispatch({ type: 'act', action: { type: 'check' } })} testID="act-check">
            {t('action.check')}
          </Btn>
        ) : (
          <Btn variant="call" flex onPress={() => dispatch({ type: 'act', action: { type: 'call' } })} testID="act-call">
            {legal.callAmount === hp.stack
              ? t('action.callAllIn', { amount: chips(legal.callAmount) })
              : t('action.call', { amount: chips(legal.callAmount) })}
          </Btn>
        )}
      </Row>

      {legal.canRaise && (
        <View style={{ gap: 8, paddingTop: 4 }}>
          <Row>
            {quick.map((q, i) => (
              <Btn
                key={q.label}
                flex
                selected={amount === q.to}
                onPress={() => setAmount(q.to)}
                style={{ paddingHorizontal: 4 }}
                textStyle={{ fontSize: 13 }}
                testID={`quick-${i}`}
              >
                {q.label}
              </Btn>
            ))}
          </Row>
          <Row>
            <Btn variant="icon" label={t('action.decrease')} onPress={() => setAmount(clamp(amount - hand.level.bigBlind))} testID="decrease">
              −
            </Btn>
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={legal.minTo}
              maximumValue={legal.maxTo}
              step={minChip}
              value={amount}
              onValueChange={(v) => setAmount(v)}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accent}
              testID="slider"
            />
            <Btn variant="icon" label={t('action.increase')} onPress={() => setAmount(clamp(amount + hand.level.bigBlind))} testID="increase">
              +
            </Btn>
          </Row>
          <Row>
            <NumberInput
              label={t('action.amount')}
              value={amount}
              onChange={setAmount}
              style={styles.amount}
              testID="amount"
            />
            <Btn variant="raise" flex disabled={!valid} onPress={() => dispatch({ type: 'act', action: { type: 'raise', to: amount } })} testID="act-raise">
              {raiseLabel}
            </Btn>
          </Row>
          {!valid && (
            <T variant="small" style={{ color: colors.warn }}>
              {t('action.range', { min: chips(legal.minTo), max: chips(legal.maxTo) })}
            </T>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 16, lineHeight: 23 },
  amount: { flex: 1, fontSize: 18, fontWeight: '700', minHeight: 52 },
});
