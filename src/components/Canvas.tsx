import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Text, Transformer } from "react-konva";
import { useCanvas } from "../context/CanvasContext";

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  width: number;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  rotation?: number;
}

const Canvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const isSpacePressedRef = useRef(false);

  const { fabricRef, activeTool, strokeColor, strokeWidth } = useCanvas();

  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const PLACEHOLDER_TEXT = "Type here...";

  // Auto-resize textarea when text changes
  useEffect(() => {
    if (editingId && textAreaRef.current) {
      textAreaRef.current.style.width = "auto";
      textAreaRef.current.style.width = `${textAreaRef.current.scrollWidth}px`;
    }
  }, [texts, editingId]);

  useEffect(() => {
    if (fabricRef && stageRef.current) fabricRef.current = stageRef.current;
  }, [fabricRef]);

  useEffect(() => {
    if (transformerRef.current) {
      if (selectedId) {
        const node = stageRef.current.findOne("#" + selectedId);
        if (node) {
          transformerRef.current.nodes([node]);
          transformerRef.current.getLayer().batchDraw();
        }
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, texts]);

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

  const handleMouseDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
      setEditingId(null);
    }

    const stage = e.target.getStage();
    const clientPointer = stage.getPointerPosition();
    const transformPointer = {
      x: (clientPointer.x - position.x) / scale,
      y: (clientPointer.y - position.y) / scale,
    };

    if (isSpacePressedRef.current || e.evt.button === 1) {
      isPanning.current = true;
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (activeTool === "text" && e.target === stage) {
      const id = Math.random().toString(36).substring(2, 9);
      setTexts([
        ...texts,
        {
          id,
          text: "",
          x: transformPointer.x,
          y: transformPointer.y,
          color: strokeColor,
          rotation: 0,
        },
      ]);
      setSelectedId(id);
      setEditingId(id);
      return;
    }

    if (activeTool === "select" && e.target.className === "Text") {
      setSelectedId(e.target.id());
      return;
    }

    isDrawing.current = true;
    setLines([
      ...lines,
      {
        tool: activeTool,
        points: [transformPointer.x, transformPointer.y],
        color: strokeColor,
        width: strokeWidth,
      },
    ]);
  };

  const handleMouseMove = (e: any) => {
    if (isPanning.current) {
      const dx = e.evt.clientX - lastPosRef.current.x;
      const dy = e.evt.clientY - lastPosRef.current.y;
      setPosition({ x: position.x + dx, y: position.y + dy });
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const clientPointer = stage.getPointerPosition();
    const transformPointer = {
      x: (clientPointer.x - position.x) / scale,
      y: (clientPointer.y - position.y) / scale,
    };
    const lastLine = { ...lines[lines.length - 1] };
    lastLine.points = lastLine.points.concat([
      transformPointer.x,
      transformPointer.y,
    ]);
    setLines(lines.slice(0, -1).concat(lastLine));
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    isPanning.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white relative overflow-hidden"
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        ref={stageRef}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.tool === "eraser" ? "#ffffff" : line.color}
              strokeWidth={line.tool === "eraser" ? 30 : line.width}
              lineCap="round"
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          ))}
          {texts.map((t) => (
            <Text
              key={t.id}
              id={t.id}
              text={t.text || PLACEHOLDER_TEXT}
              x={t.x}
              y={t.y}
              fontSize={22}
              fill={t.text ? t.color : "#cccccc"}
              visible={editingId !== t.id}
              draggable={activeTool === "select"}
              onDblClick={() => setEditingId(t.id)}
              onClick={() => setSelectedId(t.id)}
              onDragEnd={(e) =>
                setTexts(
                  texts.map((txt) =>
                    txt.id === t.id
                      ? { ...txt, x: e.target.x(), y: e.target.y() }
                      : txt,
                  ),
                )
              }
            />
          ))}
          {selectedId && <Transformer ref={transformerRef} />}
        </Layer>
      </Stage>

      {editingId &&
        (() => {
          const t = texts.find((txt) => txt.id === editingId)!;
          return (
            <textarea
              ref={textAreaRef}
              autoFocus
              value={t.text}
              onChange={(e) =>
                setTexts(
                  texts.map((txt) =>
                    txt.id === editingId
                      ? { ...txt, text: e.target.value }
                      : txt,
                  ),
                )
              }
              onBlur={() => setEditingId(null)}
              style={{
                position: "absolute",
                top: position.y + t.y * scale,
                left: position.x + t.x * scale,
                fontSize: `${22 * scale}px`,
                color: t.color,
                background: "none",
                border: "none",
                outline: "none",
                padding: 0,
                margin: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                fontFamily: "sans-serif",
              }}
            />
          );
        })()}
    </div>
  );
};

export default Canvas;
