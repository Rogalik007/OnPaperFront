import { useState, useEffect, createContext, useContext } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { API_URL } from '../../config'
import { getToken, subscribeToAuth } from './Auth.tsx';

interface SignalRContextType {
  connection: HubConnection | null;
}

export const SignalRContext = createContext<SignalRContextType>( {connection: null} );

export const SignalRProvider = ({ children }: { children: React.ReactNode }) => {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [token, setToken] = useState<string | null>(getToken);

  // Провайдер монтируется до логина, поэтому токен нужно перечитывать: иначе соединение
  // навсегда остаётся неподнятым и кнопка Play не работает до перезагрузки страницы.
  useEffect(() => subscribeToAuth(() => setToken(getToken())), []);

  useEffect(() => {
    if (!token) {
      setConnection(null);
      return;
    }

    const newConnection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/gameHub`, { accessTokenFactory: () => getToken() ?? '' })
      .withAutomaticReconnect()
      .build();

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
