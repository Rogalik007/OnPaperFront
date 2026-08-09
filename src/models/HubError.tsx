// SignalR оборачивает текст HubException в свою фразу
// ("An unexpected error occurred invoking 'X' on the server. HubException: ...").
// Показывать пользователю нужно только само сообщение.
export function hubErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const marker = 'HubException: ';
  const index = text.lastIndexOf(marker);

  return index === -1 ? text : text.slice(index + marker.length);
}
