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
import OpponentLeft from '../../components/OpponentLeft/OpponentLeft.tsx';
import Chat from '../../components/Chat/Chat.tsx';
import { ChatMessage } from '../../models/Chat.tsx';

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
  endedByDisconnect: boolean;
}

function Game() {
  const { gameId } = useParams<GameRouteParams>();
  const [play, setPlay] = useState<PlayState | null>(null);
  // Свой лабиринт нужен и после редактора: по нему ходит противник
  const [myMaze, setMyMaze] = useState<Maze | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftSeconds, setLeftSeconds] = useState<number | null>(null);
  const [endedByLeave, setEndedByLeave] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
            endedByDisconnect: snapshot.endedByDisconnect,
          });
        }

        setEndedByLeave(snapshot.endedByDisconnect);
        setLeftSeconds(snapshot.opponentLeftSeconds);
        setChatMessages(snapshot.chatMessages);
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

  useEffect(() => {
    if (!connection) {
      return;
    }

    // Сервер присылает GameStart, когда лабиринты сохранили оба игрока
    const onGameStart = (_size: number[], position: number, yourTurn: boolean, turnSeconds: number) => {
      setPlay({
        position,
        opponentPosition: position,
        yourTurn,
        turnSeconds,
        discoveredWalls: [],
        youWon: null,
        endedByDisconnect: false,
      });
    };

    const onOpponentLeft = (seconds: number) => setLeftSeconds(seconds);
    const onOpponentReturned = () => setLeftSeconds(null);

    const onGameOver = (_youWon: boolean, byDisconnect: boolean) => {
      setLeftSeconds(null);
      setEndedByLeave(byDisconnect);
    };

    connection.on('GameStart', onGameStart);
    connection.on('OpponentLeft', onOpponentLeft);
    connection.on('OpponentReturned', onOpponentReturned);
    connection.on('GameOver', onGameOver);

    return () => {
      connection.off('GameStart', onGameStart);
      connection.off('OpponentLeft', onOpponentLeft);
      connection.off('OpponentReturned', onOpponentReturned);
      connection.off('GameOver', onGameOver);
    };
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

  const banner = leftSeconds !== null && <OpponentLeft gameId={ gameId } seconds={ leftSeconds } />;
  const chat = <Chat gameId={ gameId } initialMessages={ chatMessages } />;

  if (play && myMaze) {
    return (
      <>
        { banner }
        <MazeBoard
          gameId={ gameId }
          myMaze={ myMaze }
          position={ play.position }
          opponentPosition={ play.opponentPosition }
          yourTurn={ play.yourTurn }
          turnSeconds={ play.turnSeconds }
          discoveredWalls={ play.discoveredWalls }
          youWon={ play.youWon }
          endedByDisconnect={ play.endedByDisconnect }
        />
        { chat }
      </>
    );
  }

  // Партия оборвалась до начала: рисовать лабиринт уже некуда
  if (endedByLeave) {
    return (
      <div className="game-message">
        <h2>Game over</h2>
        <p>Opponent left the game.</p>
      </div>
    );
  }

  // Лабиринт отправлен, но противник ещё рисует свой
  if (myMaze) {
    return (
      <div className="game-message">
        { banner }
        <h2>Waiting for opponent...</h2>
        <MazeGrid maze={ myMaze } showTreasure />
        { chat }
      </div>
    );
  }

  return (
    <>
      { banner }
      <MazeEditor gameId={ gameId } onSaved={ setMyMaze } />
      { chat }
    </>
  );
}

export default Game;
