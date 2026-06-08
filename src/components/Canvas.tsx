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
import StickyNote from "./StickyNote";
import { exportCanvas } from "../utils/exportCanvas";
import {
  type DrawingLine,
  type TextBox,
  type StickyNoteItem,
} from "../hooks/useWhiteboard";
import Toolbar from "./ToolBar";

const FONT_SIZE = 18;
const FONT_FAMILY = "sans-serif";
const MIN_WIDTH = 150;
const PADDING = 8;
const DRAG_THRESHOLD = 5;

interface CanvasProps {
  lines: DrawingLine[];
  setLines: React.Dispatch<React.SetStateAction<DrawingLine[]>>;
  textBoxes: TextBox[];
  setTextBoxes: React.Dispatch<React.SetStateAction<TextBox[]>>;
  stickyNotes: StickyNoteItem[];
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNoteItem[]>>;
  pushHistory: (
    newLines: DrawingLine[],
    newTextBoxes: TextBox[],
    newStickyNotes: StickyNoteItem[],
  ) => void;
  dbAddLine: (line: DrawingLine) => Promise<string | null>;
  dbDeleteLine: (id: string) => Promise<void>;
  dbAddTextBox: (tb: TextBox) => Promise<void>;
  dbUpdateTextBox: (tb: TextBox) => Promise<void>;
  dbDeleteTextBox: (id: string) => Promise<void>;
  dbAddStickyNote: (note: StickyNoteItem) => Promise<void>;
  dbUpdateStickyNote: (note: StickyNoteItem) => Promise<void>;
  dbDeleteStickyNote: (id: string) => Promise<void>;
}

const Canvas = ({
  lines,
  setLines,
  textBoxes,
  setTextBoxes,
  stickyNotes,
  setStickyNotes,
  pushHistory,
  dbAddLine,
  dbAddTextBox,
  dbUpdateTextBox,
  dbDeleteTextBox,
  dbAddStickyNote,
  dbUpdateStickyNote,
  dbDeleteStickyNote,
}: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // ── Drawing state ──────────────────────────────────────────────────────────
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const pendingLineIdRef = useRef<string | null>(null);

  // ── Always-current mirrors of props for use in async/closure contexts ──────
  const textBoxesRef = useRef<TextBox[]>(textBoxes);
  const stickyNotesRef = useRef<StickyNoteItem[]>(stickyNotes);
  useEffect(() => {
    textBoxesRef.current = textBoxes;
  }, [textBoxes]);
  useEffect(() => {
    stickyNotesRef.current = stickyNotes;
  }, [stickyNotes]);

  // ── Ref-backed tool/style state ───────────────────────────────────────────
  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 0, y: 0 });
  const strokeColorRef = useRef("#000000");
  const strokeWidthRef = useRef(3);
  const activeToolRef = useRef("pen");
  const isUsingStylus = useRef(false);
  const stylusTimeoutRef = useRef<any>(null);

  const savedTextBoxIds = useRef<Set<string>>(new Set());

  const { fabricRef, activeTool, strokeColor, strokeWidth } = useCanvas();

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    if (fabricRef && stageRef.current) fabricRef.current = stageRef.current;
  }, [fabricRef]);

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    });
    ro.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
    return () => ro.disconnect();
  }, []);

  // ── Transformer sync ───────────────────────────────────────────────────────
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

  // ── Auto-focus textarea when editing starts ────────────────────────────────
  useEffect(() => {
    if (editingId && textAreaRef.current) {
      const id = setTimeout(() => {
        textAreaRef.current?.focus();
        autoResize();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [editingId]);

  // ── Keyboard delete ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;

      // Check if any note is in edit mode
      const isAnyNoteEditing = stickyNotesRef.current.some((n) => n.isEditing);

      // If we are editing a Konva TextBox (editingId exists) or a StickyNote (isAnyNoteEditing),
      // or if focus is in a real input field, completely abort the deletion logic.
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (editingId || isAnyNoteEditing || isInputFocused) {
        return;
      }

      // If nothing is being edited, we can proceed with deletion of selected items
      if (selectedId) {
        // Try deleting a textbox
        const textBoxToDelete = textBoxesRef.current.find(
          (tb) => tb.id === selectedId,
        );
        if (textBoxToDelete) {
          const newTextBoxes = textBoxesRef.current.filter(
            (tb) => tb.id !== selectedId,
          );
          setTextBoxes(newTextBoxes);
          pushHistory(lines, newTextBoxes, stickyNotesRef.current);
          await dbDeleteTextBox(selectedId);
          savedTextBoxIds.current.delete(selectedId);
          setSelectedId(null);
          return;
        }

        // Try deleting a sticky note
        const noteToDelete = stickyNotesRef.current.find(
          (n) => n.id === selectedId,
        );
        if (noteToDelete) {
          const newNotes = stickyNotesRef.current.filter(
            (n) => n.id !== selectedId,
          );
          setStickyNotes(newNotes);
          pushHistory(lines, textBoxesRef.current, newNotes);
          await dbDeleteStickyNote(selectedId);
          setSelectedId(null);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedId,
    editingId,
    lines,
    setTextBoxes,
    setStickyNotes,
    pushHistory,
    dbDeleteTextBox,
    dbDeleteStickyNote,
  ]);

  // Exit sticky-note edit mode when clicking anywhere outside a note
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const editingNote = stickyNotesRef.current.find((n) => n.isEditing);
      if (!editingNote) return;
      const noteEl = (e.target as HTMLElement).closest("[data-note-id]");
      if (noteEl && noteEl.getAttribute("data-note-id") === editingNote.id)
        return;
      setStickyNotes((prev) => prev.map((n) => ({ ...n, isEditing: false })));
    };
    window.addEventListener("mousedown", handleGlobalMouseDown);
    return () => window.removeEventListener("mousedown", handleGlobalMouseDown);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const autoResize = () => {
    const ta = textAreaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const toWorld = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.container().getBoundingClientRect();
    return {
      x: (clientX - rect.left - positionRef.current.x) / scaleRef.current,
      y: (clientY - rect.top - positionRef.current.y) / scaleRef.current,
    };
  };

  const toScreen = (worldX: number, worldY: number) => ({
    x: worldX * scaleRef.current + positionRef.current.x,
    y: worldY * scaleRef.current + positionRef.current.y,
  });

  const handleExport = async (format: "png" | "jpeg" | "svg") => {
    await exportCanvas({
      format,
      containerRef,
      stageRef,
      stickyNotes,
      lines,
      textBoxes,
      scale,
      position,
      dimensions,
      setScale,
      setPosition,
    });
  };

  const commitStroke = async () => {
    const localId = pendingLineIdRef.current;
    if (!localId) return;
    pendingLineIdRef.current = null;

    let finishedLine: DrawingLine | null = null;
    setLines((prev) => {
      finishedLine = prev.find((l) => l.id === localId) ?? null;
      return prev;
    });

    if (!finishedLine) return;

    const dbId = await dbAddLine(finishedLine);
    if (!dbId) return;

    setLines((prev) => {
      const updated = prev.map((l) =>
        l.id === localId ? { ...l, id: dbId } : l,
      );
      pushHistory(updated, textBoxesRef.current, stickyNotesRef.current);
      return updated;
    });
  };

  // ── Stage mouse handlers ───────────────────────────────────────────────────
  const handleStageMouseDown = (e: any) => {
    if (e.evt.pointerType && e.evt.pointerType !== "mouse") {
      isUsingStylus.current = true;
      return;
    }
    if (isUsingStylus.current) return;

    const stage = stageRef.current;
    const onBackground = e.target === stage;
    const tool = activeToolRef.current;

    if (e.evt.button === 1 || (tool === "select" && onBackground)) {
      isPanning.current = true;
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (tool === "sticky" && onBackground) {
      const world = toWorld(e.evt.clientX, e.evt.clientY);
      const id = `sticky_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newNote: StickyNoteItem = {
        id,
        x: world.x,
        y: world.y,
        title: "Quick Note",
        content: "",
        color: "yellow",
        rotation: 0,
        isEditing: false,
      };
      setStickyNotes((prev) => {
        const next = [...prev, newNote];
        pushHistory(lines, textBoxesRef.current, next);
        return next;
      });
      dbAddStickyNote(newNote);
      return;
    }

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
      setTimeout(() => {
        setEditingId(id);
        setSelectedId(null);
      }, 0);
      return;
    }

    if (onBackground) {
      setSelectedId(null);
      setEditingId(null);
      setStickyNotes((prev) => prev.map((n) => ({ ...n, isEditing: false })));
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (isUsingStylus.current) return;

    if (isPanning.current) {
      const dx = e.evt.clientX - lastPosRef.current.x;
      const dy = e.evt.clientY - lastPosRef.current.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (!isDrawing.current || !pendingLineIdRef.current) return;
    const world = toWorld(e.evt.clientX, e.evt.clientY);
    const activeId = pendingLineIdRef.current;
    setLines((prev) =>
      prev.map((l) =>
        l.id === activeId
          ? { ...l, points: [...l.points, world.x, world.y] }
          : l,
      ),
    );
  };

  const handleStageMouseUp = async () => {
    if (isUsingStylus.current) return;
    isPanning.current = false;
    if (isDrawing.current) {
      isDrawing.current = false;
      await commitStroke();
    }
  };

  // ── Touch handlers ─────────────────────────────────────────────────────────
  const handleTouchStart = (e: any) => {
    e.evt.preventDefault();
    if (stylusTimeoutRef.current) {
      clearTimeout(stylusTimeoutRef.current);
      stylusTimeoutRef.current = null;
    }

    isDrawing.current = false;
    isPanning.current = false;
    isUsingStylus.current = true;

    const touch = e.evt.touches[0];
    const stage = stageRef.current;
    const onBackground = e.target === stage;
    const tool = activeToolRef.current;

    if (tool === "select" && onBackground) {
      isPanning.current = true;
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };
      return;
    }

    if (tool !== "select" && tool !== "text" && tool !== "sticky") {
      const world = toWorld(touch.clientX, touch.clientY);
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      pendingLineIdRef.current = localId;
      isDrawing.current = true;
      setLines((prev) => [
        ...prev,
        {
          id: localId,
          tool,
          points: [world.x, world.y],
          color: strokeColorRef.current,
          width: strokeWidthRef.current,
        },
      ]);
    }
  };

  const handleTouchMove = (e: any) => {
    if (isPanning.current) {
      const touch = e.evt.touches[0];
      const dx = touch.clientX - lastPosRef.current.x;
      const dy = touch.clientY - lastPosRef.current.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPosRef.current = { x: touch.clientX, y: touch.clientY };
      return;
    }

    if (!isDrawing.current || !pendingLineIdRef.current) return;
    const touch = e.evt.touches[0];
    const world = toWorld(touch.clientX, touch.clientY);
    const activeId = pendingLineIdRef.current;
    setLines((prev) =>
      prev.map((l) =>
        l.id === activeId
          ? { ...l, points: [...l.points, world.x, world.y] }
          : l,
      ),
    );
  };

  const handleTouchEnd = async () => {
    isPanning.current = false;
    if (!isDrawing.current) {
      if (stylusTimeoutRef.current) clearTimeout(stylusTimeoutRef.current);
      stylusTimeoutRef.current = setTimeout(() => {
        isUsingStylus.current = false;
        stylusTimeoutRef.current = null;
      }, 500);
      return;
    }
    isDrawing.current = false;
    await commitStroke();
    if (stylusTimeoutRef.current) clearTimeout(stylusTimeoutRef.current);
    stylusTimeoutRef.current = setTimeout(() => {
      isUsingStylus.current = false;
      stylusTimeoutRef.current = null;
    }, 500);
  };

  // ── Konva textbox handlers ─────────────────────────────────────────────────
  const handleTransformEnd = (e: any, id: string) => {
    const node = e.target;
    const newWidth = Math.max(node.width() * node.scaleX(), MIN_WIDTH);
    node.scaleX(1);
    node.scaleY(1);
    const updated = textBoxes.map((tb) =>
      tb.id === id
        ? {
            ...tb,
            x: node.x(),
            y: node.y(),
            width: newWidth,
            rotation: node.rotation(),
          }
        : tb,
    );
    setTextBoxes(updated);
    const box = updated.find((tb) => tb.id === id);
    if (box && savedTextBoxIds.current.has(id)) dbUpdateTextBox(box);
  };

  const commitEdit = async () => {
    const box = textBoxes.find((tb) => tb.id === editingId);
    const updated = textBoxes.filter(
      (tb) => tb.id !== editingId || tb.text.trim() !== "",
    );
    setTextBoxes(updated);
    pushHistory(lines, updated, stickyNotes);

    if (box) {
      if (box.text.trim() === "") {
        if (savedTextBoxIds.current.has(box.id)) {
          await dbDeleteTextBox(box.id);
          savedTextBoxIds.current.delete(box.id);
        }
      } else if (savedTextBoxIds.current.has(box.id)) {
        await dbUpdateTextBox(box);
      } else {
        await dbAddTextBox(box);
        savedTextBoxIds.current.add(box.id);
      }
    }
    setEditingId(null);
  };

  // ── Sticky note DOM handlers ───────────────────────────────────────────────
  const handleNoteMouseDown = (e: React.MouseEvent, note: StickyNoteItem) => {
    if (activeToolRef.current !== "select") return;
    e.stopPropagation();

    if (note.isEditing) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag !== "input" && tag !== "textarea") {
        setStickyNotes((prev) => prev.map((n) => ({ ...n, isEditing: false })));
        setSelectedId(note.id);
      }
      return;
    }

    setSelectedId(note.id);
    setEditingId(null);

    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX =
      (e.clientX - positionRef.current.x) / scaleRef.current - note.x;
    const offsetY =
      (e.clientY - positionRef.current.y) / scaleRef.current - note.y;
    let hasMoved = false;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      hasMoved = true;
      setStickyNotes((prev) =>
        prev.map((n) =>
          n.id === note.id
            ? {
                ...n,
                x:
                  (ev.clientX - positionRef.current.x) / scaleRef.current -
                  offsetX,
                y:
                  (ev.clientY - positionRef.current.y) / scaleRef.current -
                  offsetY,
              }
            : n,
        ),
      );
    };

    const onUp = () => {
      if (hasMoved) {
        setStickyNotes((prev) => {
          const moved = prev.find((n) => n.id === note.id);
          if (moved) dbUpdateStickyNote(moved);
          return prev;
        });
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleNoteDoubleClick = (e: React.MouseEvent, noteId: string) => {
    if (activeToolRef.current !== "select") return;
    e.stopPropagation();
    setSelectedId(null);
    setStickyNotes((prev) =>
      prev.map((n) => ({ ...n, isEditing: n.id === noteId })),
    );
  };

  const handleNoteClick = (e: React.MouseEvent) => {
    if (activeToolRef.current === "select") e.stopPropagation();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const editingBox = textBoxes.find((tb) => tb.id === editingId) ?? null;
  const textareaScreen = editingBox
    ? toScreen(editingBox.x, editingBox.y)
    : null;

  return (
    <div className="relative w-full h-full">
      <Toolbar onExport={handleExport} />
      <div
        ref={containerRef}
        className="absolute bg-white overflow-hidden"
        style={{
          left: 120,
          top: 40,
          right: 80,
          bottom: 40,
          borderRadius: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          touchAction: "none",
        }}
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            {lines.map((line) => (
              <Line
                key={line.id}
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
              const lineCount = Math.max(
                (tb.text || " ").split("\n").length,
                1,
              );
              const boxHeight = lineCount * FONT_SIZE * 1.4 + PADDING * 2;
              return (
                <Group
                  key={tb.id}
                  id={tb.id}
                  x={tb.x}
                  y={tb.y}
                  rotation={tb.rotation}
                  draggable={activeTool === "select" && !isEditing}
                  onClick={() => {
                    if (activeTool === "select") setSelectedId(tb.id);
                  }}
                  onDblClick={() => {
                    if (activeTool === "select") {
                      setEditingId(tb.id);
                      setSelectedId(null);
                    }
                  }}
                  onDragEnd={(e) => {
                    if (activeTool !== "select") return;
                    const updated = textBoxes.map((t) =>
                      t.id === tb.id
                        ? { ...t, x: e.target.x(), y: e.target.y() }
                        : t,
                    );
                    setTextBoxes(updated);
                    const box = updated.find((t) => t.id === tb.id);
                    if (box && savedTextBoxIds.current.has(tb.id))
                      dbUpdateTextBox(box);
                  }}
                  onTransformEnd={(e) => handleTransformEnd(e, tb.id)}
                >
                  <Rect
                    width={tb.width}
                    height={boxHeight}
                    fill="transparent"
                    stroke={
                      isSelected && !isEditing ? "#3b82f6" : "transparent"
                    }
                    strokeWidth={1}
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
              key="__transformer__"
              ref={transformerRef}
              enabledAnchors={["middle-left", "middle-right"]}
              rotateEnabled
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < MIN_WIDTH ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>

        {stickyNotes.map((note) => (
          <div
            key={note.id}
            data-note-id={note.id}
            className="absolute"
            style={{
              left: note.x * scale + position.x,
              top: note.y * scale + position.y,
              transformOrigin: "top left",
              transform: `scale(${scale})`,
              pointerEvents: activeTool === "select" ? "auto" : "none",
              cursor:
                activeTool === "select" && !note.isEditing ? "grab" : "default",
              userSelect: note.isEditing ? "text" : "none",
              outline: selectedId === note.id ? "2px solid #3b82f6" : "none",
              borderRadius: "8px",
            }}
            onMouseDown={(e) => handleNoteMouseDown(e, note)}
            onDoubleClick={(e) => handleNoteDoubleClick(e, note.id)}
            onClick={handleNoteClick}
          >
            <StickyNote
              initialTitle={note.title}
              initialContent={note.content}
              initialColor={note.color}
              readOnly={activeTool !== "select" || !note.isEditing}
              onUpdate={(title, content, color) => {
                setStickyNotes((prev) => {
                  const updated = prev.map((n) =>
                    n.id === note.id ? { ...n, title, content, color } : n,
                  );

                  const updatedNote = updated.find((n) => n.id === note.id);
                  if (updatedNote) {
                    dbUpdateStickyNote(updatedNote);
                  }

                  return updated;
                });
              }}
            />
          </div>
        ))}

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
              top: textareaScreen.y + PADDING,
              left: textareaScreen.x + PADDING,
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
    </div>
  );
};

export default Canvas;
