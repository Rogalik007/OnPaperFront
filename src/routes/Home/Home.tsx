import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { API_URL } from '../../../config.js';
import './Home.css';
import Search from '../../components/Search/Search.tsx';
import Leaderboard from '../../components/Leaderboard/Leaderboard.tsx';
import { useSignalR } from '../../models/SignalRContext.tsx';
import { getToken, getUserId } from '../../models/Auth.tsx';

function Home() {
  const [searching, setSearching] = useState<boolean>(false);
  const [racing, setRacing] = useState<boolean>(false);
  const [user, setUser] = useState<string | null>(null);
  const { connection } = useSignalR();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      const id = getUserId();
      const token = getToken();

      if (id) {
        try {
          const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (response.ok) {
            setUser(data.email);
          }
        } catch (error) {
          console.error('Unable to connect to the server. Please try again later.');
        }
      }
    }

    fetchUser();
  }, []);

  // Подписка живёт вместе с соединением, а не вешается заново на каждый клик по Play
  useEffect(() => {
    if (!connection) {
      return;
    }

    const onGameFound = (gameId: string, opponentId: string) => {
      console.log(`Game found! Game ID: ${gameId}, Opponent: ${opponentId}`);
      navigate(`/game/${gameId}`);
    };

    const onRaceFound = (gameId: string) => {
      console.log(`Race found! Game ID: ${gameId}`);
      setRacing(false);
      navigate(`/race/${gameId}`);
    };

    connection.on('GameFound', onGameFound);
    connection.on('RaceFound', onRaceFound);

    return () => {
      connection.off('GameFound', onGameFound);
      connection.off('RaceFound', onRaceFound);
    };
  }, [connection, navigate]);

  const handleSearch = async () => {
    if (!connection) {
      return;
    }

    setSearching(true);

    try {
      await connection.invoke('GameSearch');
    } catch (e) {
      console.error(e);
      setSearching(false);
    }
  };

  const handleRaceSearch = async () => {
    if (!connection) {
      return;
    }

    setRacing(true);

    try {
      await connection.invoke('RaceSearch');
    } catch (e) {
      console.error(e);
      setRacing(false);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleCancel = () => {
    setSearching(false);

    if (!connection) {
      return;
    }

    connection.send('GameCancelSearch').catch(console.error);
  };

  const handleRaceCancel = () => {
    setRacing(false);

    if (!connection) {
      return;
    }

    connection.send('RaceCancelSearch').catch(console.error);
  };

  return (
    <>
      <div className="home">
        <h1>On Paper</h1>
        {user ? (
          <>
            <p className="username">Signed in as {user}</p>
            <button type="button" onClick={handleSearch} disabled={!connection || racing}>
              { connection ? 'Play' : 'Connecting...' }
            </button>
            <button type="button" onClick={handleRaceSearch} disabled={!connection || searching}>
              { connection ? 'Play Maze Race' : 'Connecting...' }
            </button>
          </>
        ) : null}
        <button type="button" onClick={handleLogin}>
          Login
        </button>
        <p>
          No account? <Link to="/register">Sign up</Link>
        </p>
      </div>
      <Leaderboard />
      {searching && <Search handleCancel={ handleCancel } />}
      {racing && (
        <Search
          handleCancel={ handleRaceCancel }
          message="Searching for maze race players..."
        />
      )}
    </>
  );
}

export default Home;