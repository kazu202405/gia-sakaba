"use client";

// project 詳細ページのタブナビ。URL ベース（概要 = /projects/[id], 進捗 = /projects/[id]/progress）。

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  slug: string;
  projectId: string;
  progressCount?: number;
}

export function ProjectTabs({ slug, projectId, progressCount }: Props) {
  const pathname = usePathname();
  const overviewHref = `/clone/${slug}/projects/${projectId}`;
  const progressHref = `/clone/${slug}/projects/${projectId}/progress`;

  const items = [
    { href: overviewHref, label: "概要", count: undefined },
    { href: progressHref, label: "進捗", count: progressCount },
  ];

  return (
    <nav
      aria-label="案件詳細セクション"
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
