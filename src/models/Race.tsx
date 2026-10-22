import { Directions } from '../enums/Directions.tsx';

// Клетка на карте игрока - в координатах от его старта (старт - 0, 0), а не настоящего лабиринта
export interface RaceCell {
  x: number;
  y: number;
}

export interface RaceWall extends RaceCell {
  direction: Directions;
}

// Карта одного участника: её видят все, но по ней нельзя понять, где он на самом деле
export interface RacePlayerView {
  userId: string;
  nickname: string;
  alive: boolean;
  // Ник того, кто застрелил; null - жив или сам вышел
  eliminatedBy: string | null;
  left: boolean;
  x: number;
  y: number;
  walls: RaceWall[];
  visited: RaceCell[];
  // Где лежал клад на карте этого игрока - только после конца гонки
  treasure: RaceCell | null;
}

export type RaceWinReason = 'treasure' | 'survivor';

// Ответ GetRaceState: всё, что нужно, чтобы восстановить экран гонки (в том числе после перезагрузки)
export interface RaceSnapshot {
  bullets: number;
  alive: boolean;
  turn: string;
  secondsLeft: number;
  players: RacePlayerView[];
  winner: string | null;
  winReason: RaceWinReason | null;
}
