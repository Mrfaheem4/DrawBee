import { useCanvas, type Tool } from "../context/CanvasContext";
import { MousePointer2, Pencil, Type, StickyNote, Eraser } from "lucide-react";
import ColorPickerPopup from "./ColorPickerPopup";
import { exportCanvas } from "../utils/exportCanvas";

const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer2 size={20} />, label: "Select" },
  { id: "pen", icon: <Pencil size={20} />, label: "Pen" },
  { id: "text", icon: <Type size={20} />, label: "Text" },
  { id: "sticky", icon: <StickyNote size={20} />, label: "Sticky" },
  { id: "eraser", icon: <Eraser size={20} />, label: "Eraser" },
];

interface ToolbarProps {
  onExport: (format: "png" | "jpeg" | "svg") => void;
}

const Toolbar = ({ onExport }: ToolbarProps) => {
  const { activeTool, setActiveTool } = useCanvas();

  return (
    <div className="w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-6 gap-1">
      {/* Tools */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center transition-colors
            ${
              activeTool === tool.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }
          `}
        >
          {tool.icon}
        </button>
      ))}

      {/* Divider */}
      <div className="w-8 h-px bg-gray-700 my-2" />

      {/* Color Picker */}
      <ColorPickerPopup />

      {/* Divider */}
      <div className="w-8 h-px bg-gray-700 my-2" />

      {/* Export buttons */}
      {(["png", "jpeg", "svg"] as const).map((fmt) => (
        <button
          key={fmt}
          onClick={() => onExport(fmt)}
          title={`Export as ${fmt.toUpperCase()}`}
          className="w-10 h-6 rounded text-[10px] font-bold text-gray-400 hover:bg-gray-700 hover:text-white transition-colors uppercase tracking-wide"
        >
          {fmt}
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
