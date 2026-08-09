const TOKEN_CHANGED = 'token-changed';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getUserId(): string | null {
  return localStorage.getItem('id');
}

// Логин и регистрация сохраняют токен только здесь: событие нужно, чтобы SignalR
// переподключился сразу, а не после перезагрузки страницы.
export function saveAuth(id: string, token: string): void {
  localStorage.setItem('id', id);
  localStorage.setItem('token', token);
  window.dispatchEvent(new Event(TOKEN_CHANGED));
}

export function clearAuth(): void {
  localStorage.removeItem('id');
  localStorage.removeItem('token');
  window.dispatchEvent(new Event(TOKEN_CHANGED));
}

// storage - изменения из других вкладок, TOKEN_CHANGED - из текущей
export function subscribeToAuth(listener: () => void): () => void {
  window.addEventListener('storage', listener);
  window.addEventListener(TOKEN_CHANGED, listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(TOKEN_CHANGED, listener);
  };
}
