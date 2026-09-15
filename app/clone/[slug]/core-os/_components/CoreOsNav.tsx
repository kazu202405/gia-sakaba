"use client";

// /clone/[slug]/core-os/* 配下の内部ナビ。各セクション切替。
// Core OS ページ内の上部タブ（横並び）として配置。
// ・タブには番号を出さない（設計上 07 が欠番で 06→08 が並ぶと不自然なため）。
// ・スマホでは横スクロール。遷移ごとに再マウントで左端へ戻るため、
//   現在地のタブを自動で見える位置（中央）へスクロールする。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

interface Props {
  slug: string;
}

interface NavItem {
  href: string;
  label: string;
}

function buildItems(slug: string): NavItem[] {
  const base = `/clone/${slug}/core-os`;
  return [
    { href: `${base}/mission`, label: "ミッション" },
    { href: `${base}/three-year-plan`, label: "3年計画" },
    { href: `${base}/annual-kpi`, label: "今年のKPI" },
    { href: `${base}/decision-principles`, label: "判断基準" },
    { href: `${base}/tone-rules`, label: "口調ルール" },
    { href: `${base}/ng-rules`, label: "NGルール" },
    { href: `${base}/faq`, label: "FAQ" },
    { href: `${base}/persona-traits`, label: "観察された傾向" },
    { href: `${base}/audit`, label: "棚卸し" },
  ];
}

export function CoreOsNav({ slug }: Props) {
  const pathname = usePathname();
  const items = buildItems(slug);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // 現在のタブを横スクロールの中央に寄せる（スマホで左端＝01 に戻って見えなくなるのを防ぐ）。
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [pathname]);

  return (
    <nav
      aria-label="Core OS セクション"
      className="border-b border-gray-200 -mx-5 sm:-mx-6 px-5 sm:px-6"
    >
      <div className="flex gap-5 -mb-px overflow-x-auto">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              ref={active ? activeRef : undefined}
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
