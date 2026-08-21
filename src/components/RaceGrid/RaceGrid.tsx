import './RaceGrid.css';
import { RacePlayerPosition } from '../../models/Race.tsx';

interface RaceGridProps {
  sizeX: number;
  sizeY: number;
  players: RacePlayerPosition[];
  myUserId: string | null;
}

// Лабиринт пока без стенок, поэтому клеток с двумя игроками быть не должно -
// сервер расставляет все стартовые точки на разные клетки.
const PLAYER_COLORS = [
  '#4d9bff', '#ff8a4d', '#4dff9b', '#ff4d94', '#c94dff',
  '#ffe14d', '#4dfff2', '#ff4d4d', '#9bff4d', '#4d5eff',
];

export default function RaceGrid({ sizeX, sizeY, players, myUserId }: RaceGridProps) {
  const byCell = new Map<number, RacePlayerPosition[]>();

  players.forEach(player => {
    const list = byCell.get(player.position);

    if (list) {
      list.push(player);
    } else {
      byCell.set(player.position, [player]);
    }
  });

  return (
    <div className="race-grid" style={ { '--sizeX': sizeX, '--sizeY': sizeY } as React.CSSProperties }>
      { Array.from({ length: sizeX * sizeY }, (_, index) => (
        <div key={ index } className="race-cell">
          { (byCell.get(index) ?? []).map(player => {
            const colorIndex = players.findIndex(p => p.userId === player.userId);
            const isMe = player.userId === myUserId;

            return (
              <div
                key={ player.userId }
                className={ `race-player${ isMe ? ' race-player-me' : '' }` }
                style={ { background: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length] } }
                title={ isMe ? 'You' : `Player ${ colorIndex + 1 }` }
              />
            );
          }) }
        </div>
      )) }
    </div>
  );
}
