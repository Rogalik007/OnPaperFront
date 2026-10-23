import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import '../MazeBoard/MazeBoard.css';
import './RaceBoard.css';
import { RaceCell, RacePlayerView, RaceSnapshot, RaceWall, RaceWinReason } from '../../models/Race.tsx';
import { useSignalR } from '../../models/SignalRContext.tsx';
import { hubErrorMessage } from '../../models/HubError.tsx';
import { Directions } from '../../enums/Directions.tsx';
import RaceMap from '../RaceMap/RaceMap.tsx';
import DirectionPad from '../DirectionPad/DirectionPad.tsx';
import { BulletIcon, PlayerIcon } from '../Icons/Icons.tsx';

interface RaceBoardProps {
  gameId: string;
  snapshot: RaceSnapshot;
  myUserId: string | null;
}

type Mode = 'move' | 'shoot';

const KEY_DIRECTIONS: Record<string, Directions> = {
  ArrowUp: Directions.UP,
  ArrowRight: Directions.RIGHT,
  ArrowDown: Directions.DOWN,
  ArrowLeft: Directions.LEFT,
};

const MAX_BULLETS = 3;

// Цвет игрока - по его месту в очереди ходов, одинаковый у всех участников
const PLAYER_COLORS = [
  '#57c7ff', '#ff6ac1', '#5af78e', '#ff9f43', '#c792ea',
  '#f3f99d', '#9aedfe', '#ff5c57', '#b8e986', '#7aa2f7',
];
const MAX_LOG = 6;

// Через сколько после хода вкладка в автоматическом режиме переключается на следующего:
// пауза нужна, чтобы успеть увидеть сам ход на карте того, кто ходил
const AUTO_SWITCH_DELAY_MS = 1000;
const VIEW_MODE_KEY = 'race-view-mode';

type ViewMode = 'auto' | 'manual';

// Выбор режима - удобство конкретного зрителя, поэтому живёт в его браузере
function loadViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'manual' ? 'manual' : 'auto';
  } catch {
    return 'auto';
  }
}

// Столько же, сколько в обычной игре: успеть прочитать итог и вернуться в меню
const RETURN_TO_MENU_SECONDS = 5;

// Гонка по общему лабиринту: ходят по очереди, за ход можно либо шагнуть, либо выстрелить -
// пуля летит по коридору до стены. У каждого игрока своя вкладка с его картой: она нарисована
// от его старта, а он всегда в центре, поэтому где кто на самом деле, не знает никто.
export default function RaceBoard({ gameId, snapshot, myUserId }: RaceBoardProps) {
  const [bullets, setBullets] = useState(snapshot.bullets);
  const [alive, setAlive] = useState(snapshot.alive);
  const [players, setPlayers] = useState<RacePlayerView[]>(snapshot.players);
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [selected, setSelected] = useState(() =>
    (viewMode === 'auto' && snapshot.winner === null ? snapshot.turn : myUserId) ?? snapshot.players[0]?.userId);
  // Насколько сдвинута карта на каждой вкладке - у каждой своё, и сдвиг переживает переключение вкладок
  const [offsets, setOffsets] = useState<Record<string, RaceCell>>({});
  // Вкладки, где карта поменялась, а их ещё не открывали
  const [unseen, setUnseen] = useState<Set<string>>(new Set());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  // Обработчики событий SignalR вешаются один раз, поэтому свежую selectTab берут через ref
  const selectTabRef = useRef<(userId: string) => void>(() => {});
  const [turn, setTurn] = useState(snapshot.turn);
  const [secondsLeft, setSecondsLeft] = useState(snapshot.secondsLeft);
  const [turnNumber, setTurnNumber] = useState(0);
  const [winner, setWinner] = useState(snapshot.winner);
  const [winReason, setWinReason] = useState<RaceWinReason | null>(snapshot.winReason);
  const [mode, setMode] = useState<Mode>('move');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [returnSeconds, setReturnSeconds] = useState<number | null>(
    snapshot.winner !== null ? RETURN_TO_MENU_SECONDS : null);
  const secondsRef = useRef(snapshot.secondsLeft);
  const { connection } = useSignalR();
  const navigate = useNavigate();

  const isOver = winner !== null;
  const myTurn = !isOver && alive && turn === myUserId;
  const nicknameOf = (userId: string | null) =>
    userId === myUserId ? 'You' : players.find(p => p.userId === userId)?.nickname ?? 'Player';
  const addLog = (line: string) => setLog(prev => [line, ...prev].slice(0, MAX_LOG));

  const selectTab = (userId: string) => {
    setSelected(userId);
    setUnseen(prev => {
      if (!prev.has(userId)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  selectTabRef.current = selectTab;

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);

    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // Без localStorage режим просто не запомнится до следующей гонки
    }

    if (mode === 'auto' && !isOver) {
      selectTab(turn);
    }
  };

  // Автоматический режим: вкладка следует за очередью - через секунду после хода открывается
  // карта того, кто ходит теперь. Переключать вручную при этом можно, до следующего хода.
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!connection) {
      return;
    }

    const onTurn = (turnUserId: string, seconds: number) => {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
      }

      if (viewModeRef.current === 'auto') {
        switchTimerRef.current = setTimeout(() => selectTabRef.current(turnUserId), AUTO_SWITCH_DELAY_MS);
      }

      secondsRef.current = seconds;
      setTurn(turnUserId);
      setSecondsLeft(seconds);
      setError(null);
      setBusy(false);
      setTurnNumber(n => n + 1);
    };

    // Ход любого игрока меняет его карту на его вкладке
    const onMoved = (userId: string, x: number, y: number, wall: RaceWall | null) => {
      setPlayers(prev => prev.map(p => {
        if (p.userId !== userId) {
          return p;
        }

        const visited = p.visited.some(c => c.x === x && c.y === y) ? p.visited : [...p.visited, { x, y }];
        const walls = wall === null ? p.walls : [...p.walls, wall];

        return { ...p, x, y, visited, walls };
      }));

      if (userId !== selectedRef.current) {
        setUnseen(prev => new Set(prev).add(userId));
      }
    };

    const onShotResult = (hit: boolean, bulletsLeft: number) => {
      setBullets(bulletsLeft);
      setMode('move');

      if (!hit) {
        addLog('You fired and missed');
      }
    };

    const onEliminated = (victimId: string, victimNickname: string, shooterId: string | null,
      shooterNickname: string | null) => {
      setPlayers(prev => prev.map(p => (p.userId === victimId
        ? { ...p, alive: false, eliminatedBy: shooterNickname, left: shooterId === null }
        : p)));

      if (victimId === myUserId) {
        setAlive(false);
        addLog(shooterId === null ? 'You left the race' : `You were shot by ${ shooterNickname }`);
      } else if (shooterId === null) {
        addLog(`${ victimNickname } left the race`);
      } else {
        addLog(`${ shooterId === myUserId ? 'You' : shooterNickname } shot ${ victimNickname }`);
      }
    };

    const onOver = (winnerId: string, _winnerNickname: string, reason: RaceWinReason) => {
      // Где лежал клад, у каждого на карте своё место - его отдаёт свежий снимок
      connection.invoke<RaceSnapshot>('GetRaceState', gameId)
        .then(result => setPlayers(result.players))
        .catch(console.error);
      setWinner(winnerId);
      setWinReason(reason);
      setBusy(false);
      setReturnSeconds(seconds => seconds ?? RETURN_TO_MENU_SECONDS);
    };

    connection.on('RaceTurn', onTurn);
    connection.on('RaceMoved', onMoved);
    connection.on('RaceShotResult', onShotResult);
    connection.on('PlayerEliminated', onEliminated);
    connection.on('RaceOver', onOver);

    return () => {
      connection.off('RaceTurn', onTurn);
      connection.off('RaceMoved', onMoved);
      connection.off('RaceShotResult', onShotResult);
      connection.off('PlayerEliminated', onEliminated);
      connection.off('RaceOver', onOver);
    };
  }, [connection, gameId, myUserId]);

  const act = (direction: Directions) => {
    if (!connection || isOver || !alive) {
      return;
    }

    if (!myTurn || busy) {
      setError('Not your turn');
      return;
    }

    if (mode === 'shoot' && bullets <= 0) {
      setError('No bullets left');
      return;
    }

    setBusy(true);
    setError(null);

    connection.invoke(mode === 'shoot' ? 'RaceShoot' : 'RaceMove', gameId, direction).catch(e => {
      setError(hubErrorMessage(e));
      setBusy(false);
    });
  };

  // Стрелки - действие в выбранном режиме, пробел - переключить шаг/выстрел
  useEffect(() => {
    if (isOver || !alive) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        setMode(m => (m === 'move' ? 'shoot' : 'move'));
        return;
      }

      const direction = KEY_DIRECTIONS[e.key];

      if (direction !== undefined) {
        e.preventDefault();
        act(direction);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Отсчёт хода. Когда он кончился, любой участник просит сервер передать очередь -
  // сервер сам сверяется с дедлайном. Повторяем раз в секунду, пока ход не перейдёт.
  useEffect(() => {
    if (!connection || isOver) {
      return;
    }

    const timer = setInterval(() => {
      if (secondsRef.current > 0) {
        secondsRef.current -= 1;
        setSecondsLeft(secondsRef.current);
      }

      if (secondsRef.current === 0) {
        connection.invoke('RaceTurnTimeout', gameId).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [connection, gameId, isOver, turnNumber]);

  useEffect(() => {
    if (returnSeconds === null) {
      return;
    }

    if (returnSeconds <= 0) {
      navigate('/');
      return;
    }

    const timer = setTimeout(() => setReturnSeconds(returnSeconds - 1), 1000);

    return () => clearTimeout(timer);
  }, [returnSeconds, navigate]);

  let status: string;

  if (isOver) {
    const how = winReason === 'treasure' ? 'found the treasure' : 'is the last survivor';
    status = winner === myUserId
      ? (winReason === 'treasure' ? 'You found the treasure!' : 'You are the last survivor!')
      : `${ nicknameOf(winner) } ${ how }`;
  } else if (!alive) {
    status = `You are out. ${ nicknameOf(turn) } is moving... (${ secondsLeft }s)`;
  } else {
    status = myTurn ? `Your turn (${ secondsLeft }s)` : `${ nicknameOf(turn) } is moving... (${ secondsLeft }s)`;
  }

  const selectedIndex = Math.max(0, players.findIndex(p => p.userId === selected));
  const selectedView = players[selectedIndex];
  const selectedOffset = offsets[selectedView?.userId] ?? { x: 0, y: 0 };
  const panSelected = (offset: RaceCell) => setOffsets(prev => ({ ...prev, [selectedView.userId]: offset }));
  let caption = '';

  if (selectedView) {
    const name = selectedView.userId === myUserId ? 'Your map' : `${ selectedView.nickname }'s map`;
    const state = selectedView.userId === winner
      ? 'winner'
      : !selectedView.alive
        ? (selectedView.left ? 'left' : `shot by ${ selectedView.eliminatedBy }`)
        : '';
    caption = state ? `${ name } - ${ state }` : name;
  }

  return (
    <div className="board-layout">
      <p className={ myTurn || (isOver && winner === myUserId) ? 'status status-active' : 'status' }>{ status }</p>
      { error && <p className="error">{ error }</p> }
      { !isOver &&
        <div className="race-view-mode">
          <span>Tabs:</span>
          <button
            type="button"
            className={ viewMode === 'auto' ? 'active' : undefined }
            onClick={ () => changeViewMode('auto') }
          >
            Follow turn
          </button>
          <button
            type="button"
            className={ viewMode === 'manual' ? 'active' : undefined }
            onClick={ () => changeViewMode('manual') }
          >
            Manual
          </button>
        </div>
      }
      <div className="race-tabs" role="tablist">
        { players.map((player, index) => (
          <button
            key={ player.userId }
            type="button"
            role="tab"
            aria-selected={ player.userId === selected }
            className={ [
              'race-tab',
              player.userId === selected ? 'race-tab-active' : '',
              !player.alive ? 'race-tab-out' : '',
            ].join(' ') }
            onClick={ () => selectTab(player.userId) }
          >
            <PlayerIcon color={ PLAYER_COLORS[index % PLAYER_COLORS.length] } />
            <span className="race-tab-name">{ player.userId === myUserId ? 'You' : player.nickname }</span>
            { !isOver && player.userId === turn && <span className="race-tab-turn" title="Moving now" /> }
            { unseen.has(player.userId) && <span className="race-tab-new" title="New moves" /> }
          </button>
        )) }
      </div>
      { selectedView &&
        <div className="race-tab-panel" role="tabpanel">
          <p className="race-tab-caption">{ caption }</p>
          { (selectedOffset.x !== 0 || selectedOffset.y !== 0) &&
            <button type="button" className="race-recenter" onClick={ () => panSelected({ x: 0, y: 0 }) }>
              Center
            </button>
          }
          <RaceMap
            view={ selectedView }
            color={ PLAYER_COLORS[selectedIndex % PLAYER_COLORS.length] }
            showTreasure={ isOver }
            offset={ selectedOffset }
            onPan={ panSelected }
          />
        </div>
      }
      { !isOver && alive &&
        <>
          <div className="race-bullets" aria-label={ `Bullets: ${ bullets }` }>
            { Array.from({ length: MAX_BULLETS }, (_, i) => <BulletIcon key={ i } spent={ i >= bullets } />) }
          </div>
          <div className="race-mode">
            <button type="button" className={ mode === 'move' ? 'active' : undefined } onClick={ () => setMode('move') }>
              Move
            </button>
            <button
              type="button"
              className={ mode === 'shoot' ? 'active' : undefined }
              disabled={ bullets <= 0 }
              onClick={ () => setMode('shoot') }
            >
              Shoot
            </button>
          </div>
          <DirectionPad onPress={ act } danger={ mode === 'shoot' } />
          <p className="race-hint">Arrows - { mode === 'shoot' ? 'shoot' : 'move' }, Space - switch move / shoot. Drag the map to look around</p>
        </>
      }
      { returnSeconds !== null && <p className="race-hint">Returning to menu in { returnSeconds }s...</p> }
      { log.length > 0 &&
        <ul className="race-log">
          { log.map((line, i) => <li key={ `${ log.length - i }` }>{ line }</li>) }
        </ul>
      }
    </div>
  );
}
