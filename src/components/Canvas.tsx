import { useEffect, useRef } from "react";
import { Canvas as FabricCanvas, Point, PencilBrush, IText } from "fabric";
import { useCanvas, type Tool } from "../context/CanvasContext";
import { EraserBrush } from "@erase2d/fabric";

const Canvas = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fabricRef, activeTool } = useCanvas();
  const mouseDownRef = useRef<((opt: any) => void) | null>(null);
  const activeToolRef = useRef<Tool>(activeTool);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Sync activeTool state with a ref to avoid stale closure scopes inside the listeners
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Main Canvas Setup Loop
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

    // FIX: Automatically mark all paths added to the canvas as erasable
    canvas.on("object:added", (options) => {
      if (options.target) {
        options.target.set({ erasable: true });
      }
    });

    canvas.renderAll();

    // Zoom Handling
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.1), 10);
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Global Mouse Down Listener
    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent;

      // FIX: If the user is editing text, do NOT trigger mouse-down panning mechanics
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj instanceof IText && activeObj.isEditing) {
        return;
      }

      if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };

        // Temporarily disable drawing tools while panning active
        canvas.isDrawingMode = false;
        canvas.discardActiveObject();
        canvas.requestRenderAll();

        opt.e.stopPropagation();
        opt.e.preventDefault();
      }
    });

    // Global Mouse Move Panning Logic
    canvas.on("mouse:move", (opt) => {
      if (!isPanningRef.current) return;
      opt.e.stopPropagation();
      opt.e.preventDefault();

      const e = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      vpt[4] += e.clientX - lastPosRef.current.x;
      vpt[5] += e.clientY - lastPosRef.current.y;

      // Safely reset view matrix bounds
      canvas.setViewportTransform(vpt);

      lastPosRef.current = { x: e.clientX, y: e.clientY };
    });

    // Global Mouse Up
    canvas.on("mouse:up", () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;

        // Restore drawing state cleanly back to active brushes
        if (
          activeToolRef.current === "pen" ||
          activeToolRef.current === "eraser"
        ) {
          canvas.isDrawingMode = true;
        }
      }
    });

    // Keyboard Spacebar Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeObj = canvas.getActiveObject();
        const isTyping =
          activeObj && activeObj instanceof IText && activeObj.isEditing;

        if (isTyping) {
          // Allow space to be typed normally inside text boxes without firing pan mode
          return;
        }

        e.preventDefault();
        isSpacePressedRef.current = true;
        canvas.defaultCursor = "grab";

        if (canvas.isDrawingMode) {
          canvas.isDrawingMode = false;
        }
        canvas.renderAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeObj = canvas.getActiveObject();
        const isTyping =
          activeObj && activeObj instanceof IText && activeObj.isEditing;

        if (isTyping) {
          return;
        }

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

    // Responsive Window Resize Handler
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

  // Reactive Effect Block for Tool Selection Swapping Actions
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Detach any existing tool-specific clicks cleanly
    if (mouseDownRef.current) {
      canvas.off("mouse:down", mouseDownRef.current);
      mouseDownRef.current = null;
    }

    // Mode 1: Select/Transform Arrow Mode
    if (activeTool === "select") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });

      // Mode 2: Drawing Pencil Brush Mode
    } else if (activeTool === "pen") {
      canvas.isDrawingMode = !isSpacePressedRef.current;
      canvas.selection = false;

      const brush = new PencilBrush(canvas);
      brush.color = "#000000";
      brush.width = 3;

      canvas.freeDrawingBrush = brush;
      canvas.defaultCursor = "crosshair";

      // Mode 3: Interactive Text Field Mode
    } else if (activeTool === "text") {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "text";

      const handleTextClick = (opt: any) => {
        if (isSpacePressedRef.current || isPanningRef.current) return;
        const e = opt.e as MouseEvent;
        if (e.button !== 0) return;

        // FIX: Check if an object is already actively being edited
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj instanceof IText && activeObj.isEditing) {
          return;
        }

        // Check if clicking on existing text to edit it
        const clickedObject = opt.target;
        if (clickedObject && clickedObject instanceof IText) {
          canvas.setActiveObject(clickedObject);
          clickedObject.enterEditing();
          clickedObject.selectAll();
          canvas.requestRenderAll();
          return;
        }

        // Create new text box if no text clicked
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
          fill: "#000000",
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

      // Mode 4: @erase2d/fabric Dynamic Eraser Mode
    } else if (activeTool === "eraser") {
      canvas.isDrawingMode = !isSpacePressedRef.current;
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";

      // Initialize the customized eraser logic extension safely
      const eraser = new EraserBrush(canvas);
      eraser.width = 20;

      canvas.freeDrawingBrush = eraser;

      // Fallback/Default Tool Catch
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
  }, [activeTool]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasElRef} />
    </div>
  );
};

export default Canvas;
