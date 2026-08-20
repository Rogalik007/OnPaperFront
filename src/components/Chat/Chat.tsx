import { useEffect, useRef, useState, FormEvent } from 'react';
import './Chat.css';
import { useSignalR } from '../../models/SignalRContext.tsx';
import { getUserId } from '../../models/Auth.tsx';
import { hubErrorMessage } from '../../models/HubError.tsx';
import { ChatMessage } from '../../models/Chat.tsx';

export const CHAT_MESSAGE_MAX_LENGTH = 64;

interface ChatProps {
  gameId: string;
  initialMessages: ChatMessage[];
}

export default function Chat({ gameId, initialMessages }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useSignalR();
  const listRef = useRef<HTMLDivElement>(null);
  const myUserId = getUserId();

  useEffect(() => {
    if (!connection) {
      return;
    }

    const onChatMessage = (message: ChatMessage) => setMessages(prev => [...prev, message]);

    connection.on('ChatMessage', onChatMessage);

    return () => connection.off('ChatMessage', onChatMessage);
  }, [connection]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmed = text.trim();

    if (!connection || !trimmed) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      await connection.invoke('SendChatMessage', gameId, trimmed);
      setText('');
    } catch (e) {
      setError(hubErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat">
      <div className="chat-messages" ref={ listRef }>
        { messages.length === 0 && <p className="chat-empty">No messages yet</p> }
        { messages.map((message, index) => (
          <p
            key={ index }
            className={ message.userId === myUserId ? 'chat-message chat-message-own' : 'chat-message' }
          >
            { message.text }
          </p>
        )) }
      </div>
      { error && <p className="error chat-error">{ error }</p> }
      <form className="chat-form" onSubmit={ handleSubmit }>
        <input
          type="text"
          value={ text }
          maxLength={ CHAT_MESSAGE_MAX_LENGTH }
          placeholder="Message..."
          onChange={ (e) => setText(e.target.value) }
          disabled={ sending }
        />
        <button type="submit" disabled={ sending || !text.trim() }>Send</button>
      </form>
    </div>
  );
}
