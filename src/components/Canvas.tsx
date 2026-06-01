import { useEffect, useRef } from "react";
import { Canvas as FabricCanvas, Point } from "fabric";

const Canvas = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const isSpacePressed = useRef(false); // ← useRef not let
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    const canvas = new FabricCanvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#1a1a2e",
      selection: false,
    });

    fabricRef.current = canvas;

    // Zoom with scroll wheel
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
      if (e.button === 1 || (e.button === 0 && isSpacePressed.current)) {
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!isPanning.current) return;
      const e = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      vpt[4] += e.clientX - lastPos.current.x;
      vpt[5] += e.clientY - lastPos.current.y;
      canvas.requestRenderAll();
      lastPos.current = { x: e.clientX, y: e.clientY };
    });

    canvas.on("mouse:up", () => {
      isPanning.current = false;
      if (canvas.viewportTransform) {
        canvas.setViewportTransform(canvas.viewportTransform);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        isSpacePressed.current = true; // ← actually set it
        canvas.defaultCursor = "grab";
        canvas.renderAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressed.current = false; // ← actually reset it
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

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasElRef} />
    </div>
  );
};

export default Canvas;
