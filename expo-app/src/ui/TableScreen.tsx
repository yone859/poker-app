import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { activePlayers, syncClock, type TournamentState } from '@holdem/shared/engine';
import type { GameAction } from '@holdem/shared/state/gameReducer';
import { useKeepAwake } from '../platform';
import { ActionPanel } from './ActionPanel';
import { ClockBar } from './ClockBar';
import { HandResult } from './HandResult';
import { HistoryModal } from './HistoryModal';
import { Btn, Card, Notice, Row, Screen } from './kit';
import { PlayersModal } from './PlayersModal';
import { ShowdownPanel } from './ShowdownPanel';
import { TableView } from './TableView';
import { useLevelAlert } from './useLevelAlert';

interface Props {
  tournament: TournamentState;
  now: number;
  canUndo: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
  onHome: () => void;
  dispatch: (action: GameAction) => void;
}

export function TableScreen({
  tournament,
  now,
  canUndo,
  soundOn,
  onToggleSound,
  onToggleLanguage,
  onHome,
  dispatch,
}: Props) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<'players' | 'history' | null>(null);
  const hand = tournament.hand;
  const { structure } = tournament.config;
  const clockIndex = syncClock(tournament.clock, structure, now).index;
  const onBreak = structure[clockIndex].type === 'break';
  const levelAlert = useLevelAlert(clockIndex, structure, soundOn);
  useKeepAwake();

  // 手番が変わるたびに ActionPanel を作り直すための key
  const turnKey = hand ? `${hand.handNumber}-${hand.actions.length}` : '';

  return (
    <Screen testID="table-screen">
      <ClockBar
        tournament={tournament}
        now={now}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onToggleLanguage={onToggleLanguage}
        dispatch={dispatch}
      />
      {levelAlert.message && (
        <Btn variant="primary" onPress={levelAlert.dismiss} style={{ minHeight: 48 }} testID="level-alert">
          {levelAlert.message}
        </Btn>
      )}
      <TableView tournament={tournament} />

      <View style={{ gap: 8 }}>
        {!hand && (
          <Card>
            {onBreak && <Notice>{t('table.onBreak')}</Notice>}
            {activePlayers(tournament).length < 2 && <Notice>{t('table.oneLeft')}</Notice>}
            <Btn
              variant="primary"
              big
              disabled={activePlayers(tournament).length < 2}
              onPress={() => dispatch({ type: 'startHand', now: Date.now() })}
              testID="deal"
            >
              {t('table.startHand', { n: tournament.handNumber + 1 })}
            </Btn>
          </Card>
        )}
        {hand?.phase === 'betting' && (
          <ActionPanel key={turnKey} hand={hand} players={tournament.players} dispatch={dispatch} />
        )}
        {hand?.phase === 'showdown' && (
          <ShowdownPanel key={hand.handNumber} hand={hand} players={tournament.players} dispatch={dispatch} />
        )}
        {hand?.phase === 'complete' && (
          <HandResult hand={hand} players={tournament.players} dispatch={dispatch} />
        )}

        <Row>
          <Btn flex disabled={!canUndo} onPress={() => dispatch({ type: 'undo' })} textStyle={{ fontSize: 14 }} testID="tool-undo">
            {t('table.undo')}
          </Btn>
          <Btn flex onPress={() => setModal('history')} textStyle={{ fontSize: 14 }} testID="tool-history">
            {t('table.history')}
          </Btn>
          <Btn flex onPress={() => setModal('players')} textStyle={{ fontSize: 14 }} testID="tool-standings">
            {t('table.standings')}
          </Btn>
          <Btn flex onPress={onHome} textStyle={{ fontSize: 14 }} testID="tool-home">
            {t('table.home')}
          </Btn>
        </Row>
      </View>

      {modal === 'players' && (
        <PlayersModal tournament={tournament} now={now} dispatch={dispatch} onClose={() => setModal(null)} />
      )}
      {modal === 'history' && (
        <HistoryModal
          hands={hand ? [...tournament.history, hand] : tournament.history}
          players={tournament.players}
          onClose={() => setModal(null)}
        />
      )}
    </Screen>
  );
}
