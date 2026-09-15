// リマインドの2タブ（やること＝期限 / 記念日＝日付）。
// /clone/[slug]/tasks（やること）と /clone/[slug]/tasks/dates（記念日）で共有。

import Link from "next/link";
import { ListChecks, CalendarHeart, SlidersHorizontal } from "lucide-react";

export function ReminderTabs({
  slug,
  active,
}: {
  slug: string;
  active: "tasks" | "dates" | "rules";
}) {
  const base = `/clone/${slug}/tasks`;
  const tabs = [
    { key: "tasks" as const, href: base, label: "期限管理", icon: ListChecks },
    {
      key: "dates" as const,
      href: `${base}/dates`,
      label: "日付管理",
      icon: CalendarHeart,
    },
    {
      key: "rules" as const,
      href: `${base}/rules`,
      label: "配信ルール",
      icon: SlidersHorizontal,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-[#c08a3e] text-[#8a5a1c]"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
