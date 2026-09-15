"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Users,
  CalendarDays,
  PlayCircle,
  Loader2,
  Menu,
  X,
  ShieldCheck,
  Brain,
  Sparkles,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NavLinkPendingIndicator } from "@/components/nav/NavLinkPendingIndicator";
import { isActiveMember } from "@/lib/membership/plans";

// 管理画面（旧 /members/app/admin）は admin 専用ルート（/admin）に分離した。
// ユーザー向けナビからは外し、主催者は /admin/login から入る運用。
// 管理画面リンクは下の visibleNavItems で isAdmin の時だけ末尾に追加する。
// 表示ゲート:
//   * メンバー:   全ログイン会員に開放（無料会員も人脈一覧を閲覧可。
//                 個々のストーリー/人柄/連絡先は profile/[id] 側の相互開示ゲートで制御）
//   * 紹介コーチ: 全員に表示（無料はクリック→コーチページ側でアップグレード誘導＝ソフトペイウォール）
//   * 右腕AI DB:  ai_clone_tenant_members に行あり（AI Clone 契約者）
// dead link を出さないため、使えないユーザーには非表示。
// URL直叩きはページ側でも redirect / empty state でガードする（多重防御）。
const baseNavItems = [
  { href: "/members/app/mypage", label: "マイページ", icon: User },
  // 以下はコアループ確認しながら順次復活:
  // { href: "/members/app/board", label: "掲示板", icon: MessageSquareText },
  // { href: "/members/app/post", label: "会を探す", icon: CalendarSearch },
  // { href: "/members/app/members-admin", label: "つながり", icon: UserCog },
];
// メンバー一覧・紹介コーチとも全ログイン会員に表示（コーチは無料だと遷移先でアップグレード誘導）
const membersNavItem = {
  href: "/members/app/members",
  label: "メンバー",
  icon: Users,
};
// セミナー一覧（開催予定の勉強会・懇親会を見て申込む）。全ログイン会員に表示。
const seminarsNavItem = {
  href: "/members/app/seminars",
  label: "セミナー",
  icon: CalendarDays,
};
// 過去の勉強会（参加できなかった回の録画を見る）。
// **会員だけに出す。** 講義録画はオンライン会員以上の特典で、ページ側でも
// ゲートしている。ナビに出したまま入れないと「押したら弾かれる」体験になる。
// スマホの下タブは元から会員だけに出していたので、そちらに合わせた形。
const archiveNavItem = {
  href: "/members/app/seminars/archive",
  label: "過去の勉強会",
  icon: PlayCircle,
};
const cloneNavItem = { href: "/clone", label: "右腕AI（β版）", icon: Brain };
// 非会員（未課金）だけに出す、常設のアップグレード入口。
// mypage のステータスカード内訴求に加えて、どのページからでも 1 クリックで LP へ。
// 会員（plan='terakoya' / tier='paid'）には出さない（ガツガツさせない）。
const joinNavItem = {
  href: "/members/app/terakoya",
  label: "キャンパスに参加",
  icon: Sparkles,
};
// 2026-08-12 追加。**設定ページはどこからもリンクされていなかった。**
// 解約（Stripeカスタマーポータル）への唯一の入口がここなのに、サイドバーにも
// 下部タブにも無く、URLを直接打つしか到達手段が無かった。
// /tokushoho は「いつでも解約いただけます。所定の方法でお手続きください」と
// 書いており、その「所定の方法」に会員がたどり着けない状態だった。
// 会員登録・課金の有無に関わらず出す（解約したい人ほど迷ってはいけない）。
const settingsNavItem = {
  href: "/members/app/settings",
  label: "設定",
  icon: Settings,
};

interface MeInfo {
  name: string;
  email: string;
  initial: string;
  photoUrl: string | null;
}

export function AppSidebar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [me, setMe] = useState<MeInfo | null | "loading">("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasClone, setHasClone] = useState(false);
  // 課金済み会員か（plan='terakoya' / tier='paid'）。非会員にだけ参加導線を出すために使う。
  const [isMember, setIsMember] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ユーザー情報取得 + admin/tier/clone tenant 判定
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setMe(null);
        return;
      }

      // admin / applicant info / clone tenant member を並列取得
      const [adminRes, applicantRes, cloneRes] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase
          .from("applicants")
          .select("name, nickname, email, plan, tier, photo_url")
          .eq("id", user.id)
          .single(),
        supabase
          .from("ai_clone_tenant_members")
          .select("tenant_id")
          .eq("user_id", user.id)
          .limit(1),
      ]);

      if (cancelled) return;
      if (adminRes.data === true) setIsAdmin(true);
      if ((cloneRes.data ?? []).length > 0) setHasClone(true);

      const data = applicantRes.data;
      if (data) {
        // 判定は lib/membership/plans.ts に集約（新しい段を足してもここは不変）
        if (isActiveMember(data)) setIsMember(true);
        const displayName = data.nickname || data.name || data.email || "";
        setMe({
          name: displayName,
          email: data.email || user.email || "",
          initial: displayName.slice(0, 1).toUpperCase(),
          photoUrl: (data.photo_url as string | null) || null,
        });
      } else {
        setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // ナビ項目の動的構築:
  //   1) base（マイページ）は全員
  //   2) メンバー一覧は全ログイン会員（無料会員も人脈を閲覧＝相互開示で体験）
  //   3) 右腕AI DB は ai_clone_tenant_members 参加のみ
  //   4) 管理画面は admin のみ末尾に
  // 紹介コーチ nav はテラこや一本化に伴い撤去（機能コーチは右腕AI側の導線に残置）。
  const visibleNavItems = [
    ...baseNavItems,
    seminarsNavItem,
    ...(isMember ? [archiveNavItem] : []),
    membersNavItem,
    ...(isMember ? [] : [joinNavItem]),
    ...(hasClone ? [cloneNavItem] : []),
    settingsNavItem,
    ...(isAdmin
      ? [{ href: "/admin", label: "管理画面", icon: ShieldCheck }]
      : []),
  ];

  // ESC で drawer を閉じる + body scroll lock
  // （パス遷移時の自動close は drawer 内の Link onClick={onNavClick} で対応）
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* ─── Desktop sidebar (lg以上で固定表示) ─────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-gray-900 border-r border-gray-800">
        <SidebarContent
          me={me}
          pathname={pathname}
          navItems={visibleNavItems}
          onNavClick={() => {}}
        />
      </aside>

      {/* ─── Mobile top header (lg未満で常時表示) ─────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <Link
          href="/members/app/mypage"
          className="flex items-center gap-2 text-white"
        >
          <span className="text-lg">✦</span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight">HIROGARUキャンパス</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="メニューを開く"
          aria-expanded={drawerOpen}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ─── Mobile drawer overlay ─────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      {/* ─── Mobile drawer panel (右からスライドイン：ハンバーガー位置と一致) ─── */}
      <aside
        className={`lg:hidden fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-gray-900 border-l border-gray-800 flex flex-col transform transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="メニューを閉じる"
          className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent
          me={me}
          pathname={pathname}
          navItems={visibleNavItems}
          onNavClick={() => setDrawerOpen(false)}
        />
      </aside>

      {/* ─── Mobile bottom tab bar (lg未満で常時表示) ───────────────
          毎回ハンバーガーを開かずに主要導線へ1タップで飛べるようにする。
          全項目は載せず、コアの3導線 + 会員状態で切り替わる1枠 + メニュー(=ドロワー)。
          残り（右腕AI / 管理画面 / ログアウト等）はメニューから。 */}
      <BottomTabBar
        pathname={pathname}
        isMember={isMember}
        onOpenMenu={() => setDrawerOpen(true)}
        menuActive={drawerOpen}
      />
    </>
  );
}

// ─── モバイル下タブ ──────────────────────────────────────────────
interface BottomTabItem {
  href: string;
  label: string;
  icon: typeof User;
  /** true の時は完全一致でのみアクティブ（下位パスに吸われないため） */
  exact?: boolean;
}

function BottomTabBar({
  pathname,
  isMember,
  onOpenMenu,
  menuActive,
}: {
  pathname: string;
  isMember: boolean;
  onOpenMenu: () => void;
  menuActive: boolean;
}) {
  // 4枠目は会員状態で出し分け：未課金は参加導線、会員は過去の勉強会。
  const fourth: BottomTabItem = isMember
    ? {
        href: "/members/app/seminars/archive",
        label: "過去",
        icon: PlayCircle,
      }
    : {
        href: "/members/app/terakoya",
        label: "参加",
        icon: Sparkles,
      };

  const items: BottomTabItem[] = [
    { href: "/members/app/mypage", label: "マイページ", icon: User },
    { href: "/members/app/seminars", label: "セミナー", icon: CalendarDays, exact: true },
    { href: "/members/app/members", label: "メンバー", icon: Users },
    fourth,
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-gray-900 border-t border-gray-800 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
      aria-label="下部ナビゲーション"
    >
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
              isActive
                ? "text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
            <span className="tracking-tight leading-none">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="メニューを開く"
        className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
          menuActive ? "text-white" : "text-gray-400 hover:text-gray-200"
        }`}
      >
        <Menu className="w-5 h-5" />
        <span className="tracking-tight leading-none">メニュー</span>
      </button>
    </nav>
  );
}

// ─── 共通：サイドバー中身（desktop / mobile drawer 両方で使う） ───
interface NavItem {
  href: string;
  label: string;
  icon: typeof User;
}

interface SidebarContentProps {
  me: MeInfo | null | "loading";
  pathname: string;
  navItems: NavItem[];
  onNavClick: () => void;
}

function SidebarContent({
  me,
  pathname,
  navItems,
  onNavClick,
}: SidebarContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-gray-800 flex-shrink-0">
        <span className="text-xl">✦</span>
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold text-white tracking-tight">
            HIROGARUキャンパス
          </span>
        </span>
      </div>

      {/* My profile mini */}
      <div className="px-4 py-5 border-b border-gray-800 flex-shrink-0">
        {me === "loading" ? (
          <div className="flex items-center gap-3 text-gray-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>読み込み中...</span>
          </div>
        ) : me ? (
          <div className="flex items-center gap-3">
            {me.photoUrl ? (
              /* 編集で登録したプロフィール写真。無ければ頭文字の円にフォールバック。 */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={me.photoUrl}
                alt={`${me.name} のプロフィール写真`}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-700 flex-shrink-0 bg-gray-800"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 font-bold border-2 border-gray-700 flex-shrink-0">
                {me.initial || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{me.name}</p>
              <p className="text-xs text-gray-500 truncate">{me.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">未ログイン</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
              <NavLinkPendingIndicator />
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0">
        <LogoutButton
          redirectTo="/login"
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
    </>
  );
}
