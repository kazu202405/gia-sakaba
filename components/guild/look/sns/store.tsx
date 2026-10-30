"use client";

// 見本の状態置き場：見本だけのつまみ（色・ホームの形）と、画面の中だけで動く操作（紹介のおねがい・反応）。
// 状態は再読み込みで元に戻ってよい。つまみの選択だけはこの端末に覚えておく（見比べやすくするため。読めなくても動く）。
// 移動は useSn().go（押した瞬間に仮の画面を出す共通の入口）。道は useSn().href で作る。

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import {
  DEFAULT_HOME_STYLE,
  DEFAULT_PALETTE,
  HOME_STYLES,
  PALETTES,
  SNS_BASE,
  type HomeStyle,
  type PaletteKey,
} from "@/lib/guild/look/sns-mock";

/** 送った紹介のおねがい（相手の id → おねがいした知り合いの id） */
type SentIntros = Readonly<Record<string, string>>;

type Ctx = {
  palette: PaletteKey;
  setPalette: (p: PaletteKey) => void;
  homeStyle: HomeStyle;
  setHomeStyle: (h: HomeStyle) => void;
  sentIntros: SentIntros;
  addSentIntro: (targetId: string, viaId: string) => void;
  reactions: ReadonlySet<string>;
  toggleReaction: (key: string) => void;
};

const SnContext = createContext<Ctx | null>(null);
const PREF_KEY = "sns-look-prefs";

// つまみの選択はこの端末の localStorage に置き、useSyncExternalStore で読む（サーバーでは既定の値）
const prefListeners = new Set<() => void>();

function readPrefsRaw(): string {
  try {
    return window.localStorage.getItem(PREF_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribePrefs(listener: () => void) {
  prefListeners.add(listener);
  return () => {
    prefListeners.delete(listener);
  };
}

function parsePrefs(raw: string): { palette: PaletteKey; homeStyle: HomeStyle } {
  let obj: { palette?: unknown; homeStyle?: unknown } = {};
  try {
    obj = raw ? JSON.parse(raw) : {};
  } catch {
    obj = {};
  }
  return {
    palette: PALETTES.find((x) => x.key === obj.palette)?.key ?? DEFAULT_PALETTE,
    homeStyle: HOME_STYLES.find((x) => x.key === obj.homeStyle)?.key ?? DEFAULT_HOME_STYLE,
  };
}

function writePrefs(prefs: { palette: PaletteKey; homeStyle: HomeStyle }) {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    // 覚えられなくても見本は動く（この画面の間だけの選択になる）
  }
  memoryPrefs = JSON.stringify(prefs);
  prefListeners.forEach((l) => l());
}

// localStorage が使えない端末でも、この画面の間は選択が効くように
let memoryPrefs = "";

export function SnProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribePrefs, () => readPrefsRaw() || memoryPrefs, () => "");
  const { palette, homeStyle } = parsePrefs(raw);
  const [sentIntros, setSentIntros] = useState<SentIntros>({});
  const [reactions, setReactions] = useState<ReadonlySet<string>>(new Set());

  const value = useMemo<Ctx>(() => ({
    palette,
    setPalette: (p) => writePrefs({ palette: p, homeStyle }),
    homeStyle,
    setHomeStyle: (h) => writePrefs({ palette, homeStyle: h }),
    sentIntros,
    addSentIntro: (targetId, viaId) => setSentIntros((prev) => ({ ...prev, [targetId]: viaId })),
    reactions,
    toggleReaction: (key) => setReactions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    }),
  }), [palette, homeStyle, sentIntros, reactions]);

  return <SnContext.Provider value={value}>{children}</SnContext.Provider>;
}

export function useSnState(): Ctx {
  const ctx = useContext(SnContext);
  if (!ctx) throw new Error("SnProvider の外で useSnState が呼ばれました");
  return ctx;
}

export function snPath(path: string): string {
  return `${SNS_BASE}${path}`;
}

export function useSn() {
  const router = useGuildRouter();
  const href = useCallback((path: string) => snPath(path), []);
  const go = useCallback((path: string) => router.push(snPath(path)), [router]);
  return { href, go };
}

/** 見本の中のリンク */
export function SnLink({ to, ...rest }: { to: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  return <Link {...rest} href={snPath(to)} />;
}
