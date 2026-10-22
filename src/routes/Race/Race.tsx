import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import '../Game/Game.css';
import { RaceSnapshot } from '../../models/Race.tsx';
import { hubErrorMessage } from '../../models/HubError.tsx';
import { useSignalR } from '../../models/SignalRContext.tsx';
import { getUserId } from '../../models/Auth.tsx';
import RaceBoard from '../../components/RaceBoard/RaceBoard.tsx';

interface RaceRouteParams extends Record<string, string | undefined> {
  gameId: string;
}

function Race() {
  const { gameId } = useParams<RaceRouteParams>();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<RaceSnapshot | null>(null);
  // Доска берёт начальное состояние из снимка один раз, поэтому после переподключения
  // её нужно пересоздать со свежим снимком - для этого меняется key
  const [syncNumber, setSyncNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useSignalR();
  const isCurrentRef = useRef(true);
  const myUserId = getUserId();

  // Состояние берётся с сервера, поэтому перезагрузка страницы возвращает игрока туда же
  const syncRaceState = useCallback(() => {
    if (!connection || !gameId) {
      return;
    }

    connection.invoke<RaceSnapshot>('GetRaceState', gameId)
      .then(result => {
        if (!isCurrentRef.current) {
          return;
        }

        setSnapshot(result);
        setSyncNumber(n => n + 1);
        setLoading(false);
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
    syncRaceState();

    connection.onGameReconnected = syncRaceState;

    return () => {
      isCurrentRef.current = false;

      if (connection.onGameReconnected === syncRaceState) {
        connection.onGameReconnected = undefined;
      }
    };
  }, [connection, syncRaceState]);

  // Выход в меню - это выбывание из гонки: о нём сервер сообщит остальным
  const handleExit = () => {
    if (connection && gameId && snapshot) {
      connection.invoke('LeaveRace', gameId).catch(console.error);
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
        <p>This race does not exist or you are not one of its players.</p>
        <button type="button" className="exit-button" onClick={ handleExit }>
          Exit to menu
        </button>
      </div>
    );
  }

  if (loading || !snapshot) {
    return <div className="game-message"><p>Loading...</p></div>;
  }

  return (
    <>
      <button type="button" className="exit-button" onClick={ handleExit }>
        Exit to menu
      </button>
      <RaceBoard key={ syncNumber } gameId={ gameId } snapshot={ snapshot } myUserId={ myUserId } />
    </>
  );
}

export default Race;
