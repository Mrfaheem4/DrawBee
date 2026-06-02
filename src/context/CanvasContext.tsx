import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas as FabricCanvas } from "fabric";

export type Tool = "select" | "pen" | "text" | "sticky" | "eraser";

interface CanvasContextType {
  fabricRef: React.RefObject<FabricCanvas | null>;
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export const CanvasProvider = ({ children }: { children: ReactNode }) => {
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);

  return (
    <CanvasContext.Provider
      value={{
        fabricRef,
        activeTool,
        setActiveTool,
        strokeColor,
        setStrokeColor,
        strokeWidth,
        setStrokeWidth,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used inside CanvasProvider");
  return ctx;
};
