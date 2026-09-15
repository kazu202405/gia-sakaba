"use client";

// /clone/[slug]/review/* 配下の内部ナビ。判断履歴 / ナレッジ候補 / 更新待ちルール / 週次レビュー / 月次レビュー の5項目。

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
  const base = `/clone/${slug}/review`;
  return [
    { href: `${base}/decisions`, label: "判断履歴" },
    { href: `${base}/knowledge`, label: "ナレッジ候補" },
    { href: `${base}/pending`, label: "更新待ちルール" },
    { href: `${base}/weekly`, label: "週次レビュー" },
    { href: `${base}/monthly`, label: "月次レビュー" },
  ];
}

export function ReviewNav({ slug }: Props) {
  const pathname = usePathname();
  const items = buildItems(slug);

  return (
    <nav
      aria-label="レビューセクション"
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
              className={`py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-[#1c3550] text-[#1c3550] font-semibold"
                  : "border-transparent text-gray-500 font-medium hover:text-gray-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
