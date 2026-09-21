"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GuildIntroRequest, GuildQuest } from "@/lib/guild/server-data";
import type { GuildNotification, Profile } from "@/lib/guild/types";
import { formatDate, introStatusLabel } from "@/lib/guild/labels";
import { notificationText, unreadCount, type NotificationContext } from "@/lib/guild/notifications";
import { createClient } from "@/lib/supabase/client";
import { Window } from "./cards";

export function LiveNotificationList({ initial, members, quests, intros }: {
  initial: GuildNotification[];
  members: Profile[];
  quests: GuildQuest[];
  intros: GuildIntroRequest[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const names = new Map(members.map((member) => [member.id, member.display_name]));
  const titles = new Map(quests.map((quest) => [quest.id, quest.title]));
  const byIntroId = new Map(intros.map((intro) => [intro.id, intro]));
  const ctx: NotificationContext = {
    name: (id) => names.get(id) ?? "メンバー",
    questTitle: (id) => titles.get(id) ?? "クエスト",
    intro: (id) => byIntroId.get(id),
  };

  async function markRead(id?: string, href?: string) {
    if (pendingId) return;
    setPendingId(id ?? "all"); setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_mark_notifications_read", {
        p_guild_slug: "gia", p_notification_id: id,
      });
      if (rpcError) throw rpcError;
      if (href) router.push(href);
      router.refresh();
    } catch {
      setError("既読にできませんでした。もう一度お試しください。");
    } finally {
      setPendingId(null);
    }
  }

  return <Window title="あなたあて" action={unreadCount(initial) > 0 ? <button type="button" disabled={pendingId !== null} onClick={() => void markRead()} className="c-muted text-xs underline disabled:opacity-50">すべて既読にする</button> : undefined}>
    {error && <p role="alert" className="mb-3 text-sm text-[#c62828]">{error}</p>}
    {initial.length === 0 ? <p className="c-muted text-sm">おしらせはありません。</p> : <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">{initial.map((item) => {
      const intro = item.intro_request_id ? byIntroId.get(item.intro_request_id) : undefined;
      let { text, href } = notificationText(item, ctx);
      if (item.kind === "intro_progress" && intro && item.user_id !== intro.requester_id && item.user_id !== intro.target_id) {
        text = item.intro_status === "requested" ? "新しい紹介依頼が届きました" : `紹介依頼：${introStatusLabel[item.intro_status ?? intro.status].master}`;
        href = "/guild/master";
      } else if (item.kind === "intro_progress" && intro && item.user_id === intro.target_id && item.intro_status === "introduced") {
        text = "紹介済みになりました";
      }
      return <li key={item.id}><button type="button" disabled={pendingId !== null} onClick={() => void markRead(item.id, href)} className="rpg-cursor-row flex w-full items-start gap-2 py-3.5 text-left disabled:opacity-50"><span className="rpg-cursor mt-0.5">▶</span><span className="mt-0.5 w-3 shrink-0 text-xs" aria-hidden>{item.read_at ? "" : "●"}</span><span className="min-w-0 flex-1"><span className={`block text-[15px] leading-relaxed break-words ${item.read_at ? "c-muted" : ""}`}>{text}</span><span className="c-muted mt-1 block text-[11px]">{formatDate(item.created_at)}</span></span></button></li>;
    })}</ul>}
  </Window>;
}
