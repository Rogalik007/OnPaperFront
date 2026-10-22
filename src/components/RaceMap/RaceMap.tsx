import './RaceMap.css';
import { RacePlayerView } from '../../models/Race.tsx';
import { Directions } from '../../enums/Directions.tsx';
import { PlayerIcon, TreasureIcon } from '../Icons/Icons.tsx';

// Окно карты в клетках. Нечётное - чтобы у игрока была ровно центральная клетка
const VIEW = 11;
const HALF = (VIEW - 1) / 2;

interface RaceMapProps {
  view: RacePlayerView;
  color: string;
  showTreasure: boolean;
}

// Каждая стена хранится как правая или нижняя сторона какой-то клетки -
// так стена, найденная с любой из двух сторон, рисуется одинаково
function wallKey(x: number, y: number, direction: Directions): string {
  switch (direction) {
    case Directions.UP:
      return `${ x },${ y - 1 },D`;
    case Directions.LEFT:
      return `${ x - 1 },${ y },R`;
    case Directions.DOWN:
      return `${ x },${ y },D`;
    default:
      return `${ x },${ y },R`;
  }
}

// Карта игрока: окно VIEW x VIEW, в центре которого всегда он сам. Карта двигается под игроком,
// а края настоящего лабиринта не рисуются - поэтому никто, даже сам игрок, не видит, где он.
export default function RaceMap({ view, color, showTreasure }: RaceMapProps) {
  const walls = new Set(view.walls.map(w => wallKey(w.x, w.y, w.direction)));
  const visited = new Set(view.visited.map(c => `${ c.x },${ c.y }`));

  return (
    <div className="race-map" style={ { '--view': VIEW, '--trail': color } as React.CSSProperties }>
      { Array.from({ length: VIEW * VIEW }, (_, index) => {
        const col = index % VIEW;
        const row = Math.floor(index / VIEW);
        const x = view.x + col - HALF;
        const y = view.y + row - HALF;
        const isCenter = col === HALF && row === HALF;
        const isTreasure = showTreasure && view.treasure !== null && view.treasure.x === x && view.treasure.y === y;

        return (
          <div key={ index } className={ `race-map-cell${ visited.has(`${ x },${ y }`) ? ' race-map-visited' : '' }` }>
            { col === 0 && walls.has(`${ x - 1 },${ y },R`) && <div className="race-map-wall race-map-wall-left" /> }
            { row === 0 && walls.has(`${ x },${ y - 1 },D`) && <div className="race-map-wall race-map-wall-top" /> }
            { walls.has(`${ x },${ y },R`) && <div className="race-map-wall race-map-wall-right" /> }
            { walls.has(`${ x },${ y },D`) && <div className="race-map-wall race-map-wall-bottom" /> }
            { isTreasure && !isCenter && <TreasureIcon className="race-map-icon" /> }
            { isTreasure && isCenter && <div className="race-map-treasure-under" /> }
            { isCenter &&
              <span className={ `race-map-player${ view.alive ? '' : ' race-map-player-out' }` }>
                <PlayerIcon className="race-map-icon" color={ color } />
              </span>
            }
          </div>
        );
      }) }
    </div>
  );
}
