import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";

export const useBoard = () => {
  const [boardId, setBoardId] = useState<string | null>(null);

  useEffect(() => {
    initBoard();
  }, []);

  const initBoard = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const urlParts = window.location.pathname.split("/");
    const urlBoardId = urlParts[2];

    if (urlBoardId) {
      await joinBoard(urlBoardId, user.id);
      setBoardId(urlBoardId);
      return;
    }

    const userRes = await supabase.auth.getUser();
    console.log("Current user:", userRes.data.user?.id);

    const { data: existing } = await supabase
      .from("whiteboards")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("whiteboard_members")
        .upsert(
          { whiteboard_id: existing.id, user_id: user.id },
          { onConflict: "whiteboard_id,user_id" },
        );
      setBoardId(existing.id);
      return;
    }

    const { data, error } = await supabase
      .from("whiteboards")
      .insert({ name: "My Board", owner_id: user.id })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    await supabase
      .from("whiteboard_members")
      .upsert(
        { whiteboard_id: data.id, user_id: user.id },
        { onConflict: "whiteboard_id,user_id" },
      );
    setBoardId(data.id);
  };

  const joinBoard = async (boardId: string, userId: string) => {
    const { error } = await supabase
      .from("whiteboard_members")
      .upsert(
        { whiteboard_id: boardId, user_id: userId },
        { onConflict: "whiteboard_id,user_id" },
      );
    if (error) console.error("Error joining board:", error);
    else console.log("Joined board ✅");
  };

  return { boardId };
};
