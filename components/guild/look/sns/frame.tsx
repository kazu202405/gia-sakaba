"use client";

// 見本の外枠：上のバー・見本だけのつまみ（色・ホームの形）・下のメニュー・読み込み中の仮の画面。
// リンクを押した瞬間（ボタンからの移動も）に、行き先が届くまで仮の画面を出す。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BriefcaseBusiness, ChevronLeft, House, Search, UserRound, Users, type LucideIcon } from "lucide-react";
import { GUILD_NAVIGATE_EVENT } from "@/components/guild/use-guild-router";
import { HOME_STYLES, PALETTES, SNS_BASE, SNS_NAME } from "@/lib/guild/look/sns-mock";
import { PageSkeleton } from "./parts";
import { SnProvider, snPath, useSnState } from "./store";
import "./sns.css";

/** 下のメニュー。ready=false はまだ画面が無い（押せない見た目にして、リンクにしない） */
export const NAV: readonly { to: string; label: string; icon: LucideIcon; also?: string[]; ready: boolean }[] = [
  { to: "", label: "ホーム", icon: House, ready: true },
  { to: "/search", label: "探す", icon: Search, also: ["/people", "/companies"], ready: true },
  { to: "/network", label: "人脈", icon: Users, ready: false },
  { to: "/posts", label: "案件", icon: BriefcaseBusiness, ready: false },
  { to: "/me", label: "自分", icon: UserRound, ready: false },
];

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
  const { palette, setPalette, homeStyle, setHomeStyle } = useSnState();
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

  return (
    <div className="sn" data-palette={palette}>
      <header className="sn-top">
        <div className="sn-top-in">
          {isTop ? (
            <Link href={snPath("")} className="sn-brand">{SNS_NAME}</Link>
          ) : (
            <BackButton onPress={() => setPending("back")} />
          )}
          <span className="sn-icon-btn" aria-label="お知らせ（未読あり）" role="img">
            <Bell size={22} strokeWidth={1.8} aria-hidden />
            <span className="sn-dot" aria-hidden />
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
          <span className="sn-mock-set" role="group" aria-label="ホームの形">
            {HOME_STYLES.map((h) => (
              <button key={h.key} type="button" aria-pressed={homeStyle === h.key} onClick={() => setHomeStyle(h.key)}>{h.label}</button>
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
            const active = item.to === "" ? shownRest === "" : isUnder(shownRest, item.to) || (item.also ?? []).some((a) => isUnder(shownRest, a));
            const inner = (
              <>
                <Icon size={22} strokeWidth={1.8} aria-hidden />
                {item.label}
              </>
            );
            if (!item.ready) {
              return <span key={item.to} aria-disabled="true" title="この画面はこのあと作ります">{inner}</span>;
            }
            return <Link key={item.to} href={snPath(item.to)} aria-current={active ? "page" : undefined}>{inner}</Link>;
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
