import { useEffect, useRef, useState } from 'react';
import './MazeBoard.css';
import { Maze } from '../../models/Maze.tsx';
import { useSignalR } from '../../models/SignalRContext.tsx';
import { Directions } from '../../enums/Directions.tsx';
import MazeGrid from '../MazeGrid/MazeGrid.tsx';
import { MineHit, WallHit } from '../../models/GameSnapshot.tsx';
import { hubErrorMessage } from '../../models/HubError.tsx';

interface MazeBoardProps {
  gameId: string;
  myMaze: Maze;
  position: number;
  opponentPosition: number;
  yourTurn: boolean;
  turnSeconds: number;
  discoveredWalls: WallHit[];
  discoveredMines: MineHit[];
  youWon: boolean | null;
  endedByDisconnect: boolean;
}

const KEY_DIRECTIONS: Record<string, Directions> = {
  ArrowUp: Directions.UP,
  ArrowRight: Directions.RIGHT,
  ArrowDown: Directions.DOWN,
  ArrowLeft: Directions.LEFT,
};

export default function MazeBoard(
  { gameId, myMaze, position, opponentPosition, yourTurn, turnSeconds, discoveredWalls, discoveredMines,
    youWon, endedByDisconnect }: MazeBoardProps
) {
  // Чужой лабиринт: известны только те стенки, в которые игрок уже упирался,
  // и мины, на которые он уже наступил
  const [enemyMaze] = useState(() => {
    const maze = new Maze(myMaze.sizeX, myMaze.sizeY);
    discoveredWalls.forEach(wall => maze.addOrRemoveWall(wall.cell, wall.direction, true));
    discoveredMines.forEach(hit => {
      if (hit.isSuper) {
        maze.superMine = hit.cell;
      } else if (!maze.mines.includes(hit.cell)) {
        maze.mines.push(hit.cell);
      }
    });
    return maze;
  });
  const [cell, setCell] = useState(position);
  const [enemyCell, setEnemyCell] = useState(opponentPosition);
  const [myTurn, setMyTurn] = useState(yourTurn);
  const [secondsLeft, setSecondsLeft] = useState(turnSeconds);
  const [win, setWin] = useState<boolean | null>(youWon);
  const [byLeave, setByLeave] = useState(endedByDisconnect);
  const [error, setError] = useState<string | null>(null);
  const [minePenalty, setMinePenalty] = useState<'mine' | 'supermine' | null>(null);
  const [turnNumber, setTurnNumber] = useState(0);
  const { connection } = useSignalR();
  const [, forceUpdate] = useState({});
  const secondsRef = useRef(turnSeconds);

  useEffect(() => {
    if (!connection) {
      return;
    }

    const onMoveResult = (newCell: number, blocked: Directions | null, penalty: 'mine' | 'supermine' | null) => {
      if (blocked !== null) {
        enemyMaze.addOrRemoveWall(newCell, blocked, true);
        forceUpdate({});
      }

      if (penalty === 'mine' && !enemyMaze.mines.includes(newCell)) {
        enemyMaze.mines.push(newCell);
        forceUpdate({});
      } else if (penalty === 'supermine') {
        enemyMaze.superMine = newCell;
        forceUpdate({});
      }

      setMinePenalty(penalty);
      setCell(newCell);
    };

    const onOpponentMoved = (newCell: number) => setEnemyCell(newCell);

    const onTurnChanged = (isMyTurn: boolean, seconds: number) => {
      secondsRef.current = seconds;
      setMyTurn(isMyTurn);
      setSecondsLeft(seconds);
      setError(null);
      setMinePenalty(null);
      // Перезапускает отсчёт, иначе первая секунда нового хода окажется обрезанной
      setTurnNumber(number => number + 1);
    };

    const onGameOver = (isWinner: boolean, byDisconnect: boolean) => {
      setWin(isWinner);
      setByLeave(byDisconnect);
      setMyTurn(false);
    };

    connection.on('MoveResult', onMoveResult);
    connection.on('OpponentMoved', onOpponentMoved);
    connection.on('TurnChanged', onTurnChanged);
    connection.on('GameOver', onGameOver);

    return () => {
      connection.off('MoveResult', onMoveResult);
      connection.off('OpponentMoved', onOpponentMoved);
      connection.off('TurnChanged', onTurnChanged);
      connection.off('GameOver', onGameOver);
    };
  }, [connection, enemyMaze]);

  // Общий обработчик хода: дергается и со стрелок клавиатуры, и с кнопок на экране -
  // на телефоне клавиатуры нет, поэтому кнопки для него единственный способ ходить.
  const move = (direction: Directions) => {
    if (!connection || win !== null) {
      return;
    }

    if (!myTurn) {
      setError('Not your turn');
      return;
    }

    setMyTurn(false);
    setError(null);

    connection.invoke('Move', gameId, direction).catch(e => {
      setError(hubErrorMessage(e));
      setMyTurn(true);
    });
  };

  // Слушатель висит всегда, пока партия идёт: очередь ходов - дело сервера,
  // и клиентское состояние не должно уметь заблокировать управление.
  useEffect(() => {
    if (!connection || win !== null) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[e.key];

      if (direction === undefined) {
        return;
      }

      // Стрелки в чате должны просто двигать курсор по тексту, а не ходить по лабиринту
      const target = e.target as HTMLElement | null;

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      e.preventDefault();
      move(direction);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connection, gameId, myTurn, win]);

  useEffect(() => {
    if (!connection || win !== null) {
      return;
    }

    const timer = setInterval(() => {
      if (secondsRef.current > 0) {
        secondsRef.current -= 1;
        setSecondsLeft(secondsRef.current);
      }

      // Часы клиента и сервера расходятся на доли секунды, поэтому первый запрос может прийти
      // до дедлайна - сервер его отклонит. Повторяем раз в секунду, пока ход не перейдёт.
      if (secondsRef.current === 0) {
        connection.invoke('TurnTimeout', gameId).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [connection, gameId, win, turnNumber]);

  const finished = byLeave
    ? (win ? 'Opponent left the game' : 'You left the game')
    : (win ? 'You found the treasure!' : 'Opponent found the treasure');

  const status = win === null
    ? (myTurn ? `Your turn (${ secondsLeft }s)` : `Opponent is moving... (${ secondsLeft }s)`)
    : finished;

  return (
    <div className="board-layout">
      <p className="status">{ status }</p>
      { minePenalty && win === null &&
        <p className="mine-alert">
          { minePenalty === 'supermine' ? 'Supermine! You lose 2 turns' : 'Mine! You lose a turn' }
        </p>
      }
      { error && <p className="error">{ error }</p> }
      <div className="fields">
        <div className="field">
          <p className="field-title">Opponent's maze - you are here</p>
          <MazeGrid maze={ enemyMaze } player={ cell } />
        </div>
        <div className="field">
          <p className="field-title">Your maze - opponent is here</p>
          <MazeGrid maze={ myMaze } opponent={ enemyCell } showTreasure />
        </div>
      </div>
      { win === null &&
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
      }
    </div>
  );
}
