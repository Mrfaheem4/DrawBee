import { toCanvas } from "html-to-image";

type ExportFormat = "png" | "jpeg" | "svg";

interface StickyNoteItem {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  color: string;
  rotation: number;
}

interface ExportOptions {
  format: ExportFormat;
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.MutableRefObject<any>;
  stickyNotes: StickyNoteItem[];
  lines: any[]; // Added lines to calculate full bounds
  scale: number;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Calculates the bounding box of all content in world coordinates
 */
function getFullContentBounds(stickyNotes: StickyNoteItem[], lines: any[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  // Check Sticky Notes (assuming standard size 320x300)
  stickyNotes.forEach((note) => {
    minX = Math.min(minX, note.x);
    minY = Math.min(minY, note.y);
    maxX = Math.max(maxX, note.x + 320);
    maxY = Math.max(maxY, note.y + 300);
  });

  // Check Drawing Lines
  lines.forEach((line) => {
    for (let i = 0; i < line.points.length; i += 2) {
      minX = Math.min(minX, line.points[i]);
      minY = Math.min(minY, line.points[i + 1]);
      maxX = Math.max(maxX, line.points[i]);
      maxY = Math.max(maxY, line.points[i + 1]);
    }
  });

  // Fallback if empty
  if (minX === Infinity) return { x: 0, y: 0, width: 800, height: 600 };

  // Add some padding
  const padding = 50;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

async function exportRaster(options: ExportOptions): Promise<void> {
  const { containerRef, stickyNotes, lines, format, scale, position } = options;
  const container = containerRef.current;
  if (!container) return;

  const bounds = getFullContentBounds(stickyNotes, lines);

  try {
    // We capture the container, but we override the "view" using the style property.
    // This shifts the "snapshot camera" to cover the full content bounds
    // regardless of where the user has panned or zoomed.
    const canvas = await toCanvas(container, {
      width: bounds.width * scale,
      height: bounds.height * scale,
      style: {
        // This math "un-pans" the current view and shifts to our calculated bounds
        transform: `translate(${-bounds.x * scale}px, ${-bounds.y * scale}px)`,
        transformOrigin: "top left",
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
      },
      pixelRatio: 2,
    });

    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    triggerDownload(dataUrl, `full-canvas-export.${format}`);
  } catch (err) {
    console.error("Full export failed:", err);
  }
}

export async function exportCanvas(options: ExportOptions): Promise<void> {
  if (options.format === "svg") {
    // SVG logic already handles positioning via screenX/Y calculations
    // (Ensure your SVG function uses the same 'bounds' logic if needed)
    console.warn("SVG export uses current view; use PNG for full canvas.");
  } else {
    await exportRaster(options);
  }
}
