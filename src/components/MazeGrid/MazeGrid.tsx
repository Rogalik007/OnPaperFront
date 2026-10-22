import './MazeGrid.css';
import { Maze } from '../../models/Maze.tsx';
import { Directions } from '../../enums/Directions.tsx';
import { CellItem, PlayerIcon } from '../Icons/Icons.tsx';

interface MazeGridProps {
  maze: Maze;
  player?: number | null;
  opponent?: number | null;
  showTreasure?: boolean;
}

// Одна сетка без взаимодействия. Для чужого лабиринта в maze лежат только открытые стенки,
// для своего - весь нарисованный лабиринт вместе с кладом.
export default function MazeGrid({ maze, player = null, opponent = null, showTreasure = false }: MazeGridProps) {
  return (
    <div className="grid" style={ { '--sizeX': maze.sizeX, '--sizeY': maze.sizeY } as React.CSSProperties }>
      { Array.from({ length: maze.sizeX * maze.sizeY }, (_, index) => {
        const occupied = index === player || index === opponent;

        return (
          <div id={ String(index) } key={ index } className="grid-cell">
            { showTreasure && maze.treasure === index && <CellItem kind="treasure" occupied={ occupied } /> }
            { maze.mines.includes(index) && <CellItem kind="mine" occupied={ occupied } /> }
            { maze.superMine === index && <CellItem kind="supermine" occupied={ occupied } /> }
            { index === player && <PlayerIcon className="cell-icon" /> }
            { index === opponent && <PlayerIcon className="cell-icon icon-opponent" /> }
            { maze.hasWall(index, Directions.RIGHT) && <div className="wall wall-right" /> }
            { maze.hasWall(index, Directions.DOWN) && <div className="wall wall-bottom" /> }
          </div>
        );
      }) }
    </div>
  );
}
