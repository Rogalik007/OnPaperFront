import { Directions } from '../enums/Directions';

export class Maze {
  sizeX: number;
  sizeY: number;
  horizontalWalls: number[];
  verticalWalls: number[];
  treasure: number | null;
  mines: number[];
  superMine: number | null;

  constructor(size_x: number, size_y: number) {
    this.sizeX = size_x;
    this.sizeY = size_y;
    this.horizontalWalls = new Array(size_x * (size_y - 1)).fill(0);
    this.verticalWalls = new Array((size_x - 1) * size_y).fill(0);
    this.treasure = null;
    this.mines = [];
    this.superMine = null;
  }

  addOrRemoveWall(cellIndex: number, direction: Directions, onlyAddWall: boolean = false): void {
    let wallIndex: number = this.getWallIndex(cellIndex, direction);

    if (wallIndex < 0) {
      return;
    }
    
    if (direction === Directions.RIGHT || direction === Directions.LEFT) {
      if (wallIndex < this.verticalWalls.length)
        this.verticalWalls[wallIndex] = this.verticalWalls[wallIndex] === 0 || onlyAddWall ? 1 : 0;
    } else {
      if (wallIndex < this.horizontalWalls.length)
        this.horizontalWalls[wallIndex] = this.horizontalWalls[wallIndex] === 0 || onlyAddWall ? 1 : 0;
    }
  }

  hasWall(cellIndex: number, direction: Directions): boolean {
    let wallIndex: number = this.getWallIndex(cellIndex, direction);

    if (wallIndex < 0) {
      return false;
    }
    
    if (direction === Directions.RIGHT || direction === Directions.LEFT) {
      if (wallIndex < this.verticalWalls.length)
        return this.verticalWalls[wallIndex] === 1;
    } else {
      if (wallIndex < this.horizontalWalls.length)
        return this.horizontalWalls[wallIndex] === 1;
    }
    return false;
  }

  getWallIndex(cellIndex: number, direction: Directions): number {
    switch (direction) {
      case Directions.UP:
        if (cellIndex < this.sizeX)
          return -1;
        return cellIndex - this.sizeX;
      case Directions.RIGHT:
        if ((cellIndex + 1) % this.sizeX === 0)
          return -1;
        return cellIndex - Math.trunc(cellIndex / this.sizeX);
      case Directions.DOWN:
        if (cellIndex >= this.sizeX * (this.sizeY - 1))
          return -1;
        return cellIndex;
      case Directions.LEFT:
        if (cellIndex % this.sizeX === 0)
          return -1;
        return cellIndex - (Math.trunc(cellIndex / this.sizeX) + 1);
      default:
        return -1;
    }
  }
}