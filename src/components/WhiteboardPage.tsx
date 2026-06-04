import TopBar from "./TopBar";
import Canvas from "./Canvas";
import { useWhiteboard } from "../hooks/useWhiteboard";

const WhiteboardPage = () => {
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
  } = useWhiteboard();

  return (
    <div className="w-full h-full flex flex-col">
      <TopBar onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
      <div className="flex flex-1 overflow-hidden">
        <Canvas
          lines={lines}
          setLines={setLines}
          textBoxes={textBoxes}
          setTextBoxes={setTextBoxes}
          stickyNotes={stickyNotes}
          setStickyNotes={setStickyNotes}
          pushHistory={pushHistory}
        />
      </div>
    </div>
  );
};

export default WhiteboardPage;
