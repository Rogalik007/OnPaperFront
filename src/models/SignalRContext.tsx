import { useState, useEffect, createContext, useContext } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { API_URL } from '../../config'
import { getToken, subscribeToAuth } from './Auth.tsx';

// SignalR не даёт снять отдельный обработчик onreconnected, а соединение живёт дольше
// одной игры - поэтому вместо повторной регистрации на каждый заход в Game держим один
// слот, который текущий экран игры может подставлять и убирать за собой
export type GameHubConnection = HubConnection & { onGameReconnected?: () => void };

interface SignalRContextType {
  connection: GameHubConnection | null;
}

export const SignalRContext = createContext<SignalRContextType>( {connection: null} );

export const SignalRProvider = ({ children }: { children: React.ReactNode }) => {
  const [connection, setConnection] = useState<GameHubConnection | null>(null);
  const [token, setToken] = useState<string | null>(getToken);

  // Провайдер монтируется до логина, поэтому токен нужно перечитывать: иначе соединение
  // навсегда остаётся неподнятым и кнопка Play не работает до перезагрузки страницы.
  useEffect(() => subscribeToAuth(() => setToken(getToken())), []);

  useEffect(() => {
    if (!token) {
      setConnection(null);
      return;
    }

    const newConnection: GameHubConnection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/gameHub`, { accessTokenFactory: () => getToken() ?? '' })
      .withAutomaticReconnect()
      .build();

    // Автопереподключение поднимает новое соединение на сервере молча, без участия Game -
    // тому, кто сейчас на экране игры, надо перезапросить состояние, иначе сервер продолжит
    // думать, что игрок не вернулся, и не снимет с противника надпись "Opponent left the game"
    newConnection.onreconnected(() => newConnection.onGameReconnected?.());

    let isCurrent = true;

    newConnection.start()
      .then(() => {
        if (isCurrent) {
          setConnection(newConnection);
        } else {
          newConnection.stop();
        }
      })
      .catch(console.error);

    return () => {
      isCurrent = false;
      setConnection(null);
      newConnection.stop();
    };
  }, [token]);

  return (
    <SignalRContext.Provider value={ {connection} }>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = () => useContext(SignalRContext);
