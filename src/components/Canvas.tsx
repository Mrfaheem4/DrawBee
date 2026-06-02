import { useEffect, useRef } from "react";
import { Canvas as FabricCanvas, Point, PencilBrush, IText } from "fabric";
import { useCanvas, type Tool } from "../context/CanvasContext";
import { EraserBrush } from "@erase2d/fabric";

const Canvas = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fabricRef, activeTool, strokeColor, strokeWidth } = useCanvas();

  const mouseDownRef = useRef<((opt: any) => void) | null>(null);
  const activeToolRef = useRef<Tool>(activeTool);
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Sync refs to latest values
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    strokeColorRef.current = strokeColor;
    strokeWidthRef.current = strokeWidth;
  }, [strokeColor, strokeWidth]);

  // Main Canvas Setup
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    const canvas = new FabricCanvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      selection: false,
    });

    fabricRef.current = canvas;

    canvas.on("object:added", (options) => {
      const target = options.target;
      if (!target) return;
      // Skip internal eraser objects to prevent flash
      if (
        target.type === "eraser" ||
        (target as any).isEraser ||
        (target as any)._isErasing
      )
        return;
      target.set({ erasable: true });
    });

    // Force clean render after erase commits
    canvas.on("erasing:end" as any, () => {
      canvas.requestRenderAll();
    });

    canvas.renderAll();

    canvas.on("mouse:wheel", (opt) => {
      // Don't zoom while erasing
      if (activeToolRef.current === "eraser" && canvas.isDrawingMode) {
        opt.e.preventDefault();
        opt.e.stopPropagation();
        return;
      }

      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.95 ** delta;
      zoom = Math.min(Math.max(zoom, 0.1), 10);
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Mouse Down
    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent;

      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj instanceof IText && activeObj.isEditing) {
        return;
      }

      if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        canvas.isDrawingMode = false;
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        opt.e.stopPropagation();
        opt.e.preventDefault();
      }
    });

    // Mouse Move — panning
    canvas.on("mouse:move", (opt) => {
      if (!isPanningRef.current) return;
      opt.e.stopPropagation();
      opt.e.preventDefault();

      const e = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      vpt[4] += e.clientX - lastPosRef.current.x;
      vpt[5] += e.clientY - lastPosRef.current.y;
      canvas.setViewportTransform(vpt);
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    });

    // Mouse Up
    canvas.on("mouse:up", () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        if (
          activeToolRef.current === "pen" ||
          activeToolRef.current === "eraser"
        ) {
          canvas.isDrawingMode = true;
        }
      }
    });

    // Keyboard
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeObj = canvas.getActiveObject();
        const isTyping =
          activeObj && activeObj instanceof IText && activeObj.isEditing;
        if (isTyping) return;

        e.preventDefault();
        isSpacePressedRef.current = true;
        canvas.defaultCursor = "grab";
        if (canvas.isDrawingMode) canvas.isDrawingMode = false;
        canvas.renderAll();
      }

      // Delete selected object
      if (e.code === "Delete" || e.code === "Backspace") {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj instanceof IText && activeObj.isEditing)
          return;
        if (activeObj) {
          canvas.remove(activeObj);
          canvas.requestRenderAll();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeObj = canvas.getActiveObject();
        const isTyping =
          activeObj && activeObj instanceof IText && activeObj.isEditing;
        if (isTyping) return;

        isSpacePressedRef.current = false;
        isPanningRef.current = false;

        if (activeToolRef.current === "select") {
          canvas.defaultCursor = "default";
        } else if (activeToolRef.current === "text") {
          canvas.defaultCursor = "text";
        } else {
          canvas.defaultCursor = "crosshair";
        }

        if (
          activeToolRef.current === "pen" ||
          activeToolRef.current === "eraser"
        ) {
          canvas.isDrawingMode = true;
        }
        canvas.renderAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Resize
    const handleResize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.setDimensions({ width, height });
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.dispose();
    };
  }, []);

  // Tool switching
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (mouseDownRef.current) {
      canvas.off("mouse:down", mouseDownRef.current);
      mouseDownRef.current = null;
    }

    if (activeTool === "select") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else if (activeTool === "pen") {
      canvas.isDrawingMode = !isSpacePressedRef.current;
      canvas.selection = false;

      const brush = new PencilBrush(canvas);
      brush.color = strokeColorRef.current;
      brush.width = strokeWidthRef.current;
      canvas.freeDrawingBrush = brush;
      canvas.defaultCursor = "crosshair";
    } else if (activeTool === "text") {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "text";

      const handleTextClick = (opt: any) => {
        if (isSpacePressedRef.current || isPanningRef.current) return;
        const e = opt.e as MouseEvent;
        if (e.button !== 0) return;

        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj instanceof IText && activeObj.isEditing)
          return;

        const clickedObject = opt.target;
        if (clickedObject && clickedObject instanceof IText) {
          canvas.setActiveObject(clickedObject);
          clickedObject.enterEditing();
          clickedObject.selectAll();
          canvas.requestRenderAll();
          return;
        }

        const rect = canvasElRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const vpt = canvas.viewportTransform;
        const pointer = {
          x: (x - (vpt?.[4] || 0)) / (vpt?.[0] || 1),
          y: (y - (vpt?.[5] || 0)) / (vpt?.[3] || 1),
        };

        const text = new IText("Type here...", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: strokeColorRef.current,
          fontFamily: "sans-serif",
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.requestRenderAll();
      };

      mouseDownRef.current = handleTextClick;
      canvas.on("mouse:down", handleTextClick);
    } else if (activeTool === "eraser") {
      canvas.isDrawingMode = !isSpacePressedRef.current;
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";

      const eraser = new EraserBrush(canvas);
      eraser.width = 20;
      canvas.freeDrawingBrush = eraser;
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }

    canvas.requestRenderAll();
  }, [activeTool, strokeColor, strokeWidth]);

  // Sync color/width to active brush in real time
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !canvas.freeDrawingBrush) return;
    if (activeTool === "pen") {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;

      console.log("Color sync firing:", strokeColor, activeTool);
    }
    // eraser intentionally excluded
  }, [strokeColor, strokeWidth, activeTool]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasElRef} />
    </div>
  );
};

export default Canvas;
