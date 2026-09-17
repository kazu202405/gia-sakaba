"use client";

// おしらせの一覧。押すと読んだことになり、行き先へ移る。

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/guild/labels";
import { getApplication, getProfile, getQuest, guild, introRequests } from "@/lib/guild/mock-data";
import {
  getInitialNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "@/lib/guild/notification-store";
import { notificationText, unreadCount, type NotificationContext } from "@/lib/guild/notifications";
import { cn } from "@/lib/utils";
import { Window } from "./cards";

const ctx: NotificationContext = {
  name: (id) => getProfile(id)?.display_name ?? guild.terms.member,
  questTitle: (id) => getQuest(id)?.title ?? "クエスト",
  intro: (id) => introRequests.find((r) => r.id === id),
};

export function NotificationList() {
  const items = useSyncExternalStore(subscribeNotifications, getNotifications, getInitialNotifications);
  const unread = unreadCount(items);

  return (
    <Window
      title="あなたあて"
      action={
        unread > 0 ? (
          <button type="button" onClick={markAllNotificationsRead} className="c-muted text-xs hover:underline">
            すべて 読んだことにする
          </button>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <p className="c-muted text-sm">おしらせは ありません。</p>
      ) : (
        <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
          {items.map((n) => {
            const { text, href } = notificationText(n, ctx);
            const isUnread = n.read_at === null;
            const snippet =
              n.kind === "quest_applied" && n.quest_id && n.actor_id
                ? getApplication(n.quest_id, n.actor_id)?.message
                : undefined;
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  onClick={() => markNotificationRead(n.id)}
                  className="rpg-cursor-row flex items-start gap-2 py-3.5"
                >
                  <span className="rpg-cursor mt-0.5">▶</span>
                  {/* 未読は色ではなく「●」の形で見分ける（赤は急ぎと入力エラーだけに使う） */}
                  <span className="mt-0.5 w-3 shrink-0 text-xs" aria-hidden>
                    {isUnread ? "●" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    {isUnread && <span className="sr-only">みどく：</span>}
                    <span className={cn("block text-[15px] leading-relaxed break-words", !isUnread && "c-muted")}>
                      {text}
                    </span>
                    {snippet && (
                      <span className="c-muted mt-1 block truncate text-xs">「{snippet}」</span>
                    )}
                    <span className="c-muted mt-1 block text-[11px]">{formatDate(n.created_at)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Window>
  );
}
