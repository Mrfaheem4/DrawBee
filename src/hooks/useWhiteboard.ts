import { useState, useRef } from "react";
import { type NoteColor } from "../components/StickyNote";

export interface DrawingLine {
  tool: string;
  points: number[];
  color: string;
  width: number;
}

export interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  color: string;
  rotation: number;
}

export interface StickyNoteItem {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  color: NoteColor;
  rotation: number;
  isEditing: boolean;
}

interface Snapshot {
  lines: DrawingLine[];
  textBoxes: TextBox[];
  stickyNotes: StickyNoteItem[];
}

export const useWhiteboard = () => {
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([
    { lines: [], textBoxes: [], stickyNotes: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = (
    newLines: DrawingLine[],
    newTextBoxes: TextBox[],
    newStickyNotes: StickyNoteItem[],
  ) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [
        ...trimmed,
        {
          lines: newLines,
          textBoxes: newTextBoxes,
          stickyNotes: newStickyNotes,
        },
      ];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    setLines(snapshot.lines);
    setTextBoxes(snapshot.textBoxes);
    setStickyNotes(snapshot.stickyNotes);
    setHistoryIndex(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    setLines(snapshot.lines);
    setTextBoxes(snapshot.textBoxes);
    setStickyNotes(snapshot.stickyNotes);
    setHistoryIndex(newIndex);
  };

  return {
    lines,
    setLines,
    textBoxes,
    setTextBoxes,
    stickyNotes,
    setStickyNotes,
    pushHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};
