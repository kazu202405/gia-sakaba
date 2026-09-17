"use client";

// 一覧を開いたことを記録する。ホームの「あたらしい〜」の数がここで消える。

import { useEffect } from "react";
import { markSeen } from "@/lib/guild/seen-store";

export function MarkSeen({ list }: { list: "members" | "quests" }) {
  useEffect(() => {
    markSeen(list);
  }, [list]);
  return null;
}
