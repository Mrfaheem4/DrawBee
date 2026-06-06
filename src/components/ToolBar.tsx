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
    <div className=" scale-125  absolute left-8  w-14  top-1/2  -translate-y-[55%] z-50 flex flex-col items-center gap-2 py-3 rounded-2xl bg-white/40 border-2 border-white/40 backdrop-blur-lg shadow-xl ">
      {" "}
      {/* Tools */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          className={`
            w-11 h-11 rounded-full flex items-center justify-center transition-colors
            ${
              activeTool === tool.id
                ? "bg-white/90"
                : "text-black-400 bg-white/40  hover:bg-gray-700 hover:text-white"
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
