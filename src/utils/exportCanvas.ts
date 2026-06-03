import { toCanvas } from "html-to-image";

export type ExportFormat = "png" | "jpeg" | "svg";

interface Point {
  x: number;
  y: number;
}

interface StickyNoteItem {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  color: string;
  rotation: number;
}

interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
}

interface ExportOptions {
  format: ExportFormat;
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.MutableRefObject<any>;
  stickyNotes: StickyNoteItem[];
  lines: any[];
  textBoxes: any[];
  scale: number;
  position: Point;
  dimensions: { width: number; height: number };
  setScale: (s: number) => void;
  setPosition: (p: Point) => void;
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function getContentBounds(
  stickyNotes: StickyNoteItem[],
  lines: any[],
  textBoxes: any[],
) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  stickyNotes.forEach((note) => {
    minX = Math.min(minX, note.x);
    minY = Math.min(minY, note.y);
    maxX = Math.max(maxX, note.x + 320);
    maxY = Math.max(maxY, note.y + 300);
  });

  lines.forEach((line) => {
    for (let i = 0; i < line.points.length; i += 2) {
      minX = Math.min(minX, line.points[i]);
      minY = Math.min(minY, line.points[i + 1]);
      maxX = Math.max(maxX, line.points[i]);
      maxY = Math.max(maxY, line.points[i + 1]);
    }
  });

  textBoxes.forEach((tb) => {
    minX = Math.min(minX, tb.x);
    minY = Math.min(minY, tb.y);
    maxX = Math.max(maxX, tb.x + tb.width);
    maxY = Math.max(maxY, tb.y + 100);
  });

  if (minX === Infinity) return { x: 0, y: 0, width: 800, height: 600 };

  const padding = 60;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export async function exportCanvas(options: ExportOptions): Promise<void> {
  const {
    format,
    containerRef,
    stageRef,
    stickyNotes,
    lines,
    textBoxes,
    scale,
    position,
    setScale,
    setPosition,
  } = options;

  const container = containerRef.current;
  const stage = stageRef.current;
  if (!container || !stage) return;

  const bounds = getContentBounds(stickyNotes, lines, textBoxes);

  // Save container's original styles
  const prevWidth = container.style.width;
  const prevHeight = container.style.height;
  const prevOverflow = container.style.overflow;

  // Reset stage to 1:1 world coords, shifted so content starts at (0,0)
  setScale(1);
  setPosition({ x: -bounds.x, y: -bounds.y });

  // Resize container to fit full content bounds
  container.style.width = `${bounds.width}px`;
  container.style.height = `${bounds.height}px`;
  container.style.overflow = "visible";
  stage.width(bounds.width);
  stage.height(bounds.height);
  stage.batchDraw();

  // Wait for React + browser to apply all changes
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );

  try {
    const canvas = await toCanvas(container, {
      width: bounds.width,
      height: bounds.height,
      canvasWidth: bounds.width,
      canvasHeight: bounds.height,
      pixelRatio: 2,
      skipFonts: false,
    });

    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    triggerDownload(dataUrl, `canvas-export.${format}`);
  } catch (err) {
    console.error("Export failed:", err);
  } finally {
    // Restore everything
    container.style.width = prevWidth;
    container.style.height = prevHeight;
    container.style.overflow = prevOverflow;
    stage.width(options.dimensions.width);
    stage.height(options.dimensions.height);
    stage.batchDraw();
    setScale(scale);
    setPosition(position);
  }
}
