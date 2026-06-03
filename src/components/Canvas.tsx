import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Text,
  Transformer,
  Rect,
  Group,
} from "react-konva";
import { useCanvas } from "../context/CanvasContext";

interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  width: number;
}

interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  color: string;
  rotation: number;
}

const FONT_SIZE = 18;
const FONT_FAMILY = "sans-serif";
const MIN_WIDTH = 150;
const PADDING = 8;

const Canvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const isSpacePressedRef = useRef(false);

  // Keep latest values in refs to avoid stale closures in handlers
  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 0, y: 0 });
  const strokeColorRef = useRef("#000000");
  const strokeWidthRef = useRef(3);
  const activeToolRef = useRef("pen");

  const { fabricRef, activeTool, strokeColor, strokeWidth } = useCanvas();

  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Sync refs with latest state/props
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    strokeColorRef.current = strokeColor;
  }, [strokeColor]);
  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Sync fabricRef
  useEffect(() => {
    if (fabricRef && stageRef.current) fabricRef.current = stageRef.current;
  }, [fabricRef]);

  // Container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const rect = containerRef.current!.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    });
    ro.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
    return () => ro.disconnect();
  }, []);

  // Spacebar
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpacePressedRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        isPanning.current = false;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Transformer sync
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedId && !editingId) {
      const node = stageRef.current?.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
      }
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, editingId, textBoxes]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingId && textAreaRef.current) {
      setTimeout(() => {
        textAreaRef.current?.focus();
        autoResize();
      }, 0);
    }
  }, [editingId]);

  const autoResize = () => {
    const ta = textAreaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };

  // Convert screen coords → world coords
  const toWorld = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.container().getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - positionRef.current.x) / scaleRef.current,
      y: (sy - positionRef.current.y) / scaleRef.current,
    };
  };

  // Convert world coords → screen coords (relative to container)
  const toScreen = (worldX: number, worldY: number) => {
    return {
      x: worldX * scaleRef.current + positionRef.current.x,
      y: worldY * scaleRef.current + positionRef.current.y,
    };
  };

  const handleStageMouseDown = (e: any) => {
    const stage = stageRef.current;
    const onBackground = e.target === stage;

    // Pan
    if (isSpacePressedRef.current || e.evt.button === 1) {
      isPanning.current = true;
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    const tool = activeToolRef.current;

    // Text tool — place new textbox
    if (tool === "text" && onBackground) {
      const world = toWorld(e.evt.clientX, e.evt.clientY);
      const id = `tb_${Date.now()}`;
      setTextBoxes((prev) => [
        ...prev,
        {
          id,
          text: "",
          x: world.x,
          y: world.y,
          width: MIN_WIDTH,
          color: strokeColorRef.current,
          rotation: 0,
        },
      ]);
      // Use timeout so state settles before setting editingId
      setTimeout(() => {
        setEditingId(id);
        setSelectedId(null);
      }, 0);
      return;
    }

    // Deselect on background click
    if (onBackground) {
      setSelectedId(null);
      setEditingId(null);
    }

    // Draw
    if (tool !== "select" && tool !== "text") {
      const world = toWorld(e.evt.clientX, e.evt.clientY);
      isDrawing.current = true;
      setLines((prev) => [
        ...prev,
        {
          tool,
          points: [world.x, world.y],
          color: strokeColorRef.current,
          width: strokeWidthRef.current,
        },
      ]);
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (isPanning.current) {
      const dx = e.evt.clientX - lastPosRef.current.x;
      const dy = e.evt.clientY - lastPosRef.current.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    if (!isDrawing.current) return;
    const world = toWorld(e.evt.clientX, e.evt.clientY);
    setLines((prev) => {
      const last = { ...prev[prev.length - 1] };
      last.points = [...last.points, world.x, world.y];
      return [...prev.slice(0, -1), last];
    });
  };

  const handleStageMouseUp = () => {
    isDrawing.current = false;
    isPanning.current = false;
  };

  const handleTransformEnd = (e: any, id: string) => {
    const node = e.target;
    const newWidth = Math.max(node.width() * node.scaleX(), MIN_WIDTH);
    node.scaleX(1);
    node.scaleY(1);
    setTextBoxes((prev) =>
      prev.map((tb) =>
        tb.id === id
          ? {
              ...tb,
              x: node.x(),
              y: node.y(),
              width: newWidth,
              rotation: node.rotation(),
            }
          : tb,
      ),
    );
  };

  const handleDragEnd = (e: any, id: string) => {
    setTextBoxes((prev) =>
      prev.map((tb) =>
        tb.id === id ? { ...tb, x: e.target.x(), y: e.target.y() } : tb,
      ),
    );
  };

  const commitEdit = () => {
    setTextBoxes((prev) =>
      prev.filter((tb) => tb.id !== editingId || tb.text.trim() !== ""),
    );
    setEditingId(null);
  };

  const editingBox = textBoxes.find((tb) => tb.id === editingId) ?? null;

  // Screen position of the textarea
  const textareaScreen = editingBox
    ? toScreen(editingBox.x, editingBox.y)
    : null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white relative overflow-hidden"
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.tool === "eraser" ? "#ffffff" : line.color}
              strokeWidth={line.tool === "eraser" ? 30 : line.width}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          ))}

          {textBoxes.map((tb) => {
            const isEditing = editingId === tb.id;
            const isSelected = selectedId === tb.id;
            const lineCount = Math.max((tb.text || " ").split("\n").length, 1);
            const boxHeight = lineCount * FONT_SIZE * 1.4 + PADDING * 2;

            return (
              <Group
                key={tb.id}
                id={tb.id}
                x={tb.x}
                y={tb.y}
                rotation={tb.rotation}
                draggable={activeTool === "select" && !isEditing}
                onClick={() => activeTool === "select" && setSelectedId(tb.id)}
                onDblClick={() => {
                  setEditingId(tb.id);
                  setSelectedId(null);
                }}
                onDragEnd={(e) => handleDragEnd(e, tb.id)}
                onTransformEnd={(e) => handleTransformEnd(e, tb.id)}
              >
                <Rect
                  width={tb.width}
                  height={boxHeight}
                  fill={isEditing ? "rgba(255,255,255,0.01)" : "transparent"}
                  stroke={isSelected && !isEditing ? "#3b82f6" : "transparent"}
                  strokeWidth={1}
                  dash={isEditing ? [4, 3] : undefined}
                  cornerRadius={3}
                />
                <Text
                  text={isEditing ? "" : tb.text || "Type here..."}
                  x={PADDING}
                  y={PADDING}
                  width={tb.width - PADDING * 2}
                  fontSize={FONT_SIZE}
                  fontFamily={FONT_FAMILY}
                  fill={tb.text ? tb.color : "#aaaaaa"}
                  wrap="word"
                  lineHeight={1.4}
                />
              </Group>
            );
          })}

          <Transformer
            ref={transformerRef}
            enabledAnchors={["middle-left", "middle-right"]}
            rotateEnabled
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < MIN_WIDTH ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>

      {/* Floating textarea — shown while editing */}
      {editingBox && textareaScreen && (
        <textarea
          key={editingId}
          ref={textAreaRef}
          value={editingBox.text}
          onChange={(e) => {
            setTextBoxes((prev) =>
              prev.map((tb) =>
                tb.id === editingId ? { ...tb, text: e.target.value } : tb,
              ),
            );
            autoResize();
          }}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") commitEdit();
          }}
          className="absolute outline-none border border-dashed border-blue-400 bg-transparent resize-none overflow-hidden p-0 m-0"
          style={{
            top: textareaScreen.y + PADDING * scale,
            left: textareaScreen.x + PADDING * scale,
            width: (editingBox.width - PADDING * 2) * scale,
            minHeight: FONT_SIZE * scale * 1.4,
            fontSize: FONT_SIZE * scale,
            fontFamily: FONT_FAMILY,
            lineHeight: 1.4,
            color: editingBox.color,
            caretColor: editingBox.color,
            transform: `rotate(${editingBox.rotation}deg)`,
            transformOrigin: "top left",
          }}
        />
      )}
    </div>
  );
};

export default Canvas;
