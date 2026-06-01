import { useCanvas, type Tool } from "../context/CanvasContext";
import { MousePointer2, Pencil, Type, StickyNote, Eraser } from "lucide-react";

const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer2 size={20} />, label: "Select" },
  { id: "pen", icon: <Pencil size={20} />, label: "Pen" },
  { id: "text", icon: <Type size={20} />, label: "Text" },
  { id: "sticky", icon: <StickyNote size={20} />, label: "Sticky" },
  { id: "eraser", icon: <Eraser size={20} />, label: "Eraser" },
];

const Toolbar = () => {
  const { activeTool, setActiveTool } = useCanvas();

  return (
    <div className="w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-6 gap-1">
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
    </div>
  );
};

export default Toolbar;
