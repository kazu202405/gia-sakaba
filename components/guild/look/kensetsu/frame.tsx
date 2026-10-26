"use client";

// 建設・不動産の酒場モックの外枠：上のバー・見る人の切り替え（モック専用）・下のメニュー・読み込み中の仮の画面。
// 本物の店と同じ data-store / data-theme を当てるので、色・形は components/guild/guild-theme.css の建設の店（C案）と同じ。
// リンクを押した瞬間（ボタンからの移動も）に、行き先が届くまで仮の画面を出す。移動の入口は useK().go の1つ。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ClipboardList, Inbox, MessageSquarePlus, UserRound, Users, type LucideIcon } from "lucide-react";
import { GUILD_NAVIGATE_EVENT } from "@/components/guild/use-guild-router";
import { KENSETSU_BASE, MOCK_STORE, MOCK_STORE_NAME, ROLES, type Role } from "@/lib/guild/look/kensetsu-mock";
import { storeThemeAttrs } from "@/lib/guild/stores";
import { useK, useMock } from "./store";
import "./kensetsu.css";

type NavItem = { to: string; label: string; icon: LucideIcon; /** この道の下も「いる所」とする */ also?: string[]; /** この道は含めない */ not?: string[]; count?: number };

function navFor(role: Role, newCount: number): NavItem[] {
  if (role === "admin") {
    return [
      { to: "/master", label: "受付箱", icon: Inbox, not: ["/master/partners"], count: newCount },
      { to: "/master/partners", label: "渡し先", icon: Users },
      { to: "/me", label: "自分", icon: UserRound, also: ["/members"] },
    ];
  }
  return [
    { to: "", label: "相談する", icon: MessageSquarePlus, also: ["/new", "/referrals"] },
    { to: "/incoming", label: "届いた相談", icon: ClipboardList },
    { to: "/me", label: "自分", icon: UserRound, also: ["/members"] },
  ];
}

function isUnder(rest: string, to: string) {
  return rest === to || rest.startsWith(`${to}/`);
}

function isActive(rest: string, item: NavItem) {
  const on = item.to === "" ? rest === "" : isUnder(rest, item.to);
  const also = (item.also ?? []).some((a) => isUnder(rest, a));
  const excluded = (item.not ?? []).some((n) => isUnder(rest, n));
  return (on || also) && !excluded;
}

// 行き先が届かないまま仮の画面を出し続けない上限
const PENDING_LIMIT_MS = 15000;

export function KensetsuFrame({ children }: { children: React.ReactNode }) {
  const { role, href, persona } = useK();
  const { state } = useMock();
  const pathname = usePathname();
  const rest = pathname.startsWith(KENSETSU_BASE) ? pathname.slice(KENSETSU_BASE.length) : "";

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
      if (url.origin !== window.location.origin || !url.pathname.startsWith(KENSETSU_BASE)) return;
      if (url.pathname === window.location.pathname) return;
      setPending(url.pathname);
    };
    document.addEventListener("click", onClick);
    // ボタンから移るとき（useGuildRouter 経由）も同じ仮の画面
    const onNavigate = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (typeof path === "string" && path.startsWith(KENSETSU_BASE) && path !== window.location.pathname) setPending(path);
    };
    window.addEventListener(GUILD_NAVIGATE_EVENT, onNavigate);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(GUILD_NAVIGATE_EVENT, onNavigate);
    };
  }, []);

  const unread = state.notices.filter((n) => n.forMemberId === persona.id && !n.read).length;
  const newCount = state.referrals.filter((r) => r.status === "received").length;
  const shownRest = pending && pending.startsWith(KENSETSU_BASE) ? pending.slice(KENSETSU_BASE.length) : rest;
  const nav = navFor(role, newCount);

  return (
    <FrameShell
      top={
        <>
          <Link href={href("")} className="kz-brand">{MOCK_STORE_NAME}</Link>
          <Link href={href("/notifications")} className="kz-bell" aria-label={unread > 0 ? `お知らせ（未読${unread}件）` : "お知らせ"}>
            <Bell size={24} strokeWidth={1.8} aria-hidden />
            {unread > 0 && <span className="kz-bell-count" aria-hidden>{unread}</span>}
          </Link>
        </>
      }
      role={
        <>
          <p className="kz-role-label">見る人を切り替える（見本用。本番にはありません）</p>
          <div className="kz-role-set">
            {ROLES.map((r) => (
              <Link key={r.key} href={`${KENSETSU_BASE}${r.home}${r.key === "requester" ? "" : `?as=${r.key}`}`} aria-current={r.key === role ? "true" : undefined}>
                {r.label}
              </Link>
            ))}
          </div>
        </>
      }
      nav={nav.map((item) => {
        const active = isActive(shownRest, item);
        const Icon = item.icon;
        return (
          <Link key={item.to} href={href(item.to)} aria-current={active ? "page" : undefined}>
            <span className="kz-nav-icon">
              <Icon size={24} strokeWidth={1.8} aria-hidden />
              {item.count ? <span className="kz-nav-badge" aria-label={`${item.count}件`}>{item.count}</span> : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    >
      {pending !== null && <PageSkeleton />}
      {/* 仮の画面の間も今の画面は消さずに隠すだけ（届かなかったときにそのまま戻せるように） */}
      <div hidden={pending !== null}>{children}</div>
    </FrameShell>
  );
}

/** 外枠の見た目だけ。Suspense の待ち時間（?as= を読むまで）にも同じ枠を出す */
export function FrameShell({ top, role, nav, children }: { top?: React.ReactNode; role?: React.ReactNode; nav?: React.ReactNode; children: React.ReactNode }) {
  const attrs = MOCK_STORE ? storeThemeAttrs(MOCK_STORE) : {};
  return (
    <div className="kz" {...attrs}>
      <header className="kz-top">
        <div className="kz-top-in">{top ?? <span className="kz-brand">{MOCK_STORE_NAME}</span>}</div>
      </header>
      <div className="kz-role"><div className="kz-role-in">{role}</div></div>
      <main className="kz-main">{children}</main>
      <nav className="kz-nav" aria-label="メニュー"><div className="kz-nav-in">{nav}</div></nav>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中</span>
      <div aria-hidden>
        <span className="kz-skel kz-skel--title" />
        <span className="kz-skel kz-skel--line" />
        <span className="kz-skel kz-skel--block" />
        <span className="kz-skel kz-skel--block" />
        <span className="kz-skel kz-skel--short" />
      </div>
    </div>
  );
}
