"use client";

// 管理者専用レイアウト。
// 一般ユーザー向け /members/app/* とは独立した admin エリアの枠。
// 認証ガードは middleware.ts で行う（未ログインで /admin/* に来たら /admin/login へ）。
// このレイアウト自身は session 状態を見ない（middleware を信頼する）。
//
// /admin/login だけはサイドバー / ヘッダー非表示で素のレイアウトに切り替える。
//
// レスポンシブ：
//   md 以上 → 左サイドバー固定表示
//   md 未満 → ヘッダー左のハンバーガーから drawer 形式でナビを出す

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LogOut,
  ArrowUpRight,
  CalendarDays,
  Sparkles,
  BookOpen,
  Brain,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NavLinkPendingIndicator } from "@/components/nav/NavLinkPendingIndicator";

const adminNavItems = [
  // /admin/ai-clone ダッシュボードは無効化（2026-05-14、/clone/<slug> に集約）
  // 鑑定（命式図解）は社内利用頻度が最も高いので先頭に置く。
  { href: "/admin/divination", label: "鑑定", icon: Sparkles },
  // 用語解説は鑑定とセットで使う辞典。鑑定のすぐ下に置く。
  { href: "/admin/divination/glossary", label: "用語解説", icon: BookOpen },
  // 右腕AI（AI Clone ハブ）。/clone は所属テナント数に応じて picker か /clone/<slug> へ。
  // admin 外への遷移だがメインナビに置く（鑑定と並んで主要ツールのため）。
  { href: "/clone", label: "右腕AI", icon: Brain },
  // /admin は会員管理ハブ（タブで申請・全会員・ダッシュボード・招待・ログを切替）
  { href: "/admin", label: "会員管理", icon: ClipboardList },
  { href: "/admin/seminars", label: "会の管理", icon: CalendarDays },
];

/** 各 nav 項目がアクティブか判定。より具体的なサブパスがあれば親はinactive扱い。 */
function isItemActive(itemHref: string, pathname: string): boolean {
  if (pathname === itemHref) return true;
  if (itemHref === "/admin") return false;
  const moreSpecific = adminNavItems.some(
    (other) =>
      other.href !== itemHref
      && other.href.startsWith(itemHref + "/")
      && pathname.startsWith(other.href),
  );
  if (moreSpecific) return false;
  return pathname.startsWith(itemHref);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // パスが変わったらドロワーを閉じる（リンクタップでナビが消える挙動）
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // ドロワー開いてる間は ESC キーで閉じる + body スクロールロック
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // ログイン画面はシェルを出さない（素の children のみ）
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // refresh して middleware を再評価させる（cookie 削除を反映）
    router.refresh();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 上部ヘッダー */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              aria-hidden
              className="inline-block w-1 h-5 bg-[var(--gia-deck-navy,#1c3550)] rounded-sm"
            />
            <h1 className="font-serif text-[14px] sm:text-[15px] font-semibold tracking-[0.1em] sm:tracking-[0.12em] text-gray-900">
              GIA 管理画面
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* PC（md 以上）はマイページ/ログアウトを上部バーに置く。
                スマホ/タブレット（md 未満）はドロワー内の NavList に残す。 */}
            <Link
              href="/members/app/mypage"
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              マイページへ
              <NavLinkPendingIndicator className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              ログアウト
            </button>
            {/* ハンバーガー（md 未満で表示） */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="メニューを開く"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 左サイドナビ（md 以上で常時表示）。
            PC ではマイページ/ログアウトを上部バーに出すので、サイドバーからは外す。 */}
        <aside className="hidden md:flex md:flex-col md:w-56 md:min-h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200">
          <NavList
            pathname={pathname}
            onLogout={handleLogout}
            showAccountSection={false}
          />
        </aside>

        {/* メイン */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* モバイル用ドロワー（md 未満） */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* 背景オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          {/* スライドインパネル（右側） */}
          <aside className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
              <h2 className="font-serif text-[14px] font-semibold tracking-[0.1em] text-gray-900">
                メニュー
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="メニューを閉じる"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList
              pathname={pathname}
              onLinkClick={() => setDrawerOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

/** サイドバー本体とドロワー両方で使う共通ナビリスト。
 *  上部：メイン nav（鑑定／用語解説／会員管理／会の管理）
 *  下部：アカウント操作（マイページへ／ログアウト）＋ フッターラベル
 *  showAccountSection=false にすると下部のアカウント操作を出さない（PC 用＝上部バーに移したので重複させない）。
 */
function NavList({
  pathname, onLinkClick, onLogout, showAccountSection = true,
}: {
  pathname: string;
  onLinkClick?: () => void;
  onLogout: () => void;
  showAccountSection?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* メインナビ */}
      <nav className="flex-1 p-3 space-y-1">
        {adminNavItems.map((item) => {
          const isActive = isItemActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#fbf3e3] text-[#8a5a1c] border-l-2 border-[#c08a3e] -ml-px pl-[calc(0.75rem-1px)]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              <NavLinkPendingIndicator />
            </Link>
          );
        })}
      </nav>

      {/* 下部：アカウント操作（モバイルドロワー用、PC では非表示） */}
      {showAccountSection && (
        <div className="p-3 border-t border-gray-100 space-y-1">
          <Link
            href="/members/app/mypage"
            onClick={onLinkClick}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4 flex-shrink-0" />
            マイページへ
            <NavLinkPendingIndicator />
          </Link>
          <button
            type="button"
            onClick={() => {
              onLinkClick?.();
              onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            ログアウト
          </button>
        </div>
      )}

      {/* フッターラベル */}
      <div className="p-3 text-[10px] text-gray-400 border-t border-gray-100">
        主催者専用エリア
      </div>
    </div>
  );
}
