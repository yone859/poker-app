import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  canReenter,
  registrationOpen,
  standings,
  TABLE_SIZE,
  type TournamentState,
} from '@holdem/shared/engine';
import { chips } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';
import { Btn, Row, Segmented, Sheet, T, TextField } from './kit';
import { colors } from './theme';

interface Props {
  tournament: TournamentState;
  now: number;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
}

export function PlayersModal({ tournament, now, dispatch, onClose }: Props) {
  const { t } = useTranslation();
  const freeSeats = Array.from({ length: TABLE_SIZE }, (_, i) => i).filter(
    (s) => !tournament.players.some((p) => p.seat === s),
  );
  const [newName, setNewName] = useState('');
  const [newSeat, setNewSeat] = useState(freeSeats[0] ?? -1);
  const open = registrationOpen(tournament, now);
  const rows = standings(tournament);
  const nameTaken = tournament.players.some((p) => p.name === newName.trim());

  return (
    <Sheet title={t('players.title')} onClose={onClose} testID="players-sheet">
      {rows.map((s) => {
        const p = tournament.players.find((x) => x.id === s.playerId)!;
        return (
          <Row key={s.playerId} style={{ minHeight: 36 }} >
            <T style={{ minWidth: 32, fontWeight: '700', color: colors.accent }}>{s.place}</T>
            <T style={[{ flex: 1 }, p.isOut && { color: colors.muted }]} testID="standing-name">
              {p.name}
              <T variant="mutedSmall" testID="standing-meta">
                {' '}
                {t('common.seatN', { n: p.seat + 1 })}
                {p.entries > 1 && `${t('common.dot')}${t('players.entries', { count: p.entries })}`}
              </T>
            </T>
            {p.isOut ? (
              canReenter(tournament, p.id, now) ? (
                <Btn onPress={() => dispatch({ type: 'reenter', playerId: p.id, now: Date.now() })} testID={`reenter-${p.id}`}>
                  {t('players.reenter')}
                </Btn>
              ) : (
                <T variant="mutedSmall">{t('players.eliminatedIn', { n: s.eliminatedInHand })}</T>
              )
            ) : (
              <T testID="standing-stack">{chips(s.stack)}</T>
            )}
          </Row>
        );
      })}
      {tournament.hand && <T variant="mutedSmall">{t('players.reenterBetweenHands')}</T>}

      {open && freeSeats.length > 0 && (
        <View style={{ gap: 8, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <T style={{ fontWeight: '700' }}>{t('players.lateRegistration')}</T>
          <Row>
            <TextField
              value={newName}
              onChange={setNewName}
              placeholder={t('players.namePlaceholder')}
              testID="late-name"
            />
            <Btn
              disabled={!newName.trim() || nameTaken || !!tournament.hand}
              onPress={() => {
                dispatch({ type: 'addPlayer', name: newName.trim(), seat: newSeat, now: Date.now() });
                setNewName('');
                setNewSeat(freeSeats.find((s) => s !== newSeat) ?? -1);
              }}
              testID="late-add"
            >
              {t('players.add')}
            </Btn>
          </Row>
          <Segmented
            wrap
            value={newSeat}
            options={freeSeats.map((s) => ({ value: s, label: t('common.seatN', { n: s + 1 }) }))}
            onChange={setNewSeat}
            testID="late-seat"
          />
          {nameTaken && <T variant="small" style={{ color: colors.warn }}>{t('players.nameTaken')}</T>}
          <T variant="mutedSmall">
            {t('players.lateRegistrationStack', { stack: chips(tournament.config.startingStack) })}
          </T>
        </View>
      )}
    </Sheet>
  );
}
