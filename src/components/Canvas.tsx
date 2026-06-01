import { useEffect, useRef } from "react";
import { Canvas as FabricCanvas, Point } from "fabric";

const Canvas = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    let isPanning = false;
    let isSpacePressed = false;
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
      if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
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
        isSpacePressed = true;
        canvas.defaultCursor = "grab";
        canvas.renderAll();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressed = false;
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

    //Cleanup
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
