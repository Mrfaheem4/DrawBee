import { useRef, useEffect, useState, useCallback } from "react";
import { useCanvas } from "../context/CanvasContext";

interface HSV {
  h: number;
  s: number;
  v: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = (v / 100) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v / 100 - c;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("")
    .toUpperCase()}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function hexToHsv(hex: string): HSV {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return rgbToHsv(r, g, b);
}

export default function ColorPickerPopup() {
  const { strokeColor, setStrokeColor } = useCanvas();

  const [isOpen, setIsOpen] = useState(false);
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(strokeColor));
  const [hexInput, setHexInput] = useState(strokeColor.replace("#", ""));
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  // Sync hex output to context
  useEffect(() => {
    setStrokeColor(hex);
  }, [hex, setStrokeColor]);

  // Draw gradient canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const hueRgb = hsvToRgb(hsv.h, 100, 100);

    const satGrad = ctx.createLinearGradient(0, 0, width, 0);
    satGrad.addColorStop(0, "white");
    satGrad.addColorStop(1, `rgb(${hueRgb.r}, ${hueRgb.g}, ${hueRgb.b})`);
    ctx.fillStyle = satGrad;
    ctx.fillRect(0, 0, width, height);

    const valGrad = ctx.createLinearGradient(0, 0, 0, height);
    valGrad.addColorStop(0, "rgba(255,255,255,0)");
    valGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = valGrad;
    ctx.fillRect(0, 0, width, height);
  }, [hsv.h]);

  const handleCanvasInteraction = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e as MouseEvent).clientX - rect.left;
      const y = (e as MouseEvent).clientY - rect.top;
      setHsv((prev) => ({
        ...prev,
        s: Math.max(0, Math.min(100, (x / rect.width) * 100)),
        v: Math.max(0, Math.min(100, 100 - (y / rect.height) * 100)),
      }));
    },
    [],
  );

  // Drag events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingCanvas) handleCanvasInteraction(e);
      if (isDraggingHue) {
        const slider = hueSliderRef.current;
        if (!slider) return;
        const rect = slider.getBoundingClientRect();
        const y = e.clientY - rect.top;
        setHsv((prev) => ({
          ...prev,
          h: Math.max(0, Math.min(360, (y / rect.height) * 360)),
        }));
      }
    };
    const handleMouseUp = () => {
      setIsDraggingCanvas(false);
      setIsDraggingHue(false);
    };

    if (isDraggingCanvas || isDraggingHue) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingCanvas, isDraggingHue, handleCanvasInteraction]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Hex input handler
  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (val.length === 6 && /^[0-9A-Fa-f]{6}$/.test(val)) {
      setHsv(hexToHsv("#" + val));
    }
  };

  const canvasX = (hsv.s / 100) * 100;
  const canvasY = 100 - (hsv.v / 100) * 100;
  const hueY = (hsv.h / 360) * 100;

  return (
    <div className="relative inline-block" ref={popupRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg border-2 border-gray-600 hover:border-blue-400 transition-all shadow-inner"
        style={{ backgroundColor: strokeColor }}
        title={strokeColor}
      />

      {/* Picker popup */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Color</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Picker area */}
          <div className="flex gap-3 p-4">
            {/* Gradient canvas */}
            <div className="relative flex-1 rounded-md overflow-hidden border border-gray-200">
              <canvas
                ref={canvasRef}
                width={180}
                height={180}
                className="w-full h-[180px] cursor-crosshair select-none"
                onMouseDown={(e) => {
                  setIsDraggingCanvas(true);
                  handleCanvasInteraction(e);
                }}
              />
              {/* Cursor dot */}
              <div
                className="absolute w-3.5 h-3.5 border-2 border-white rounded-full pointer-events-none"
                style={{
                  left: `${canvasX}%`,
                  top: `${canvasY}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                }}
              />
            </div>

            {/* Hue slider */}
            <div
              ref={hueSliderRef}
              className="relative w-6 h-[180px] rounded-md cursor-pointer border border-gray-200"
              style={{
                background:
                  "linear-gradient(to bottom, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)",
              }}
              onMouseDown={() => setIsDraggingHue(true)}
            >
              {/* Hue cursor */}
              <div
                className="absolute -left-1 w-8 h-2 border-2 border-white rounded pointer-events-none"
                style={{
                  top: `${hueY}%`,
                  transform: "translateY(-50%)",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 items-center px-4 py-3 border-t border-gray-100 bg-gray-50">
            {/* Color preview */}
            <div
              className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: rgbString }}
            />
            {/* Hex input */}
            <div className="flex items-center flex-1 bg-white border border-gray-200 rounded px-3 py-2 gap-1">
              <span className="text-gray-400 text-xs font-mono">#</span>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value.toUpperCase())}
                className="flex-1 outline-none text-xs font-mono text-gray-800 bg-transparent"
                maxLength={6}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
