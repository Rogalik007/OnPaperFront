import './Icons.css';

// Иконки поля 16x16. Цвет берётся из currentColor, поэтому задаётся через CSS (color),
// а не внутри SVG - одна и та же иконка игрока красится в цвет любого участника гонки.

interface IconProps {
  className?: string;
}

export function TreasureIcon({ className = '' }: IconProps) {
  return (
    <svg className={ `icon icon-treasure ${ className }` } viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.5 7V5.5C1.5 3.6 2.6 2.5 4.5 2.5h7c1.9 0 3 1.1 3 3V7z" fill="currentColor" />
      <rect x="1.5" y="8" width="13" height="5.5" fill="currentColor" />
      <rect x="6.5" y="5.5" width="3" height="4" fill="var(--paper)" />
    </svg>
  );
}

// Обычная мина - круглая с шипами
export function MineIcon({ className = '' }: IconProps) {
  return (
    <svg className={ `icon icon-mine ${ className }` } viewBox="0 0 16 16" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4" />
        <path d="M2.9 2.9l1.7 1.7M11.4 11.4l1.7 1.7M2.9 13.1l1.7-1.7M11.4 4.6l1.7-1.7" />
      </g>
      <circle cx="8" cy="8" r="4.6" fill="currentColor" />
      <circle cx="6.4" cy="6.4" r="1.1" fill="var(--paper)" />
    </svg>
  );
}

// Супер-мина - рваная вспышка взрыва: отличается от обычной мины формой, а не только цветом
export function SuperMineIcon({ className = '' }: IconProps) {
  return (
    <svg className={ `icon icon-supermine ${ className }` } viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 0.5l1.6 3.9 3.7-2-1.1 4 3.3 1.6-3.3 1.6 1.1 4-3.7-2L8 15.5l-1.6-3.9-3.7 2 1.1-4L0.5 8l3.3-1.6-1.1-4 3.7 2z"
        fill="currentColor"
      />
      <circle cx="8" cy="8" r="2" fill="var(--paper)" />
    </svg>
  );
}

interface PlayerIconProps extends IconProps {
  color?: string;
  // Обводка выделяет "себя" среди других игроков гонки
  outlined?: boolean;
}

export function PlayerIcon({ className = '', color, outlined = false }: PlayerIconProps) {
  return (
    <svg
      className={ `icon icon-player ${ className }` }
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={ color ? { color } : undefined }
    >
      <g
        fill="currentColor"
        stroke={ outlined ? 'var(--ink)' : 'none' }
        strokeWidth={ outlined ? 1.4 : 0 }
        paintOrder="stroke"
      >
        <circle cx="8" cy="4.6" r="3.1" />
        <path d="M2.4 15c0-3.7 2.4-6 5.6-6s5.6 2.3 5.6 6z" />
      </g>
    </svg>
  );
}

export type CellItemKind = 'treasure' | 'mine' | 'supermine';

const ITEM_ICONS = { treasure: TreasureIcon, mine: MineIcon, supermine: SuperMineIcon };

// Предмет в клетке поля: подкраска + иконка. Если на клетке стоит игрок, иконку предмета
// не рисуем - она оказалась бы под иконкой игрока, а подкраска и так показывает, что тут лежит.
export function CellItem({ kind, occupied = false }: { kind: CellItemKind; occupied?: boolean }) {
  const Icon = ITEM_ICONS[kind];

  return (
    <>
      <div className={ `cell-tint cell-tint-${ kind }` } />
      { !occupied && <Icon className="cell-icon" /> }
    </>
  );
}

// Пуля в счётчике патронов. Потраченная рисуется контуром
export function BulletIcon({ className = '', spent = false }: IconProps & { spent?: boolean }) {
  return (
    <svg className={ `icon icon-bullet ${ spent ? 'icon-bullet-spent' : '' } ${ className }` } viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.2c1.9 1.4 2.9 3.6 2.9 6V14H5.1V7.2c0-2.4 1-4.6 2.9-6z"
        fill={ spent ? 'none' : 'currentColor' }
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M5.1 11.2h5.8" stroke={ spent ? 'currentColor' : 'var(--paper)' } strokeWidth="1.2" />
    </svg>
  );
}
