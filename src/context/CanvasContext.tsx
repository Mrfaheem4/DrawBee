import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Canvas as FabricCanvas } from "fabric";

export type Tool =
  | "select"
  | "pen"
  | "rect"
  | "circle"
  | "line"
  | "text"
  | "sticky"
  | "eraser";

interface CanvasContextType {
  fabricRef: React.RefObject<FabricCanvas | null>;
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export const CanvasProvider = ({ children }: { children: ReactNode }) => {
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");

  return (
    <CanvasContext.Provider value={{ fabricRef, activeTool, setActiveTool }}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used inside CanvasProvider");
  return ctx;
};
