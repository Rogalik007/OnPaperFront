import { useEffect, useState } from 'react';
import './MazeEditor.css';
import { Maze } from '../../models/Maze.tsx';
import { useSignalR } from '../../models/SignalRContext.tsx';
import { Directions } from '../../enums/Directions.tsx';
import { EditMods } from '../../enums/EditMods.tsx';
import { hubErrorMessage } from '../../models/HubError.tsx';
import { clearDraft, loadDraft, saveDraft } from '../../models/MazeDraft.tsx';

const WALL_HIT = 10;
const REQUIRED_MINES = 2;
// Противник начинает с этой клетки - клад и мины на ней сервер не примет
const START_CELL = 0;

interface MazeEditorProps {
  gameId: string;
  onSaved: (maze: Maze) => void;
}

export default function MazeEditor({ gameId, onSaved }: MazeEditorProps) {
  const [maze, setMaze] = useState<Maze | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(EditMods.WALL);
  const { connection } = useSignalR();
  const [, forceUpdate] = useState({});

  useEffect(() => {

    if (!connection) {
      return;
    }

    (async () => {
      await connection.invoke<number[]>("GetMazeSize")
        // Недорисованный лабиринт лежит в браузере, поэтому перезагрузка его не теряет
        .then(size => setMaze(loadDraft(gameId, size[0], size[1]) ?? new Maze(size[0], size[1])))
        .catch(e => console.log(e))
    })()
  }, [connection, gameId]);

  // Любое изменение поля сразу уходит в черновик
  const update = () => {
    if (maze) {
      saveDraft(gameId, maze);
    }

    forceUpdate({});
  };

  const isStartCell = (index: number) => {
    if (index !== START_CELL) {
      return false;
    }

    setError("Treasure and mines can't be placed on the start cell");
    return true;
  };

  const handleClear = () => {
    if (!maze) {
      return;
    }

    const empty = new Maze(maze.sizeX, maze.sizeY);

    setMaze(empty);
    saveDraft(gameId, empty);
  };

  const handleSaveMaze = async () => {
    if (!connection || !maze) {
      return;
    }

    if (maze.treasure === null) {
      setError('Place the treasure first');
      return;
    }

    if (maze.mines.length !== REQUIRED_MINES) {
      setError(`Place ${ REQUIRED_MINES } mines`);
      return;
    }

    if (maze.superMine === null) {
      setError('Place the supermine');
      return;
    }

    setSending(true);
    setError(null);

    try {
      await connection.invoke<boolean>('SaveMaze', gameId, maze);
      clearDraft(gameId);
      onSaved(maze);
    } catch (e) {
      setError(hubErrorMessage(e));
      setSending(false);
    }
  };

  return (
    <div className="editor">
      { maze &&
        <div className="maze" style={ { '--sizeX': maze.sizeX, '--sizeY': maze.sizeY } as React.CSSProperties }>
          { Array.from({ length: maze.sizeX * maze.sizeY }, (_, index) => (
            <div
              id={ String(index) }
              key={ index }
              className="cell"
            >
              { maze.treasure === index && <div className="treasure" /> }
              { maze.mines.includes(index) && <div className="mine">М</div> }
              { maze.superMine === index && <div className="supermine">С</div> }
              { maze.hasWall(index, Directions.RIGHT) && <div className="wall wall-right" /> }
              { maze.hasWall(index, Directions.DOWN) && <div className="wall wall-bottom" /> }
              { editMode === EditMods.TREASURE &&
                <div
                  className="cell-zone"
                  onClick={ () => { if (isStartCell(index)) return; maze.treasure === index ? maze.treasure = null : maze.treasure = index; update(); } }
                />
              }
              { editMode === EditMods.MINE &&
                <div
                  className="cell-zone"
                  onClick={ () => {
                    if (isStartCell(index)) {
                      return;
                    }

                    const i = maze.mines.indexOf(index);

                    if (i >= 0) {
                      maze.mines.splice(i, 1);
                    } else if (maze.mines.length < REQUIRED_MINES) {
                      maze.mines.push(index);
                    }

                    update();
                  } }
                />
              }
              { editMode === EditMods.SUPERMINE &&
                <div
                  className="cell-zone"
                  onClick={ () => { if (isStartCell(index)) return; maze.superMine === index ? maze.superMine = null : maze.superMine = index; update(); } }
                />
              }
              { editMode === EditMods.WALL &&
                <>
                  { (index + 1) % maze.sizeX !== 0 && (
                    <div
                      className="wall-zone wall-zone-right"
                      style={ { width: WALL_HIT } }
                      onClick={ () => { maze.addOrRemoveWall(index, Directions.RIGHT); update(); } }
                    />
                  ) }
                  { index < maze.sizeX * (maze.sizeY - 1) && (
                    <div
                      className="wall-zone wall-zone-bottom"
                      style={ { height: WALL_HIT } }
                      onClick={ () => { maze.addOrRemoveWall(index, Directions.DOWN); update(); } }
                    />
                  ) }
                </>
              }
            </div>
          ))}
        </div>
      }
      <div className="mode-toggle">
        <button
          type="button"
          className={ editMode === EditMods.WALL ? 'active' : undefined }
          onClick={ () => setEditMode(EditMods.WALL) }
        >
          Wall
        </button>
        <button
          type="button"
          className={ editMode === EditMods.TREASURE ? 'active' : undefined }
          onClick={ () => setEditMode(EditMods.TREASURE) }
        >
          Treasure
        </button>
        <button
          type="button"
          className={ editMode === EditMods.MINE ? 'active' : undefined }
          onClick={ () => setEditMode(EditMods.MINE) }
        >
          Mine
        </button>
        <button
          type="button"
          className={ editMode === EditMods.SUPERMINE ? 'active' : undefined }
          onClick={ () => setEditMode(EditMods.SUPERMINE) }
        >
          Supermine
        </button>
      </div>
      <div className="buttons">
        <button type="button" onClick={ handleClear } disabled={ sending }>
          Clear
        </button>
        <button type="button" onClick={ handleSaveMaze } disabled={ sending }>
          { sending ? 'Sending...' : 'Save maze' }
        </button>
      </div>
      { error && <div className="error">{ error }</div> }
    </div>
  );
}
