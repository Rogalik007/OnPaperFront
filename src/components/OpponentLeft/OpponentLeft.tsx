import { useEffect, useRef, useState } from 'react';
import './OpponentLeft.css';
import { useSignalR } from '../../models/SignalRContext.tsx';

interface OpponentLeftProps {
  gameId: string;
  seconds: number;
}

// Противник отвалился. Когда отсчёт кончится, сервер сверится со своим дедлайном
// и закончит партию - как и с таймаутом хода, сообщить об этом может оставшийся игрок.
export default function OpponentLeft({ gameId, seconds }: OpponentLeftProps) {
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const { connection } = useSignalR();
  const secondsRef = useRef(seconds);

  useEffect(() => {
    if (!connection) {
      return;
    }

    const timer = setInterval(() => {
      if (secondsRef.current > 0) {
        secondsRef.current -= 1;
        setSecondsLeft(secondsRef.current);
      }

      if (secondsRef.current === 0) {
        connection.invoke('CheckOpponentLeft', gameId).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [connection, gameId]);

  return (
    <p className="opponent-left">
      Opponent left the game. It will end in { secondsLeft }s
    </p>
  );
}
