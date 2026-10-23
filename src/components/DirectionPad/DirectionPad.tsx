import './DirectionPad.css';
import { Directions } from '../../enums/Directions.tsx';

interface DirectionPadProps {
  onPress: (direction: Directions) => void;
  disabled?: boolean;
  // В режиме выстрела пульт красный - чтобы не выстрелить вместо шага по ошибке
  danger?: boolean;
}

const KEYS = [
  { direction: Directions.UP, name: 'up', label: 'Up', rotate: 0 },
  { direction: Directions.LEFT, name: 'left', label: 'Left', rotate: -90 },
  { direction: Directions.RIGHT, name: 'right', label: 'Right', rotate: 90 },
  { direction: Directions.DOWN, name: 'down', label: 'Down', rotate: 180 },
];

// Крестовидный пульт - на телефоне нет физической клавиатуры, поэтому это единственный способ ходить.
// Одна стрелка-шеврон, повёрнутая в нужную сторону, - так все четыре гарантированно одинаковые.
export default function DirectionPad({ onPress, disabled = false, danger = false }: DirectionPadProps) {
  return (
    <div className={ `dpad${ danger ? ' dpad-danger' : '' }` }>
      { KEYS.map(key =>
        <button
          key={ key.name }
          type="button"
          className={ `dpad-key dpad-${ key.name }` }
          aria-label={ key.label }
          disabled={ disabled }
          onClick={ () => onPress(key.direction) }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" style={ { transform: `rotate(${ key.rotate }deg)` } }>
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
      ) }
      <span className="dpad-hub" aria-hidden="true" />
    </div>
  );
}
