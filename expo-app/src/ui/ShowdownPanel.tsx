import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { HandState, Player } from '@holdem/shared/engine';
import { chips, potLabel } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';
import { Btn, Card, Notice, Row, T } from './kit';
import { colors } from './theme';

interface Props {
  hand: HandState;
  players: Player[];
  dispatch: (action: GameAction) => void;
}

/** オールインの後に開くのは、フロップ・ターン・リバーのどこからか */
type RunoutFrom = 'flop' | 'turn' | 'river';

export function ShowdownPanel({ hand, players, dispatch }: Props) {
  const { t } = useTranslation();
  const nameOf = (id: string) => players.find((p) => p.id === id)!.name;
  const [winners, setWinners] = useState<string[][]>(() => hand.pots.map(() => []));
  const showFirst = hand.players.find((p) => p.seat === hand.showFirstSeat);

  function toggle(potIndex: number, playerId: string) {
    const selected = winners[potIndex];
    const updated = selected.includes(playerId)
      ? selected.filter((id) => id !== playerId)
      : [...selected, playerId];
    setWinners(
      winners.map((w, i) => {
        if (i === potIndex) return updated;
        // 後ろのサイドポットがまだ空なら、同じ人を先に選んでおく（一番強い手はそのまま他のポットも取ることが多い）
        if (i > potIndex && w.length === 0) {
          return updated.filter((id) => hand.pots[i].eligible.includes(id));
        }
        return w;
      }),
    );
  }

  const ready = hand.pots.every((pot, i) => pot.eligible.length === 1 || winners[i].length > 0);

  return (
    <Card testID="showdown-panel">
      <T style={{ fontWeight: '700' }}>{t('showdown.title')}</T>
      {hand.runout.length > 0 && (
        <Notice testID="showdown-notice">{t(`showdown.runout.${hand.runout[0] as RunoutFrom}`)}</Notice>
      )}
      {showFirst && hand.runout.length === 0 && (
        <Notice testID="showdown-notice">{t('showdown.showFirst', { name: nameOf(showFirst.playerId) })}</Notice>
      )}

      {hand.pots.map((pot, i) => (
        <View key={i} style={{ gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <T testID="pot-title">
            {potLabel(i, hand.pots.length, t)} <T style={{ fontWeight: '700' }}>{chips(pot.amount)}</T>
          </T>
          {pot.eligible.length === 1 ? (
            <T variant="muted">{t('showdown.uncontested', { name: nameOf(pot.eligible[0]) })}</T>
          ) : (
            <Row wrap>
              {pot.eligible.map((id) => (
                <Btn
                  key={id}
                  variant="primary"
                  selected={winners[i].includes(id)}
                  style={[{ flexGrow: 1, flexBasis: '40%' }, !winners[i].includes(id) && { backgroundColor: colors.surface2, borderColor: colors.border }]}
                  textStyle={!winners[i].includes(id) && { color: colors.text, fontWeight: '400' }}
                  onPress={() => toggle(i, id)}
                  testID={`winner-${i}-${id}`}
                >
                  {nameOf(id)}
                </Btn>
              ))}
            </Row>
          )}
          {winners[i].length > 1 && <T variant="mutedSmall">{t('showdown.split', { count: winners[i].length })}</T>}
        </View>
      ))}

      <Btn variant="primary" disabled={!ready} onPress={() => dispatch({ type: 'showdown', winners })} testID="confirm-winners">
        {t('showdown.confirm')}
      </Btn>
    </Card>
  );
}
