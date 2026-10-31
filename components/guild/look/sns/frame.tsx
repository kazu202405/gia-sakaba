"use client";

// 見本の外枠：上のバー・見本だけのつまみ（色）・下のメニュー・読み込み中の仮の画面。
// リンクを押した瞬間（ボタンからの移動も）に、行き先が届くまで仮の画面を出す。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ChevronLeft, ClipboardList, House, MessageCircle, Plus, User, type LucideIcon } from "lucide-react";
import { GUILD_NAVIGATE_EVENT } from "@/components/guild/use-guild-router";
import { PALETTES, SNS_BASE, SNS_NAME } from "@/lib/guild/look/sns-mock";
import { PageSkeleton } from "./parts";
import { SnProvider, snPath, useSnState } from "./store";
import "./sns.css";
import "./sns-layout.css";

/**
 * 下のメニュー（アイコン＋字。10-31 決定）。「探す」は外し、ホームの検索欄から入る。
 * put は真ん中の丸い札（依頼する）。also はそのメニューの下に置く画面（押している所の印に使う）
 */
export const NAV: readonly { to: string; label: string; icon: LucideIcon; also?: string[]; put?: boolean }[] = [
  { to: "", label: "ホーム", icon: House, also: ["/search", "/people", "/companies"] },
  { to: "/posts", label: "案件", icon: ClipboardList },
  { to: "/posts/new", label: "依頼する", icon: Plus, put: true },
  { to: "/network", label: "やり取り", icon: MessageCircle },
  { to: "/me", label: "マイページ", icon: User, also: ["/admin"] },
];

/** いま開いている画面に当たるメニュー（いちばん長く合う道。/posts/new は「案件」でなく「依頼する」） */
export function activeNavTo(rest: string): string | null {
  const hits = NAV.flatMap((n) => {
    const paths = [n.to, ...(n.also ?? [])];
    return paths.filter((p) => (p === "" ? rest === "" : isUnder(rest, p))).map((p) => ({ to: n.to, len: p.length }));
  });
  if (hits.length === 0) return null;
  return hits.reduce((best, h) => (h.len > best.len ? h : best)).to;
}

function isUnder(rest: string, to: string) {
  return rest === to || rest.startsWith(`${to}/`);
}

// 行き先が届かないまま仮の画面を出し続けない上限
const PENDING_LIMIT_MS = 15000;

export function SnFrame({ children }: { children: React.ReactNode }) {
  return (
    <SnProvider>
      <FrameInner>{children}</FrameInner>
    </SnProvider>
  );
}

function FrameInner({ children }: { children: React.ReactNode }) {
  const { palette, setPalette } = useSnState();
  const pathname = usePathname();
  const rest = pathname.startsWith(SNS_BASE) ? pathname.slice(SNS_BASE.length) : "";

  const [pending, setPending] = useState<string | null>(null);
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    // 行き先の画面が届いた（道が変わった）ら仮の画面を消す
    setSeenPath(pathname);
    setPending(null);
  }
  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => setPending(null), PENDING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);
  useEffect(() => {
    // リンクを押した瞬間。Next.js のリンクはアプリ内で移るときだけ既定の動きを止めるので、それを見て判定する
    const onClick = (event: MouseEvent) => {
      if (!event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(SNS_BASE)) return;
      if (url.pathname === window.location.pathname) return;
      setPending(url.pathname);
    };
    document.addEventListener("click", onClick);
    // ボタンから移るとき（useGuildRouter 経由）も同じ仮の画面
    const onNavigate = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (typeof path === "string" && path.startsWith(SNS_BASE) && path !== window.location.pathname) setPending(path);
    };
    window.addEventListener(GUILD_NAVIGATE_EVENT, onNavigate);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(GUILD_NAVIGATE_EVENT, onNavigate);
    };
  }, []);

  const shownRest = pending && pending.startsWith(SNS_BASE) ? pending.slice(SNS_BASE.length) : rest;
  const isTop = NAV.some((n) => n.to === shownRest);
  const activeTo = activeNavTo(shownRest);

  return (
    <div className="sn" data-palette={palette}>
      <header className="sn-top">
        <div className="sn-top-in">
          {isTop ? (
            <Link href={snPath("")} className="sn-brand">{SNS_NAME}</Link>
          ) : (
            <BackButton onPress={() => setPending("back")} />
          )}
          <span className="sn-notice" role="img" aria-label="お知らせ 1件">
            <Bell size={22} aria-hidden />
            <i />
          </span>
        </div>
      </header>
      <div className="sn-mock">
        <div className="sn-mock-in">
          <span>見本だけのつまみ</span>
          <span className="sn-mock-set" role="group" aria-label="色">
            {PALETTES.map((p) => (
              <button key={p.key} type="button" aria-pressed={palette === p.key} onClick={() => setPalette(p.key)}>{p.label}</button>
            ))}
          </span>
        </div>
      </div>
      <main className="sn-main">
        {pending !== null && <PageSkeleton />}
        {/* 仮の画面の間も今の画面は消さずに隠すだけ（届かなかったときにそのまま戻せるように） */}
        <div hidden={pending !== null}>{children}</div>
      </main>
      <nav className="sn-nav" aria-label="メニュー">
        <div className="sn-nav-in">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTo === item.to;
            return (
              <Link key={item.to} href={snPath(item.to)} className={item.put ? "sn-nav-plus" : undefined} aria-current={active ? "page" : undefined}>
                {item.put ? <span className="sn-nav-put"><Icon aria-hidden strokeWidth={2.4} /></span> : <Icon aria-hidden />}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      className="sn-back"
      onClick={() => {
        // 押した瞬間に仮の画面。戻り先は端末の履歴で、見本を直接開いたとき（履歴が無いとき）はホームへ
        onPress();
        if (window.history.length > 1) window.history.back();
        else window.location.assign(snPath(""));
      }}
    >
      <ChevronLeft size={20} aria-hidden />もどる
    </button>
  );
}
