import TopBar from "./TopBar";
import Canvas from "./Canvas";
import { useWhiteboard } from "../hooks/useWhiteboard";
import { useBoard } from "../hooks/useBoard";

const WhiteboardPage = () => {
  const { boardId } = useBoard();

  const {
    lines,
    setLines,
    textBoxes,
    setTextBoxes,
    stickyNotes,
    setStickyNotes,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    dbAddLine,
    dbDeleteLine,
    dbAddTextBox,
    dbUpdateTextBox,
    dbDeleteTextBox,
    dbAddStickyNote,
    dbUpdateStickyNote,
    dbDeleteStickyNote,
  } = useWhiteboard(boardId);

  return (
    <div className="w-full h-full flex flex-col">
      <TopBar
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        boardId={boardId ?? undefined}
      />
      <div className="flex flex-1 overflow-hidden">
        <Canvas
          lines={lines}
          setLines={setLines}
          textBoxes={textBoxes}
          setTextBoxes={setTextBoxes}
          stickyNotes={stickyNotes}
          setStickyNotes={setStickyNotes}
          pushHistory={pushHistory}
          dbAddLine={dbAddLine}
          dbDeleteLine={dbDeleteLine}
          dbAddTextBox={dbAddTextBox}
          dbUpdateTextBox={dbUpdateTextBox}
          dbDeleteTextBox={dbDeleteTextBox}
          dbAddStickyNote={dbAddStickyNote}
          dbUpdateStickyNote={dbUpdateStickyNote}
          dbDeleteStickyNote={dbDeleteStickyNote}
        />
      </div>
    </div>
  );
};

export default WhiteboardPage;
