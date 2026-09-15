"use client";

// /clone/[slug]/finance/* 配下の内部ナビ。売上 / 経費 / 活動 の3項目。

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  slug: string;
}

interface NavItem {
  href: string;
  label: string;
}

function buildItems(slug: string): NavItem[] {
  const base = `/clone/${slug}/finance`;
  return [
    { href: `${base}/revenue`, label: "売上" },
    { href: `${base}/activities`, label: "活動ログ" },
  ];
}

export function FinanceNav({ slug }: Props) {
  const pathname = usePathname();
  const items = buildItems(slug);

  return (
    <nav
      aria-label="売上・経費セクション"
      className="border-b border-gray-200 -mx-5 sm:-mx-6 px-5 sm:px-6"
    >
      <div className="flex gap-5 -mb-px overflow-x-auto">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3 text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                active
                  ? "border-[#1c3550] text-[#1c3550] font-semibold"
                  : "border-transparent text-gray-500 font-medium hover:text-gray-800"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
