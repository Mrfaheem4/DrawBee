import { Undo2, Redo2 } from "lucide-react";

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TopBar = ({ onUndo, onRedo, canUndo, canRedo }: TopBarProps) => {
  return (
    <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center px-4 relative">
      {/* Center title */}
      <span className="absolute left-1/2 -translate-x-1/2 text-white font-semibold text-lg">
        Drawbee
      </span>

      {/* Right side — undo/redo */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <Redo2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
