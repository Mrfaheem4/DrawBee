import React, { useState, useEffect } from "react";

export type NoteColor =
  | "yellow"
  | "blue"
  | "green"
  | "pink"
  | "orange"
  | "purple";

interface ColorConfig {
  bg: string;
  dark: string;
  pin: string;
  pinCap: string;
  pinShine: string;
}

const COLOR_MAP: Record<NoteColor, ColorConfig> = {
  yellow: {
    bg: "#fef08a",
    dark: "#eab308",
    pin: "#dc2626",
    pinCap: "#ef4444",
    pinShine: "#fca5a5",
  },
  blue: {
    bg: "#bfdbfe",
    dark: "#3b82f6",
    pin: "#1e40af",
    pinCap: "#3b82f6",
    pinShine: "#93c5fd",
  },
  green: {
    bg: "#bbf7d0",
    dark: "#22c55e",
    pin: "#15803d",
    pinCap: "#22c55e",
    pinShine: "#86efac",
  },
  pink: {
    bg: "#fbcfe8",
    dark: "#ec4899",
    pin: "#9d174d",
    pinCap: "#db2777",
    pinShine: "#f9a8d4",
  },
  orange: {
    bg: "#fed7aa",
    dark: "#f97316",
    pin: "#c2410c",
    pinCap: "#f97316",
    pinShine: "#fdba74",
  },
  purple: {
    bg: "#e9d5ff",
    dark: "#a855f7",
    pin: "#7e22ce",
    pinCap: "#a855f7",
    pinShine: "#d8b4fe",
  },
};

interface StickyNoteProps {
  initialTitle?: string;
  initialContent?: string;
  initialDate?: string;
  initialColor?: NoteColor;
  readOnly?: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  initialTitle = "Quick Note",
  initialContent = "",
  initialDate = new Date().toLocaleDateString(),
  initialColor = "yellow",
  readOnly = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [date, setDate] = useState(initialDate);
  const [color, setColor] = useState<NoteColor>(initialColor);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setRotation(Math.random() * 4 - 2);
  }, []);

  const config = COLOR_MAP[color];

  const cycleColor = () => {
    const colors = Object.keys(COLOR_MAP) as NoteColor[];
    const currentIndex = colors.indexOf(color);
    setColor(colors[(currentIndex + 1) % colors.length]);
  };

  return (
    <div style={{ width: "20rem" }}>
      <div
        className="group relative w-[20rem] min-h-[16rem] p-8 pt-12 flex flex-col rounded-2xl transition-all duration-300 ease-out  hover:-translate-y-2 hover:scale-[1.02]"
        style={{
          backgroundColor: config.bg,
          transform: `rotate(${rotation}deg)`,
          boxShadow: "10px 10px 25px rgba(0, 0, 0, 0.1)",
          cursor: readOnly ? "move" : "default",
        }}
      >
        {/* Pin — always has pointer events */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-30 drop-shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
          onClick={cycleColor}
          title="Click to change color"
          style={{ pointerEvents: "auto" }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <line
              x1="12"
              y1="16"
              x2="12"
              y2="24"
              stroke="#64748b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M7 14C7 12 9 11 12 11C15 11 17 12 17 14H7Z"
              fill={config.pin}
            />
            <path
              d="M9 6C9 6 8 11 12 11C16 11 15 6 15 6H9Z"
              fill={config.pinCap}
            />
            <circle cx="12" cy="5" r="3" fill={config.pin} />
            <circle cx="11" cy="4.5" r="1" fill={config.pinShine} />
          </svg>
        </div>

        {/* Content — pointer events blocked when readOnly */}
        <div
          className="z-10 flex flex-col flex-grow gap-4"
          style={{ pointerEvents: readOnly ? "none" : "auto" }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-2xl font-bold text-slate-800 tracking-tight border-none outline-none focus:ring-0 p-0 placeholder-slate-400/50"
            placeholder="Title"
            readOnly={readOnly}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full flex-grow bg-transparent text-base leading-relaxed text-slate-700 border-none outline-none focus:ring-0 resize-none p-0 placeholder-slate-400/50"
            placeholder="Write your note here..."
            readOnly={readOnly}
            style={{
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            }}
          />
        </div>

        {/* Footer — pointer events blocked when readOnly */}
        <div
          className="z-10 mt-4 pt-3 border-t border-black/5 flex justify-between items-center"
          style={{ pointerEvents: readOnly ? "none" : "auto" }}
        >
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-xs font-bold uppercase tracking-widest text-slate-500 border-none outline-none focus:ring-0 p-0 w-1/2"
            readOnly={readOnly}
          />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
            Tap pin to change color
          </span>
        </div>

        {/* Paper curl shadow */}
        <div
          className="absolute bottom-0 right-0 w-20 h-20 z-0 pointer-events-none transition-all duration-300 group-hover:w-24 group-hover:h-24"
          style={{
            background:
              "linear-gradient(135deg, transparent 45%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)",
            filter: "blur(4px)",
          }}
        />
        {/* Curl flap */}
        <div
          className="absolute bottom-0 right-0 w-0 h-0 border-solid pointer-events-none z-20 transition-all duration-300 group-hover:border-[0_0_4.5rem_4.5rem]"
          style={{
            borderWidth: "0 0 4rem 4rem",
            borderColor: `transparent transparent ${config.dark} transparent`,
            boxShadow: "-4px -4px 8px rgba(0,0,0,0.1)",
          }}
        />
        {/* Curl knockout */}
        <div
          className="absolute bottom-0 right-0 w-16 h-16 bg-slate-50 pointer-events-none z-10 transition-all duration-300 group-hover:w-20 group-hover:h-20"
          style={{ clipPath: "polygon(100% 0, 0 100%, 100% 100%)" }}
        />
      </div>
    </div>
  );
};

export default StickyNote;
