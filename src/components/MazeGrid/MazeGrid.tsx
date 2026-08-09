import './MazeGrid.css';
import { Maze } from '../../models/Maze.tsx';
import { Directions } from '../../enums/Directions.tsx';

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
      { Array.from({ length: maze.sizeX * maze.sizeY }, (_, index) => (
        <div id={ String(index) } key={ index } className="grid-cell">
          { showTreasure && maze.treasure === index && <div className="treasure" /> }
          { index === player && <div className="player" /> }
          { index === opponent && <div className="player player-opponent" /> }
          { maze.hasWall(index, Directions.RIGHT) && <div className="wall wall-right" /> }
          { maze.hasWall(index, Directions.DOWN) && <div className="wall wall-bottom" /> }
        </div>
      )) }
    </div>
  );
}
