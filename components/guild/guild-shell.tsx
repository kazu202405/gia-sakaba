"use client";

// 酒場の外枠（見た目はE案・2026-09-26）。PCは左の「コマンド」の窓、スマホは上のヘッダーと下のコマンド。
// 酒場の中の画面はすべて、夜の酒場の一枚絵を敷いて窓を紺に反転する（guild-theme.css の .guild-scene）。
// 絵は場所ごと：ホーム・マスター＝酒場／ギルド・紹介依頼＝広間／クエスト＝掲示板／プロジェクト＝作戦室／マイページ・おしらせ・有料会員＝宿の個室。
// 2026-09-26 に作成・編集の画面も夜にそろえた（それまでは明るい帳面）。見た目だけの切り替え。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { FeedbackButton } from "@/components/guild/feedback-button";
import { GuildPageSkeleton } from "@/components/guild/page-skeleton";
import { sceneArtOf } from "@/lib/guild/scene-art";
import { GUILD_NAVIGATE_EVENT } from "@/components/guild/use-guild-router";
import { countNavBadges, formatBadge, type NavBadgeKey, type NavBadges } from "@/lib/guild/nav-badges";
import { createClient } from "@/lib/supabase/client";
import { setAppIconBadge } from "@/lib/guild/app-badge";
import type { GuildNotification } from "@/lib/guild/types";
import { useGuildStore } from "@/components/guild/store-context";
import { outsideStorePath, parseGuildPath, storeRestOf } from "@/lib/guild/store-path";
import type { StoreConfig } from "@/lib/guild/stores";

type NavItem = {
  /** 店の中の道（""＝ホーム）。実際のリンクは store.path(to) で作る */
  to: string;
  label: string;
  short: string;
  icon: "tavern" | "guild" | "scroll" | "map" | "hero" | "key";
  exact?: boolean;
  /** この道の下も「ここにいる」とみなす */
  also?: string[];
  /** 未読の数を出すときの種類（lib/guild/nav-badges.ts） */
  badge?: NavBadgeKey;
};

// メニューの呼び名は店の設定（lib/guild/stores.ts）から。「クエスト」は DB の terms.quest と同じ
function buildNav(config: StoreConfig): { main: NavItem[]; master: NavItem } {
  return {
    main: [
      { to: "", label: "ホーム", short: "ホーム", icon: "tavern", exact: true },
      { to: "/members", label: config.rosterLabel, short: config.rosterLabel, icon: "guild", also: ["/requests"], badge: "guild" },
      { to: "/quests", label: config.terms.quest, short: config.terms.quest, icon: "scroll", badge: "quests" },
      { to: "/projects", label: "プロジェクト", short: "プロ\nジェクト", icon: "map" },
      { to: "/me", label: "マイページ", short: "マイ\nページ", icon: "hero" },
    ],
    master: { to: "/master", label: "管理者", short: "管理者", icon: "key", badge: "master" },
  };
}

function isUnder(rest: string, to: string) {
  return rest === to || rest.startsWith(to + "/");
}

/** rest＝今いる（または移ろうとしている）店の中の道 */
function isActive(rest: string, item: NavItem) {
  if (item.exact) return rest === item.to;
  return isUnder(rest, item.to) || (item.also ?? []).some((h) => isUnder(rest, h));
}

// コマンドを押してから、行き先の画面が届くまで仮の画面を出しておく上限。届かなければ元の画面に戻す
const PENDING_LIMIT_MS = 15000;


export function GuildShell({ children, isMaster, initialBadges }: { children: React.ReactNode; isMaster: boolean; initialBadges: NavBadges }) {
  const store = useGuildStore();
  const pathname = usePathname();
  // メニューの数字。はじめはサーバーが数えた値。layout は画面を移っても作り直されないので、移るたびにここで読み直す
  const [badges, setBadges] = useState(initialBadges);
  const [prevInitial, setPrevInitial] = useState(initialBadges);
  if (prevInitial !== initialBadges) {
    // サーバーが数え直した（router.refresh など）ら、そちらに合わせる
    setPrevInitial(initialBadges);
    setBadges(initialBadges);
  }
  useEffect(() => {
    let cancelled = false;
    const reload = () => {
      void createClient().rpc("sakaba_list_my_notifications", { p_guild_slug: store.slug }).then(({ data, error }) => {
        if (cancelled || error || !Array.isArray(data)) return;
        setBadges(countNavBadges(data as GuildNotification[]));
      });
    };
    reload();
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, store.slug]);
  // ホーム画面のアイコンの数字も、メニューの数字（合計）に合わせる
  const iconTotal = badges.total;
  useEffect(() => {
    setAppIconBadge(iconTotal);
  }, [iconTotal]);
  // コマンドを押した瞬間に、行き先の背景・いる所の印・仮の窓を先に出す（見た目だけ。移動そのものは Next.js のリンクのまま）。
  // loading.tsx は使わない：URLを直接開いたときに本体が動かなくなる事故があった（テツジン・同じ Next 16.1.1）
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
  // 酒場の中のリンク（コマンドも、画面の中の「▶ 〇〇」も）で別の道へ移るときに、仮の画面を先に出す。
  // Next.js のリンクはアプリ内で移るときだけ既定の動きを止めるので、それを見て判定する（新しいタブで開く・外のサイトは対象外）
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || parseGuildPath(url.pathname).kind === "none") return;
      if (url.pathname === window.location.pathname) return;
      setPending(url.pathname);
    };
    document.addEventListener("click", onClick);
    // ボタンから移るとき（useGuildRouter の push / replace）も、リンクと同じ仮の画面を出す
    const onNavigate = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (typeof path === "string" && path !== window.location.pathname) setPending(path);
    };
    window.addEventListener(GUILD_NAVIGATE_EVENT, onNavigate);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(GUILD_NAVIGATE_EVENT, onNavigate);
    };
  }, []);

  const nav = buildNav(store.config);
  const mobileNav = isMaster ? [...nav.main, nav.master] : nav.main;
  // 仮の画面を出している間は、行き先の道として背景とメニューを描く
  const shownPath = pending ?? pathname;
  const shownRest = storeRestOf(shownPath) ?? "";
  // 夜の酒場の絵は「酒場」の見た目の店だけ。落ち着いた見た目の店には敷かない
  const art = store.config.theme === "tavern" ? sceneArtOf(shownPath) : undefined;
  const scene = art !== undefined;

  return (
    <div className={cn("guild-theme min-h-screen", scene && "guild-scene")}>
      {scene && <GuildSceneArt art={art} dim={shownRest !== ""} />}
      <header className="sticky top-0 z-30 bg-guild-ink text-guild-paper">
        <div className="guild-px mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={store.path()} className="text-lg tracking-[0.2em]">
            {store.config.name}
          </Link>
          <div className="flex items-center gap-4">
            <FeedbackButton label="ご意見" className="text-xs text-guild-paper/80 hover:text-guild-accent-light" />
            <Link href={store.path("/notifications")} className="inline-flex items-center gap-1 text-xs text-guild-paper/80 hover:text-guild-accent-light">
              おしらせ
              <NavBadge count={badges.total} />
            </Link>
            <LogoutButton redirectTo={outsideStorePath("login")} showIcon={false} label="ログアウト" className="text-xs text-guild-paper/80 hover:text-guild-accent-light" />
          </div>
        </div>
      </header>

      <div className="guild-main-grid relative mx-auto grid max-w-6xl gap-8 px-4 pt-9 pb-28 sm:px-6 lg:grid-cols-[200px_1fr] lg:pb-14">
        {/* PC：コマンドの窓 */}
        <nav className="c-window guild-sidebar guild-px hidden self-start p-4 pt-7 lg:block" aria-label="メニュー">
          <span className="c-window-title">コマンド</span>
          <ul className="space-y-1">
            {nav.main.map((item) => (
              <li key={item.to}>
                <CommandLink item={item} href={store.path(item.to)} active={isActive(shownRest, item)} count={item.badge ? badges[item.badge] : 0} />
              </li>
            ))}
          </ul>
          {isMaster && <div className="c-dashed-top mt-4 pt-3">
            <p className="c-muted mb-1 text-[11px]">管理者のみ</p>
            <CommandLink item={nav.master} href={store.path(nav.master.to)} active={isActive(shownRest, nav.master)} count={badges.master} />
          </div>}
        </nav>

        <main className="min-w-0">
          {pending !== null && <GuildPageSkeleton />}
          {/* 仮の画面の間も今の画面は消さずに隠すだけ（届かなかったときにそのまま戻せるように） */}
          <div className="guild-page" hidden={pending !== null}>
            {children}
          </div>
        </main>
      </div>

      {/* スマホ：下のコマンド */}
      <nav
        className={cn(
          "guild-mobile-nav guild-px fixed inset-x-0 bottom-0 z-30 grid border-t-4 border-guild-ink bg-guild-paper pb-[env(safe-area-inset-bottom)] lg:hidden",
          isMaster ? "grid-cols-6" : "grid-cols-5",
        )}
        aria-label="メニュー"
      >
        {mobileNav.map((item) => {
          const active = isActive(shownRest, item);
          return (
            <Link
              key={item.to}
              href={store.path(item.to)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 border-r border-guild-ink/15 px-0.5 py-1.5 text-center leading-tight tracking-normal whitespace-pre-line last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-guild-ink focus-visible:outline-offset-[-4px]",
                isMaster ? "text-[11px]" : "text-xs",
                active ? "bg-guild-accent-light/35 text-guild-ink" : "text-guild-ink/70",
              )}
            >
              {/* いる所は金の線とアイコンで示す。文字も残し、初めての人にも行き先が伝わるようにする */}
              {active && <span className="guild-mobile-active absolute inset-x-3 top-0 h-1 bg-guild-ink" aria-hidden />}
              <span className="relative">
                <MobileNavIcon kind={item.icon} />
                <NavBadge count={item.badge ? badges[item.badge] : 0} className="absolute -top-1.5 -right-3.5" />
              </span>
              <span className="leading-[1.05]">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** 下のコマンド専用の16pxピクセル絵。線画アイコンではなく、酒場の道具として形をそろえる。 */
function MobileNavIcon({ kind }: { kind: NavItem["icon"] }) {
  const common = {
    viewBox: "0 0 16 16",
    width: 22,
    height: 22,
    className: "guild-mobile-icon shrink-0",
    fill: "currentColor",
    shapeRendering: "crispEdges" as const,
    "aria-hidden": true,
  };
  if (kind === "tavern") return <svg {...common}><path d="M2 2h8v2h2v1h2v7h-2v2H2v-2H1V4h1V2Zm2 2v8h6V4H4Zm8 3v3h1V7h-1ZM6 8h2v2H6V8Z" /></svg>;
  if (kind === "guild") return <svg {...common}><path d="M3 2h4v1h1v4H7v1H3V7H2V3h1V2Zm7 1h3v1h1v3h-1v1h-3V7H9V4h1V3ZM2 9h6l2 2v3H1v-4h1V9Zm8 0h3l2 2v3h-4v-3l-1-1V9Z" /></svg>;
  if (kind === "scroll") return <svg {...common}><path d="M3 1h9v1h1v3h-2V3H5v9h6v-2h2v3h-1v1H3v-1H2V2h1V1Zm3 4h4v1H6V5Zm0 3h5v1H6V8Z" /></svg>;
  if (kind === "map") return <svg {...common}><path d="M1 3h1V2l4 2 4-2 5 2v10h-1l-4-2-4 2-5-2V3Zm2 1v7l2 1V5L3 4Zm4 1v7l2-1V4L7 5Zm4-1v7l2 1V5l-2-1Z" /></svg>;
  if (kind === "hero") return <svg {...common}><path d="M5 1h6v1h1v5h-1v2h-1v1H6V9H5V7H4V2h1V1Zm1 2v3h5V3H6Zm-2 8h8v1h2v3H2v-3h2v-1Z" /></svg>;
  return <svg {...common}><path d="M2 2h6v1h1v5H8v1H6v2h3v2H7v2H4V9H2V8H1V3h1V2Zm1 2v3h3V4H3Zm6 6h5v2H9v-2Z" /></svg>;
}

function CommandLink({ item, href, active, count }: { item: NavItem; href: string; active: boolean; count: number }) {
  return (
    <Link
      href={href}
      data-active={active}
      aria-current={active ? "page" : undefined}
      className="rpg-cursor-row flex items-center gap-1.5 py-1.5 text-[15px] tracking-wider"
    >
      <span className="rpg-cursor">▶</span>
      {item.label}
      <NavBadge count={count} />
    </Link>
  );
}

/** 未読の数の赤い丸。0 のときは出さない。読み上げ用に「未読○件」を添える */
function NavBadge({ count, className }: { count: number; className?: string }) {
  const text = formatBadge(count);
  if (text === null) return null;
  return (
    <span className={cn("c-badge", className)}>
      <span aria-hidden>{text}</span>
      <span className="sr-only">未読{text}件</span>
    </span>
  );
}
