import { useState, useEffect } from 'react';
import { useParams } from "react-router";
import './Game.css';
import { Maze } from '../../models/Maze.tsx';
import { GameSnapshot, WallHit, toMaze } from '../../models/GameSnapshot.tsx';
import { hubErrorMessage } from '../../models/HubError.tsx';
import { useSignalR } from '../../models/SignalRContext.tsx';
import MazeEditor from '../../components/MazeEditor/MazeEditor.tsx';
import MazeBoard from '../../components/MazeBoard/MazeBoard.tsx';
import MazeGrid from '../../components/MazeGrid/MazeGrid.tsx';

interface GameRouteParams extends Record<string, string | undefined> {
  gameId: string;
}

interface PlayState {
  position: number;
  opponentPosition: number;
  yourTurn: boolean;
  turnSeconds: number;
  discoveredWalls: WallHit[];
  youWon: boolean | null;
}

function Game() {
  const { gameId } = useParams<GameRouteParams>();
  const [play, setPlay] = useState<PlayState | null>(null);
  // Свой лабиринт нужен и после редактора: по нему ходит противник
  const [myMaze, setMyMaze] = useState<Maze | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useSignalR();

  // Состояние берётся с сервера, поэтому перезагрузка страницы возвращает игрока туда же,
  // где он был. Здесь же отсеиваются чужие и несуществующие игры.
  useEffect(() => {
    if (!connection || !gameId) {
      return;
    }

    let isCurrent = true;

    connection.invoke<GameSnapshot>('GetGameState', gameId)
      .then(snapshot => {
        if (!isCurrent) {
          return;
        }

        if (snapshot.myMaze) {
          setMyMaze(toMaze(snapshot.myMaze));
        }

        if (snapshot.isStarted) {
          setPlay({
            position: snapshot.myPosition,
            opponentPosition: snapshot.opponentPosition,
            yourTurn: snapshot.yourTurn,
            turnSeconds: snapshot.secondsLeft,
            discoveredWalls: snapshot.discoveredWalls,
            youWon: snapshot.youWon,
          });
        }

        setLoading(false);
      })
      .catch(e => {
        if (isCurrent) {
          setError(hubErrorMessage(e));
          setLoading(false);
        }
      });

    return () => { isCurrent = false; };
  }, [connection, gameId]);

  // Сервер присылает GameStart, когда лабиринты сохранили оба игрока
  useEffect(() => {
    if (!connection) {
      return;
    }

    const onGameStart = (_size: number[], position: number, yourTurn: boolean, turnSeconds: number) => {
      setPlay({
        position,
        opponentPosition: position,
        yourTurn,
        turnSeconds,
        discoveredWalls: [],
        youWon: null,
      });
    };

    connection.on('GameStart', onGameStart);

    return () => connection.off('GameStart', onGameStart);
  }, [connection]);

  if (!gameId) {
    return null;
  }

  if (error) {
    return (
      <div className="game-message">
        <h2>{ error }</h2>
        <p>This game does not exist or you are not one of its players.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="game-message"><p>Loading...</p></div>;
  }

  if (play && myMaze) {
    return (
      <MazeBoard
        gameId={ gameId }
        myMaze={ myMaze }
        position={ play.position }
        opponentPosition={ play.opponentPosition }
        yourTurn={ play.yourTurn }
        turnSeconds={ play.turnSeconds }
        discoveredWalls={ play.discoveredWalls }
        youWon={ play.youWon }
      />
    );
  }

  // Лабиринт отправлен, но противник ещё рисует свой
  if (myMaze) {
    return (
      <div className="game-message">
        <h2>Waiting for opponent...</h2>
        <MazeGrid maze={ myMaze } showTreasure />
      </div>
    );
  }

  return <MazeEditor gameId={ gameId } onSaved={ setMyMaze } />;
}

export default Game;
