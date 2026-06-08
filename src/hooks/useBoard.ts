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
    // e.g. /board/BOARD_UUID  or  /invite/TOKEN
    const segment = urlParts[1]; // "board" | "invite"
    const value = urlParts[2]; // the UUID or token

    // ── Invite link: /invite/TOKEN ──────────────────────────────────────────
    if (segment === "invite" && value) {
      const { data, error } = await supabase.rpc("join_whiteboard_via_token", {
        p_token: value,
      });

      if (error || data?.error) {
        console.error("Invalid or expired invite token:", error ?? data.error);
        return;
      }

      const resolvedBoardId = data.whiteboard_id as string;
      setBoardId(resolvedBoardId);

      // Redirect to the clean board URL so refreshing works
      window.history.replaceState(null, "", `/board/${resolvedBoardId}`);
      return;
    }

    // ── Direct board link: /board/BOARD_UUID ────────────────────────────────
    if (segment === "board" && value) {
      // Make sure the user is a member (they may already be)
      await supabase
        .from("whiteboard_members")
        .upsert(
          { whiteboard_id: value, user_id: user.id },
          { onConflict: "whiteboard_id,user_id" },
        );
      setBoardId(value);
      return;
    }

    // ── No board in URL: load or create the user's own board ─────────────────
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

    // ── First time: create a new board ───────────────────────────────────────
    const { data: created, error: createError } = await supabase
      .from("whiteboards")
      .insert({ name: "My Board", owner_id: user.id })
      .select()
      .single();

    if (createError) {
      console.error("Error creating board:", createError);
      return;
    }

    await supabase
      .from("whiteboard_members")
      .upsert(
        { whiteboard_id: created.id, user_id: user.id },
        { onConflict: "whiteboard_id,user_id" },
      );

    setBoardId(created.id);
  };

  return { boardId };
};
