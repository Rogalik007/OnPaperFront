import { Maze } from './Maze.tsx';

const PREFIX = 'maze-draft:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Draft {
  savedAt: number;
  sizeX: number;
  sizeY: number;
  horizontalWalls: number[];
  verticalWalls: number[];
  treasure: number | null;
}

// Незаконченный лабиринт на сервер не отправляется, поэтому черновик живёт в браузере
// и переживает перезагрузку страницы.
export function saveDraft(gameId: string, maze: Maze): void {
  const draft: Draft = {
    savedAt: Date.now(),
    sizeX: maze.sizeX,
    sizeY: maze.sizeY,
    horizontalWalls: maze.horizontalWalls,
    verticalWalls: maze.verticalWalls,
    treasure: maze.treasure,
  };

  try {
    localStorage.setItem(PREFIX + gameId, JSON.stringify(draft));
  } catch {
    // приватный режим или переполненное хранилище - черновик просто не сохранится
  }
}

export function loadDraft(gameId: string, sizeX: number, sizeY: number): Maze | null {
  removeOldDrafts();

  const raw = localStorage.getItem(PREFIX + gameId);

  if (!raw) {
    return null;
  }

  let draft: Draft;

  try {
    draft = JSON.parse(raw);
  } catch {
    localStorage.removeItem(PREFIX + gameId);
    return null;
  }

  // Размер поля мог поменяться - тогда черновик уже не подходит
  if (draft.sizeX !== sizeX || draft.sizeY !== sizeY) {
    localStorage.removeItem(PREFIX + gameId);
    return null;
  }

  const maze = new Maze(sizeX, sizeY);

  if (draft.horizontalWalls?.length === maze.horizontalWalls.length) {
    maze.horizontalWalls = draft.horizontalWalls;
  }

  if (draft.verticalWalls?.length === maze.verticalWalls.length) {
    maze.verticalWalls = draft.verticalWalls;
  }

  maze.treasure = draft.treasure ?? null;

  return maze;
}

export function clearDraft(gameId: string): void {
  localStorage.removeItem(PREFIX + gameId);
}

// Черновики брошенных партий иначе копились бы бесконечно
function removeOldDrafts(): void {
  const stale = Object.keys(localStorage).filter(key => {
    if (!key.startsWith(PREFIX)) {
      return false;
    }

    try {
      const draft: Draft = JSON.parse(localStorage.getItem(key) ?? '');
      return Date.now() - draft.savedAt > MAX_AGE_MS;
    } catch {
      return true;
    }
  });

  stale.forEach(key => localStorage.removeItem(key));
}
