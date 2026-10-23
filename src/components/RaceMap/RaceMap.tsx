import { useRef } from 'react';
import './RaceMap.css';
import { RaceCell, RacePlayerView } from '../../models/Race.tsx';
import { Directions } from '../../enums/Directions.tsx';
import { PlayerIcon, TreasureIcon } from '../Icons/Icons.tsx';

// Окно карты в клетках. Нечётное - чтобы у игрока была ровно центральная клетка
const VIEW = 11;
const HALF = (VIEW - 1) / 2;
// Дальше двигать бессмысленно: лабиринт 10x10, а координаты карты считаются от старта игрока
const MAX_OFFSET = 10;
// Сетка 1px между клетками входит в шаг сдвига
const GAP = 1;

interface RaceMapProps {
  view: RacePlayerView;
  color: string;
  showTreasure: boolean;
  // Сдвиг окна относительно игрока в целых клетках
  offset: RaceCell;
  onPan: (offset: RaceCell) => void;
}

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  start: RaceCell;
  step: number;
}

const clamp = (value: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, value));

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

// Карта игрока: окно VIEW x VIEW, по умолчанию с ним самим в центре. Карта двигается под игроком,
// а края настоящего лабиринта не рисуются - поэтому никто, даже сам игрок, не видит, где он.
// Окно можно таскать мышью или пальцем - строго по целым клеткам, без промежуточных положений.
export default function RaceMap({ view, color, showTreasure, offset, onPan }: RaceMapProps) {
  const dragRef = useRef<Drag | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const cell = event.currentTarget.firstElementChild;

    if (!cell || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      start: offset,
      step: cell.getBoundingClientRect().width + GAP,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    // Тянем карту вправо - окно уезжает влево. Округление даёт ровно целое число клеток
    const x = clamp(drag.start.x - Math.round((event.clientX - drag.startX) / drag.step));
    const y = clamp(drag.start.y - Math.round((event.clientY - drag.startY) / drag.step));

    if (x !== offset.x || y !== offset.y) {
      onPan({ x, y });
    }
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const walls = new Set(view.walls.map(w => wallKey(w.x, w.y, w.direction)));
  const visited = new Set(view.visited.map(c => `${ c.x },${ c.y }`));

  return (
    <div
      className="race-map"
      style={ { '--view': VIEW, '--trail': color } as React.CSSProperties }
      onPointerDown={ onPointerDown }
      onPointerMove={ onPointerMove }
      onPointerUp={ onPointerEnd }
      onPointerCancel={ onPointerEnd }
    >
      { Array.from({ length: VIEW * VIEW }, (_, index) => {
        const col = index % VIEW;
        const row = Math.floor(index / VIEW);
        const x = view.x + offset.x + col - HALF;
        const y = view.y + offset.y + row - HALF;
        const isPlayer = x === view.x && y === view.y;
        const isTreasure = showTreasure && view.treasure !== null && view.treasure.x === x && view.treasure.y === y;

        return (
          <div key={ index } className={ `race-map-cell${ visited.has(`${ x },${ y }`) ? ' race-map-visited' : '' }` }>
            { col === 0 && walls.has(`${ x - 1 },${ y },R`) && <div className="race-map-wall race-map-wall-left" /> }
            { row === 0 && walls.has(`${ x },${ y - 1 },D`) && <div className="race-map-wall race-map-wall-top" /> }
            { walls.has(`${ x },${ y },R`) && <div className="race-map-wall race-map-wall-right" /> }
            { walls.has(`${ x },${ y },D`) && <div className="race-map-wall race-map-wall-bottom" /> }
            { isTreasure && !isPlayer && <TreasureIcon className="race-map-icon" /> }
            { isTreasure && isPlayer && <div className="race-map-treasure-under" /> }
            { isPlayer &&
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
