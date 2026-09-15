"use client";

// person 詳細ページのタブナビ。URL ベースで切替（概要 = /people/[id], メモ = /people/[id]/notes）。
// usePathname で active 判定。Memory タブが今後増えるなら同じ仕組みで横並び拡張。

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  slug: string;
  personId: string;
  noteCount?: number;
}

export function PersonTabs({ slug, personId, noteCount }: Props) {
  const pathname = usePathname();
  const overviewHref = `/clone/${slug}/people/${personId}`;
  const notesHref = `/clone/${slug}/people/${personId}/notes`;

  const items = [
    { href: overviewHref, label: "概要", count: undefined },
    { href: notesHref, label: "メモ", count: noteCount },
  ];

  return (
    <nav
      aria-label="人物詳細セクション"
      className="border-b border-gray-200"
    >
      <div className="flex gap-6 -mb-px">
        {items.map((item) => {
          const active =
            item.href === overviewHref
              ? pathname === overviewHref
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3 text-sm border-b-2 transition-colors flex items-center gap-2 ${
                active
                  ? "border-[#1c3550] text-[#1c3550] font-semibold"
                  : "border-transparent text-gray-500 font-medium hover:text-gray-800"
              }`}
            >
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={`text-[11px] tabular-nums font-medium ${
                    active ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
