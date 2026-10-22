import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from "react-router";
import './Game.css';
import { Maze } from '../../models/Maze.tsx';
import { GameSnapshot, MineHit, WallHit, toMaze } from '../../models/GameSnapshot.tsx';
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
  discoveredMines: MineHit[];
  youWon: boolean | null;
  endedByDisconnect: boolean;
}

// Сколько ждём после конца партии, прежде чем увести обоих игроков в меню -
// столько же, сколько сервер ждёт на CheckOpponentLeft, чтобы результат успели прочитать
const RETURN_TO_MENU_SECONDS = 5;

function Game() {
  const { gameId } = useParams<GameRouteParams>();
  const navigate = useNavigate();
  const [play, setPlay] = useState<PlayState | null>(null);
  // Свой лабиринт нужен и после редактора: по нему ходит противник
  const [myMaze, setMyMaze] = useState<Maze | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftSeconds, setLeftSeconds] = useState<number | null>(null);
  const [endedByLeave, setEndedByLeave] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [opponentNickname, setOpponentNickname] = useState<string | null>(null);
  const [returnSeconds, setReturnSeconds] = useState<number | null>(null);
  const { connection } = useSignalR();
  const isCurrentRef = useRef(true);

  // Состояние берётся с сервера, поэтому перезагрузка страницы возвращает игрока туда же,
  // где он был. Здесь же отсеиваются чужие и несуществующие игры.
  const syncGameState = useCallback(() => {
    if (!connection || !gameId) {
      return;
    }

    connection.invoke<GameSnapshot>('GetGameState', gameId)
      .then(snapshot => {
        if (!isCurrentRef.current) {
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
            discoveredMines: snapshot.discoveredMines,
            youWon: snapshot.youWon,
            endedByDisconnect: snapshot.endedByDisconnect,
          });
        }

        setEndedByLeave(snapshot.endedByDisconnect);
        setOpponentNickname(snapshot.opponentNickname);
        setLeftSeconds(snapshot.opponentLeftSeconds);
        setChatMessages(snapshot.chatMessages);
        setLoading(false);

        // Партия уже закончилась (в том числе если игрок перезагрузил страницу после конца) -
        // обратный отсчёт до меню запускаем и в этом случае, а не только по событию GameOver
        if (snapshot.youWon !== null || snapshot.endedByDisconnect) {
          setReturnSeconds(seconds => seconds ?? RETURN_TO_MENU_SECONDS);
        }
      })
      .catch(e => {
        if (!isCurrentRef.current) {
          return;
        }

        setError(hubErrorMessage(e));
        setLoading(false);
      });
  }, [connection, gameId]);

  useEffect(() => {
    if (!connection) {
      return;
    }

    isCurrentRef.current = true;
    syncGameState();

    // Один физический обработчик onreconnected живёт всё время соединения (SignalR не даёт
    // его снять), поэтому конкретный экран игры только подставляет себя в этот слот
    connection.onGameReconnected = syncGameState;

    return () => {
      isCurrentRef.current = false;

      if (connection.onGameReconnected === syncGameState) {
        connection.onGameReconnected = undefined;
      }
    };
  }, [connection, syncGameState]);

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
        discoveredMines: [],
        youWon: null,
        endedByDisconnect: false,
      });
    };

    const onOpponentLeft = (seconds: number) => setLeftSeconds(seconds);
    const onOpponentReturned = () => setLeftSeconds(null);

    const onGameOver = (_youWon: boolean, byDisconnect: boolean) => {
      setLeftSeconds(null);
      setEndedByLeave(byDisconnect);
      setReturnSeconds(seconds => seconds ?? RETURN_TO_MENU_SECONDS);
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

  // Партия закончилась - через несколько секунд уводим обоих игроков обратно в меню
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

  const handleExit = () => {
    if (connection && gameId) {
      connection.invoke('LeaveGame', gameId).catch(console.error);
    }

    navigate('/');
  };

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

  const exitButton = (
    <button type="button" className="exit-button" onClick={ handleExit }>
      Exit to menu
    </button>
  );

  const opponentLabel = opponentNickname &&
    <p className="opponent-label">Playing against { opponentNickname }</p>;
  const banner = leftSeconds !== null && <OpponentLeft gameId={ gameId } seconds={ leftSeconds } />;
  const returnNotice = returnSeconds !== null &&
    <p className="return-to-menu">Returning to menu in { returnSeconds }s...</p>;
  const chat = <Chat gameId={ gameId } initialMessages={ chatMessages } />;

  if (play && myMaze) {
    return (
      <>
        { exitButton }
        { opponentLabel }
        { banner }
        <MazeBoard
          gameId={ gameId }
          myMaze={ myMaze }
          position={ play.position }
          opponentPosition={ play.opponentPosition }
          yourTurn={ play.yourTurn }
          turnSeconds={ play.turnSeconds }
          discoveredWalls={ play.discoveredWalls }
          discoveredMines={ play.discoveredMines }
          youWon={ play.youWon }
          endedByDisconnect={ play.endedByDisconnect }
        />
        { returnNotice }
        { chat }
      </>
    );
  }

  // Партия оборвалась до начала: рисовать лабиринт уже некуда
  if (endedByLeave) {
    return (
      <div className="game-message">
        { exitButton }
        { opponentLabel }
        <h2>Game over</h2>
        <p>Opponent left the game.</p>
        { returnNotice }
      </div>
    );
  }

  // Лабиринт отправлен, но противник ещё рисует свой
  if (myMaze) {
    return (
      <div className="game-message">
        { exitButton }
        { opponentLabel }
        { banner }
        <h2>Waiting for opponent...</h2>
        <MazeGrid maze={ myMaze } showTreasure />
        { chat }
      </div>
    );
  }

  return (
    <>
      { exitButton }
      { opponentLabel }
      { banner }
      <MazeEditor gameId={ gameId } onSaved={ setMyMaze } />
      { chat }
    </>
  );
}

export default Game;
