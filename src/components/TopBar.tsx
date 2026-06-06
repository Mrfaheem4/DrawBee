import { Undo2, Redo2 } from "lucide-react";

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TopBar = ({ onUndo, onRedo, canUndo, canRedo }: TopBarProps) => {
  return (
    <div className="h-20  flex items-center  relative ">
      {/* Left — undo/redo */}
      <div className="flex items-center gap-1 rounded-2xl   ml-8 bg-white/20 border-2 border-white/40">
        {" "}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className=" w-12 h-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="w-12 h-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <Redo2 size={20} />
        </button>
      </div>

      {/* Center — title */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2   px-4 py-2 rounded-xl">
        <img src="/logo.png" alt="Drawbee Logo" className="h-20 w-20" />
        <span className="text-gray-800  text-3xl">Drawbee</span>
      </div>
    </div>
  );
};

export default TopBar;
