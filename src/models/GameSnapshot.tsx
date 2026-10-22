import { Maze } from './Maze.tsx';
import { Directions } from '../enums/Directions.tsx';
import { ChatMessage } from './Chat.tsx';

export interface WallHit {
  cell: number;
  direction: Directions;
}

export interface MineHit {
  cell: number;
  isSuper: boolean;
}

export interface MazeModel {
  sizeX: number;
  sizeY: number;
  horizontalWalls: number[];
  verticalWalls: number[];
  treasure: number | null;
  mines: number[];
  superMine: number | null;
}

// Ответ GetGameState: с ним экран восстанавливается после перезагрузки страницы
export interface GameSnapshot {
  size: number[];
  opponentNickname: string;
  myMaze: MazeModel | null;
  isStarted: boolean;
  myPosition: number;
  opponentPosition: number;
  yourTurn: boolean;
  secondsLeft: number;
  discoveredWalls: WallHit[];
  discoveredMines: MineHit[];
  youWon: boolean | null;
  endedByDisconnect: boolean;
  opponentLeftSeconds: number | null;
  chatMessages: ChatMessage[];
}

export function toMaze(model: MazeModel): Maze {
  const maze = new Maze(model.sizeX, model.sizeY);

  maze.horizontalWalls = model.horizontalWalls;
  maze.verticalWalls = model.verticalWalls;
  maze.treasure = model.treasure;
  maze.mines = model.mines;
  maze.superMine = model.superMine;

  return maze;
}
