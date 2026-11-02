import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ActionLog, HandState, Player, Street } from '@holdem/shared/engine';
import { blindsText, chips, potLabel } from '@holdem/shared/state/format';
import { Sheet, T } from './kit';
import { colors } from './theme';

interface Props {
  hands: HandState[];
  players: Player[];
  onClose: () => void;
}

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

function describe(a: ActionLog, t: TFunction): string {
  const allIn = a.allIn ? t('history.allInSuffix') : '';
  switch (a.kind) {
    // コールは追加で出した額（calls 200）、ベット・レイズはそのストリートの合計額（raises to 400）。
    // ハンドヒストリーの一般的な書き方に合わせている
    case 'sb':
    case 'bb':
    case 'ante':
    case 'call':
      return t(`history.${a.kind}`, { amount: chips(a.amount) }) + allIn;
    case 'fold':
    case 'check':
      return t(`history.${a.kind}`);
    case 'bet':
    case 'raise':
      return t(`history.${a.kind}`, { amount: chips(a.streetBet) }) + allIn;
  }
}

export function HistoryModal({ hands, players, onClose }: Props) {
  const { t } = useTranslation();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const newestFirst = [...hands].reverse();
  const [openHand, setOpenHand] = useState<number | null>(newestFirst[0]?.handNumber ?? null);

  return (
    <Sheet title={t('history.title')} onClose={onClose} testID="history-sheet">
      {newestFirst.length === 0 && <T variant="mutedSmall">{t('history.empty')}</T>}
      {newestFirst.map((hand) => {
        const open = openHand === hand.handNumber;
        const winners = hand.awards.flatMap((a) => Object.keys(a.shares));
        return (
          <View key={hand.handNumber} style={{ gap: 4 }}>
            <Pressable
              style={styles.head}
              onPress={() => setOpenHand(open ? null : hand.handNumber)}
              role="button"
              testID={`history-hand-${hand.handNumber}`}
            >
              <T>
                {open ? '▼' : '▶'} {t('table.handNo', { n: hand.handNumber })}
              </T>
              <T variant="mutedSmall">{blindsText(hand.level, t)}</T>
              <T style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
                {hand.phase === 'complete'
                  ? [...new Set(winners)].map(nameOf).join(t('common.dot'))
                  : t('history.inProgress')}
              </T>
            </Pressable>

            {open && (
              <View style={styles.body}>
                {STREETS.map((street) => {
                  const actions = hand.actions.filter((a) => a.street === street);
                  if (actions.length === 0) return null;
                  return (
                    <View key={street}>
                      <T style={styles.street}>{t(`streets.${street}`)}</T>
                      {actions.map((a, i) => (
                        <View key={i} style={styles.line} testID="history-line">
                          <T variant="small" style={{ fontSize: 14 }}>{nameOf(a.playerId)}</T>
                          <T variant="small" style={{ fontSize: 14 }}>{describe(a, t)}</T>
                        </View>
                      ))}
                    </View>
                  );
                })}
                {hand.awards.map((award) => (
                  <T key={award.potIndex} variant="small" style={{ color: colors.ok, marginTop: 6, fontSize: 14 }} testID="history-award">
                    {potLabel(award.potIndex, hand.awards.length, t)}
                    {t('history.awardSeparator')}
                    {Object.entries(award.shares)
                      .map(([id, amount]) => `${nameOf(id)} +${chips(amount)}`)
                      .join(t('common.listSeparator'))}
                  </T>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  body: { paddingHorizontal: 8, paddingBottom: 8 },
  street: { marginTop: 6, fontWeight: '700', color: colors.accent },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 2 },
});
