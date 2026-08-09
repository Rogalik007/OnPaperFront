import { Maze } from './Maze.tsx';
import { Directions } from '../enums/Directions.tsx';

export interface WallHit {
  cell: number;
  direction: Directions;
}

export interface MazeModel {
  sizeX: number;
  sizeY: number;
  horizontalWalls: number[];
  verticalWalls: number[];
  treasure: number | null;
}

// Ответ GetGameState: с ним экран восстанавливается после перезагрузки страницы
export interface GameSnapshot {
  size: number[];
  myMaze: MazeModel | null;
  isStarted: boolean;
  myPosition: number;
  opponentPosition: number;
  yourTurn: boolean;
  secondsLeft: number;
  discoveredWalls: WallHit[];
  youWon: boolean | null;
  endedByDisconnect: boolean;
  opponentLeftSeconds: number | null;
}

export function toMaze(model: MazeModel): Maze {
  const maze = new Maze(model.sizeX, model.sizeY);

  maze.horizontalWalls = model.horizontalWalls;
  maze.verticalWalls = model.verticalWalls;
  maze.treasure = model.treasure;

  return maze;
}
