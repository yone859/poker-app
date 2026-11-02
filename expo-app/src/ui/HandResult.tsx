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

export function HandResult({ hand, players, dispatch }: Props) {
  const { t } = useTranslation();
  const nameOf = (id: string) => players.find((p) => p.id === id)!.name;
  const busted = hand.players.filter((p) => p.stack === 0);

  return (
    <Card testID="result-panel">
      <T style={{ fontWeight: '700' }} testID="result-title">
        {t('result.title', { n: hand.handNumber })}
      </T>
      {hand.awards.map((award) => (
        <T key={award.potIndex} testID="award">
          <T variant="muted">{potLabel(award.potIndex, hand.awards.length, t)}</T>{' '}
          {Object.entries(award.shares)
            .map(([id, amount]) => `${nameOf(id)} +${chips(amount)}`)
            .join(t('common.listSeparator'))}
        </T>
      ))}
      <View style={{ gap: 4 }}>
        {hand.players.map((p) => {
          const delta = p.stack - p.startingStack;
          const color = delta > 0 ? colors.ok : delta < 0 ? colors.danger : colors.text;
          return (
            <Row key={p.playerId} style={{ justifyContent: 'space-between', minHeight: 36 }} >
              <T style={{ color }} testID="delta-name">{nameOf(p.playerId)}</T>
              <T style={{ color }} testID="delta-value">
                {delta > 0 ? '+' : ''}
                {chips(delta)} → {chips(p.stack)}
              </T>
            </Row>
          );
        })}
      </View>
      {busted.length > 0 && (
        <Notice testID="eliminated">
          {t('result.eliminated', {
            names: busted.map((p) => nameOf(p.playerId)).join(t('common.listSeparator')),
          })}
        </Notice>
      )}
      <Btn variant="primary" onPress={() => dispatch({ type: 'finishHand' })} testID="next">
        {t('result.next')}
      </Btn>
    </Card>
  );
}
