import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";
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

export const useWhiteboard = (boardId: string | null) => {
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([
    { lines: [], textBoxes: [], stickyNotes: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load on mount
  useEffect(() => {
    if (!boardId) return;
    loadFromSupabase();
  }, [boardId]);

  // Realtime sync
  useEffect(() => {
    if (!boardId) return;

    const channelName = `whiteboard:${boardId}`;

    // Remove any existing channel with this name first
    const existing = supabase
      .getChannels()
      .find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "whiteboards",
        filter: `id=eq.${boardId}`,
      },
      (payload) => {
        const canvas = payload.new.canvas_data;
        if (!canvas) return;
        setLines(canvas.lines ?? []);
        setTextBoxes(canvas.textBoxes ?? []);
        setStickyNotes(canvas.stickyNotes ?? []);
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  const loadFromSupabase = async () => {
    const { data, error } = await supabase
      .from("whiteboards")
      .select("canvas_data")
      .eq("id", boardId)
      .single();

    if (error) {
      console.error("Load error:", error);
      return;
    }

    if (data?.canvas_data) {
      const { lines, textBoxes, stickyNotes } = data.canvas_data;
      setLines(lines ?? []);
      setTextBoxes(textBoxes ?? []);
      setStickyNotes(stickyNotes ?? []);
      setHistory([
        {
          lines: lines ?? [],
          textBoxes: textBoxes ?? [],
          stickyNotes: stickyNotes ?? [],
        },
      ]);
      setHistoryIndex(0);
    }
  };

  const saveToSupabase = async (
    newLines: DrawingLine[],
    newTextBoxes: TextBox[],
    newStickyNotes: StickyNoteItem[],
  ) => {
    if (!boardId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("whiteboards")
      .update({
        canvas_data: {
          lines: newLines,
          textBoxes: newTextBoxes,
          stickyNotes: newStickyNotes,
        },
      })
      .eq("id", boardId);

    if (error) console.error("Save error:", error);
    else console.log("Board saved ✅");
  };

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
    saveToSupabase(newLines, newTextBoxes, newStickyNotes);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    setLines(snapshot.lines);
    setTextBoxes(snapshot.textBoxes);
    setStickyNotes(snapshot.stickyNotes);
    setHistoryIndex(newIndex);
    saveToSupabase(snapshot.lines, snapshot.textBoxes, snapshot.stickyNotes);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    setLines(snapshot.lines);
    setTextBoxes(snapshot.textBoxes);
    setStickyNotes(snapshot.stickyNotes);
    setHistoryIndex(newIndex);
    saveToSupabase(snapshot.lines, snapshot.textBoxes, snapshot.stickyNotes);
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
