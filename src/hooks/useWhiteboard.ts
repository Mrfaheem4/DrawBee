import { useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";
import { type NoteColor } from "../components/StickyNote";

export interface DrawingLine {
  id?: string;
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
  const historyIndexRef = useRef(0);

  // ─── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!boardId) return;
    loadFromSupabase();
  }, [boardId]);

  // ─── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!boardId) return;

    const channelName = `whiteboard:${boardId}`;
    const existing = supabase
      .getChannels()
      .find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase.channel(channelName);

    // Lines
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "lines",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        const row = payload.new;
        setLines((prev) => {
          if (prev.find((l) => l.id === row.id)) return prev;
          return [
            ...prev,
            {
              id: row.id,
              tool: row.tool,
              points: row.points,
              color: row.color,
              width: row.width,
            },
          ];
        });
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "lines",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        setLines((prev) => prev.filter((l) => l.id !== payload.old.id));
      },
    );

    // Text boxes
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "text_boxes",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        const row = payload.new;
        setTextBoxes((prev) => {
          if (prev.find((t) => t.id === row.id)) return prev;
          return [
            ...prev,
            {
              id: row.id,
              text: row.text,
              x: row.x,
              y: row.y,
              width: row.width,
              color: row.color,
              rotation: row.rotation,
            },
          ];
        });
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "text_boxes",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        const row = payload.new;
        setTextBoxes((prev) =>
          prev.map((t) =>
            t.id === row.id
              ? {
                  ...t,
                  text: row.text,
                  x: row.x,
                  y: row.y,
                  width: row.width,
                  color: row.color,
                  rotation: row.rotation,
                }
              : t,
          ),
        );
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "text_boxes",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        setTextBoxes((prev) => prev.filter((t) => t.id !== payload.old.id));
      },
    );

    // Sticky notes
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sticky_notes",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        const row = payload.new;
        setStickyNotes((prev) => {
          if (prev.find((n) => n.id === row.id)) return prev;
          return [
            ...prev,
            {
              id: row.id,
              x: row.x,
              y: row.y,
              title: row.title,
              content: row.content,
              color: row.color as NoteColor,
              rotation: row.rotation,
              isEditing: false,
            },
          ];
        });
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sticky_notes",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        const row = payload.new;
        setStickyNotes((prev) =>
          prev.map((n) =>
            n.id === row.id
              ? {
                  ...n,
                  x: row.x,
                  y: row.y,
                  title: row.title,
                  content: row.content,
                  color: row.color as NoteColor,
                  rotation: row.rotation,
                }
              : n,
          ),
        );
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "sticky_notes",
        filter: `whiteboard_id=eq.${boardId}`,
      },
      (payload) => {
        setStickyNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  // ─── Load ───────────────────────────────────────────────────────────────────
  const loadFromSupabase = async () => {
    const [linesRes, textBoxesRes, stickyNotesRes] = await Promise.all([
      supabase.from("lines").select("*").eq("whiteboard_id", boardId),
      supabase.from("text_boxes").select("*").eq("whiteboard_id", boardId),
      supabase.from("sticky_notes").select("*").eq("whiteboard_id", boardId),
    ]);

    if (linesRes.error) console.error("Lines load error:", linesRes.error);
    if (textBoxesRes.error)
      console.error("Text boxes load error:", textBoxesRes.error);
    if (stickyNotesRes.error)
      console.error("Sticky notes load error:", stickyNotesRes.error);

    const loadedLines = (linesRes.data ?? []).map((row) => ({
      id: row.id,
      tool: row.tool,
      points: row.points,
      color: row.color,
      width: row.width,
    }));

    const loadedTextBoxes = (textBoxesRes.data ?? []).map((row) => ({
      id: row.id,
      text: row.text,
      x: row.x,
      y: row.y,
      width: row.width,
      color: row.color,
      rotation: row.rotation,
    }));

    const loadedStickyNotes = (stickyNotesRes.data ?? []).map((row) => ({
      id: row.id,
      x: row.x,
      y: row.y,
      title: row.title,
      content: row.content,
      color: row.color as NoteColor,
      rotation: row.rotation,
      isEditing: false,
    }));

    setLines(loadedLines);
    setTextBoxes(loadedTextBoxes);
    setStickyNotes(loadedStickyNotes);
    setHistory([
      {
        lines: loadedLines,
        textBoxes: loadedTextBoxes,
        stickyNotes: loadedStickyNotes,
      },
    ]);
    setHistoryIndex(0);
  };

  // ─── DB operations ──────────────────────────────────────────────────────────
  const dbAddLine = async (line: DrawingLine) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !boardId) return null;

    const { data, error } = await supabase
      .from("lines")
      .insert({
        whiteboard_id: boardId,
        user_id: user.id,
        tool: line.tool,
        points: line.points,
        color: line.color,
        width: line.width,
      })
      .select()
      .single();

    if (error) {
      console.error("Add line error:", error);
      return null;
    }
    return data.id as string;
  };

  const dbDeleteLine = async (lineId: string) => {
    const { error } = await supabase.from("lines").delete().eq("id", lineId);
    if (error) console.error("Delete line error:", error);
  };

  const dbAddTextBox = async (tb: TextBox) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !boardId) return;

    const { error } = await supabase.from("text_boxes").insert({
      id: tb.id,
      whiteboard_id: boardId,
      user_id: user.id,
      text: tb.text,
      x: tb.x,
      y: tb.y,
      width: tb.width,
      color: tb.color,
      rotation: tb.rotation,
    });

    if (error) console.error("Add text box error:", error);
  };

  const dbUpdateTextBox = async (tb: TextBox) => {
    const { error } = await supabase
      .from("text_boxes")
      .update({
        text: tb.text,
        x: tb.x,
        y: tb.y,
        width: tb.width,
        color: tb.color,
        rotation: tb.rotation,
      })
      .eq("id", tb.id);

    if (error) console.error("Update text box error:", error);
  };

  const dbDeleteTextBox = async (id: string) => {
    const { error } = await supabase.from("text_boxes").delete().eq("id", id);
    if (error) console.error("Delete text box error:", error);
  };

  const dbAddStickyNote = async (note: StickyNoteItem) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !boardId) return;

    const { error } = await supabase.from("sticky_notes").insert({
      id: note.id,
      whiteboard_id: boardId,
      user_id: user.id,
      x: note.x,
      y: note.y,
      title: note.title,
      content: note.content,
      color: note.color,
      rotation: note.rotation,
    });

    if (error) console.error("Add sticky note error:", error);
  };

  const dbUpdateStickyNote = async (note: StickyNoteItem) => {
    const { error } = await supabase
      .from("sticky_notes")
      .update({
        x: note.x,
        y: note.y,
        title: note.title,
        content: note.content,
        color: note.color,
        rotation: note.rotation,
      })
      .eq("id", note.id);

    if (error) console.error("Update sticky note error:", error);
  };

  const dbDeleteStickyNote = async (id: string) => {
    const { error } = await supabase.from("sticky_notes").delete().eq("id", id);
    if (error) console.error("Delete sticky note error:", error);
  };

  // ─── History (local only) ───────────────────────────────────────────────────
  const pushHistory = (
    newLines: DrawingLine[],
    newTextBoxes: TextBox[],
    newStickyNotes: StickyNoteItem[],
  ) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndexRef.current + 1);
      return [
        ...trimmed,
        {
          lines: newLines,
          textBoxes: newTextBoxes,
          stickyNotes: newStickyNotes,
        },
      ];
    });
    historyIndexRef.current += 1;
    setHistoryIndex(historyIndexRef.current);
  };
  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setHistoryIndex(historyIndexRef.current);
    setHistory((prev) => {
      const snapshot = prev[historyIndexRef.current];
      setLines(snapshot.lines);
      setTextBoxes(snapshot.textBoxes);
      setStickyNotes(snapshot.stickyNotes);
      return prev;
    });
  };
  const redo = () => {
    setHistory((prev) => {
      if (historyIndexRef.current >= prev.length - 1) return prev;
      historyIndexRef.current += 1;
      setHistoryIndex(historyIndexRef.current);
      const snapshot = prev[historyIndexRef.current];
      setLines(snapshot.lines);
      setTextBoxes(snapshot.textBoxes);
      setStickyNotes(snapshot.stickyNotes);
      return prev;
    });
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
    dbAddLine,
    dbDeleteLine,
    dbAddTextBox,
    dbUpdateTextBox,
    dbDeleteTextBox,
    dbAddStickyNote,
    dbUpdateStickyNote,
    dbDeleteStickyNote,
  };
};
