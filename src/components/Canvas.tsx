import { useEffect, useRef } from "react";
import { Canvas as FabricCanvas, Point, PencilBrush, IText } from "fabric";
import { useCanvas, type Tool } from "../context/CanvasContext";

const Canvas = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fabricRef, activeTool } = useCanvas();
  const mouseDownRef = useRef<((opt: any) => void) | null>(null);
  const activeToolRef = useRef<Tool>(activeTool);
  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    let isPanning = false;
    let lastPos = { x: 0, y: 0 };

    const canvas = new FabricCanvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      selection: false,
    });

    fabricRef.current = canvas;
    canvas.renderAll();

    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.1), 10);
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on("mouse:down", (opt) => {
      const e = opt.e as MouseEvent;
      if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
        isPanning = true;
        lastPos = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!isPanning) return;
      const e = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      vpt[4] += e.clientX - lastPos.x;
      vpt[5] += e.clientY - lastPos.y;
      canvas.requestRenderAll();
      lastPos = { x: e.clientX, y: e.clientY };
    });

    canvas.on("mouse:up", () => {
      isPanning = false;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        isSpacePressedRef.current = true;
        canvas.defaultCursor = "grab";
        canvas.renderAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        canvas.defaultCursor = "default";
        canvas.renderAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

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
      canvas.isDrawingMode = true;
      canvas.selection = false;
      const brush = new PencilBrush(canvas);
      brush.color = "#000000";
      brush.width = 3;
      canvas.freeDrawingBrush = brush;
    } else if (activeTool === "text") {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "text";

      const handleTextClick = (opt: any) => {
        if (isSpacePressedRef.current) return;
        const e = opt.e as MouseEvent;
        if (e.button !== 0) return;

        const pointer = canvas.getViewportPoint(opt.e);
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
