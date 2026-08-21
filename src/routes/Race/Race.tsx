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

  const handleExit = () => navigate('/');

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
      <RaceBoard
        gameId={ gameId }
        sizeX={ snapshot.sizeX }
        sizeY={ snapshot.sizeY }
        initialPlayers={ snapshot.players }
        myUserId={ myUserId }
      />
    </>
  );
}

export default Race;
