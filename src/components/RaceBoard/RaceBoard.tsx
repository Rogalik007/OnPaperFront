import { useState, useEffect } from 'react';
import '../MazeBoard/MazeBoard.css';
import { RacePlayerPosition } from '../../models/Race.tsx';
import { useSignalR } from '../../models/SignalRContext.tsx';
import { Directions } from '../../enums/Directions.tsx';
import RaceGrid, { PLAYER_COLORS } from '../RaceGrid/RaceGrid.tsx';

interface RaceBoardProps {
  gameId: string;
  sizeX: number;
  sizeY: number;
  initialPlayers: RacePlayerPosition[];
  myUserId: string | null;
}

const KEY_DIRECTIONS: Record<string, Directions> = {
  ArrowUp: Directions.UP,
  ArrowRight: Directions.RIGHT,
  ArrowDown: Directions.DOWN,
  ArrowLeft: Directions.LEFT,
};

// Лабиринт пока без стенок и без цели - сервер только держит игроков в границах поля
// и рассылает всем их позиции, поэтому ход отправляется без ожидания своей очереди.
export default function RaceBoard({ gameId, sizeX, sizeY, initialPlayers, myUserId }: RaceBoardProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const { connection } = useSignalR();

  useEffect(() => {
    if (!connection) {
      return;
    }

    const onPlayerMoved = (userId: string, position: number) => {
      setPlayers(prev => prev.map(p => (p.userId === userId ? { ...p, position } : p)));
    };

    connection.on('PlayerMoved', onPlayerMoved);

    return () => connection.off('PlayerMoved', onPlayerMoved);
  }, [connection]);

  const move = (direction: Directions) => {
    if (!connection) {
      return;
    }

    connection.invoke('RaceMove', gameId, direction).catch(console.error);
  };

  useEffect(() => {
    if (!connection) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[e.key];

      if (direction === undefined) {
        return;
      }

      const target = e.target as HTMLElement | null;

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      e.preventDefault();
      move(direction);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connection, gameId]);

  return (
    <div className="board-layout">
      <p className="status">Maze Race - { players.length } players</p>
      <RaceGrid sizeX={ sizeX } sizeY={ sizeY } players={ players } myUserId={ myUserId } />
      <ul className="race-legend">
        { players.map((player, index) => (
          <li key={ player.userId } className={ player.userId === myUserId ? 'race-legend-me' : '' }>
            <span className="race-legend-dot" style={ { background: PLAYER_COLORS[index % PLAYER_COLORS.length] } } />
            { player.userId === myUserId ? 'You' : player.nickname }
          </li>
        )) }
      </ul>
      <div className="controls">
        <button
          type="button"
          className="control control-up"
          aria-label="Move up"
          disabled={ !connection }
          onClick={ () => move(Directions.UP) }
        >
          ↑
        </button>
        <button
          type="button"
          className="control control-left"
          aria-label="Move left"
          disabled={ !connection }
          onClick={ () => move(Directions.LEFT) }
        >
          ←
        </button>
        <button
          type="button"
          className="control control-down"
          aria-label="Move down"
          disabled={ !connection }
          onClick={ () => move(Directions.DOWN) }
        >
          ↓
        </button>
        <button
          type="button"
          className="control control-right"
          aria-label="Move right"
          disabled={ !connection }
          onClick={ () => move(Directions.RIGHT) }
        >
          →
        </button>
      </div>
    </div>
  );
}
