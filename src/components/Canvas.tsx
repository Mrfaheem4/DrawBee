import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Text } from "react-konva";
import { useCanvas } from "../context/CanvasContext";

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  width: number;
}

interface TextElement {
  text: string;
  x: number;
  y: number;
  color: string;
}

const Canvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  const { fabricRef, activeTool, strokeColor, strokeWidth } = useCanvas();

  // Lean State Management (No tracking IDs needed anymore!)
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Viewport Pan Transformations & Scale Zoom States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const isSpacePressedRef = useRef(false);

  // Share stage reference with context
  useEffect(() => {
    if (fabricRef && stageRef.current) {
      fabricRef.current = stageRef.current;
    }
  }, [fabricRef]);

  // Handle Container Resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard Event Management for Spacebar Panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === "INPUT") return;

        e.preventDefault();
        isSpacePressedRef.current = true;
        if (stageRef.current)
          stageRef.current.container().style.cursor = "grab";
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        if (stageRef.current) {
          stageRef.current.container().style.cursor =
            activeTool === "text" ? "text" : "crosshair";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeTool]);

  // Sync cursor appearance based on tool choice
  useEffect(() => {
    if (!stageRef.current) return;
    const container = stageRef.current.container();
    if (isSpacePressedRef.current) {
      container.style.cursor = "grab";
    } else {
      container.style.cursor = activeTool === "text" ? "text" : "crosshair";
    }
  }, [activeTool]);

  // Mouse Input Loops
  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const clientPointer = stage.getPointerPosition();

    const transformPointer = {
      x: (clientPointer.x - position.x) / scale,
      y: (clientPointer.y - position.y) / scale,
    };

    // 1. Panning with Spacebar or Middle Mouse Click
    if (isSpacePressedRef.current || e.evt.button === 1) {
      isPanning.current = true;
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      stage.container().style.cursor = "grabbing";
      return;
    }

    // 2. Text Tool Drop
    if (activeTool === "text") {
      if (e.target !== stage) return;
      const newText: TextElement = {
        text: "Type here...",
        x: transformPointer.x,
        y: transformPointer.y,
        color: strokeColor,
      };
      setTexts([...texts, newText]);
      return;
    }

    // 3. Drawing and Erasing
    isDrawing.current = true;
    const newLine: DrawingLine = {
      tool: activeTool,
      points: [transformPointer.x, transformPointer.y],
      color: strokeColor,
      width: strokeWidth,
    };
    setLines([...lines, newLine]);
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();

    if (isPanning.current) {
      const dx = e.evt.clientX - lastPosRef.current.x;
      const dy = e.evt.clientY - lastPosRef.current.y;
      setPosition({ x: position.x + dx, y: position.y + dy });
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (!isDrawing.current) return;

    const clientPointer = stage.getPointerPosition();
    const transformPointer = {
      x: (clientPointer.x - position.x) / scale,
      y: (clientPointer.y - position.y) / scale,
    };

    const lastLine = { ...lines[lines.length - 1] };
    if (!lastLine) return;

    lastLine.points = lastLine.points.concat([
      transformPointer.x,
      transformPointer.y,
    ]);
    setLines(lines.slice(0, -1).concat(lastLine));
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    if (isPanning.current) {
      isPanning.current = false;
      if (stageRef.current) {
        stageRef.current.container().style.cursor = isSpacePressedRef.current
          ? "grab"
          : "crosshair";
      }
    }
  };

  // Canvas Viewport Zooming
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    const zoomFactor = 1.1;
    let newScale = e.evt.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;

    newScale = Math.min(Math.max(newScale, 0.1), 10);

    const mousePointTo = {
      x: (pointer.x - position.x) / scale,
      y: (pointer.y - position.y) / scale,
    };

    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    setScale(newScale);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white relative overflow-hidden select-none"
      style={{ backgroundColor: "#ffffff" }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        ref={stageRef}
      >
        {/* Everything renders inside a single layer, making the composite eraser 100% reliable */}
        <Layer clearBeforeDraw={true}>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.tool === "eraser" ? "#000000" : line.color}
              strokeWidth={line.tool === "eraser" ? 30 : line.width}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
              // Set listening to false so Konva ignores hits entirely
              listening={false}
            />
          ))}

          {texts.map((t, i) => (
            <Text
              key={i}
              text={t.text}
              x={t.x}
              y={t.y}
              fontSize={22}
              fill={t.color}
              fontFamily="sans-serif"
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
