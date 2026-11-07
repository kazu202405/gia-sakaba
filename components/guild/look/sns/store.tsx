"use client";

// 見本の状態置き場：見本だけのつまみ（色）と、画面の中だけで動く操作（紹介のおねがい・反応）。
// 状態は再読み込みで元に戻ってよい。つまみの選択だけはこの端末に覚えておく（見比べやすくするため。読めなくても動く）。
// 移動は useSn().go（押した瞬間に仮の画面を出す共通の入口）。道は useSn().href で作る。

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import {
  BASE_NET,
  BUSINESS_CARDS,
  COMPANIES,
  DEFAULT_PALETTE,
  INTRO_RECORDS_SEED,
  ME_COMPANY_ID,
  ME_ID,
  PALETTES,
  PEOPLE,
  SNS_BASE,
  makeDirectMessage,
  openRelation,
  relationTo,
  todayIso,
  withConnection,
  withOwnerSettings,
  type BusinessCard,
  type Company,
  type NetState,
  type PaletteKey,
  type Person,
  type Relation,
  type SentMessage,
  type WantAnswer,
  type WantPost,
} from "@/lib/guild/look/sns-mock";
import type { IntroRecord, NetLevel } from "@/lib/guild/look/sns-network";

type Ctx = {
  palette: PaletteKey;
  setPalette: (p: PaletteKey) => void;
  reactions: ReadonlySet<string>;
  toggleReaction: (key: string) => void;
  /** つながりの判定に使う設定と、紹介でつながった人（relationTo などにそのまま渡す） */
  net: NetState;
  /** 自分の公開レベルの設定を置き換える（一括と、知り合いごとの個別） */
  saveNetSettings: (ownerId: string, level: NetLevel, overrides: Readonly<Record<string, NetLevel>>) => void;
  /** 紹介でつながった2人を知り合いに足す */
  addConnection: (a: string, b: string) => void;
  /** 紹介依頼の記録。足す・置き換える（履歴は sns-network.ts の関数が足すだけ） */
  introRecords: readonly IntroRecord[];
  addIntroRecord: (record: IntroRecord) => void;
  updateIntroRecord: (id: string, fn: (record: IntroRecord) => IntroRecord) => void;
  /** 直接送ったメッセージ。sendMessage は、直接連絡OKの相手にしか送らない（送れたら true） */
  sentMessages: readonly SentMessage[];
  sendMessage: (toId: string, text: string) => boolean;
  /** 自分が足した投稿・送った答え */
  myPosts: readonly WantPost[];
  addPost: (post: WantPost) => void;
  myAnswers: readonly WantAnswer[];
  addAnswer: (answer: WantAnswer) => void;
  /** 自分のプロフィール（編集すると見る画面に反映される） */
  me: Person;
  saveMe: (patch: Partial<Pick<Person, "name" | "kana" | "title" | "prefecture" | "say" | "contact" | "contactReveal" | "past" | "now" | "future" | "talk" | "offer" | "want" | "openToIntro">>) => void;
  /** 自分の会社（編集すると、マイページ・会社のページ・探すに反映される） */
  myCompany: Company;
  saveMyCompany: (company: Company) => void;
  /** 管理者：名刺の仮登録と、「別の人」と選んだ組 */
  cards: readonly BusinessCard[];
  updateCards: (fn: (prev: readonly BusinessCard[]) => readonly BusinessCard[]) => void;
  distinctPairs: ReadonlySet<string>;
  markDistinct: (key: string) => void;
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

function parsePrefs(raw: string): { palette: PaletteKey } {
  let obj: { palette?: unknown } = {};
  try {
    obj = raw ? JSON.parse(raw) : {};
  } catch {
    obj = {};
  }
  return {
    // 昔の色の名前（常磐など）が残っていても、既定の藍に戻る
    palette: PALETTES.find((x) => x.key === obj.palette)?.key ?? DEFAULT_PALETTE,
  };
}

function writePrefs(prefs: { palette: PaletteKey }) {
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
  const { palette } = parsePrefs(raw);
  const [reactions, setReactions] = useState<ReadonlySet<string>>(new Set());
  const [net, setNet] = useState<NetState>(BASE_NET);
  const [introRecords, setIntroRecords] = useState<readonly IntroRecord[]>(INTRO_RECORDS_SEED);
  const [sentMessages, setSentMessages] = useState<readonly SentMessage[]>([]);
  const [myPosts, setMyPosts] = useState<readonly WantPost[]>([]);
  const [myAnswers, setMyAnswers] = useState<readonly WantAnswer[]>([]);
  const [me, setMe] = useState<Person>(() => PEOPLE.find((p) => p.id === ME_ID) as Person);
  const [myCompany, setMyCompany] = useState<Company>(() => COMPANIES.find((c) => c.id === ME_COMPANY_ID) as Company);
  const [cards, setCards] = useState<readonly BusinessCard[]>(BUSINESS_CARDS);
  const [distinctPairs, setDistinctPairs] = useState<ReadonlySet<string>>(new Set());

  const value = useMemo<Ctx>(() => ({
    palette,
    setPalette: (p) => writePrefs({ palette: p }),
    reactions,
    toggleReaction: (key) => setReactions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    }),
    net,
    saveNetSettings: (ownerId, level, overrides) => setNet((prev) => withOwnerSettings(prev, ownerId, level, overrides)),
    addConnection: (a, b) => setNet((prev) => withConnection(prev, a, b)),
    introRecords,
    addIntroRecord: (record) => setIntroRecords((prev) => [...prev, record]),
    updateIntroRecord: (id, fn) => setIntroRecords((prev) => prev.map((r) => (r.id === id ? fn(r) : r))),
    sentMessages,
    sendMessage: (toId, text) => {
      // 関数の中でも、直接連絡OKの相手かを確かめる（だめなら何もしない）
      const message = makeDirectMessage(net, toId, text, todayIso());
      if (!message) return false;
      setSentMessages((prev) => [...prev, message]);
      return true;
    },
    myPosts,
    addPost: (post) => setMyPosts((prev) => [post, ...prev]),
    myAnswers,
    addAnswer: (answer) => setMyAnswers((prev) => [...prev, answer]),
    me,
    saveMe: (patch) => setMe((prev) => ({ ...prev, ...patch })),
    myCompany,
    saveMyCompany: setMyCompany,
    cards,
    updateCards: (fn) => setCards((prev) => fn(prev)),
    distinctPairs,
    markDistinct: (key) => setDistinctPairs((prev) => new Set(prev).add(key)),
  }), [palette, reactions, net, introRecords, sentMessages, myPosts, myAnswers, me, myCompany, cards, distinctPairs]);

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

/**
 * 自分から見たその人とのつながり（store の net で決める。画面ごとに判定を書かない）。
 * 伏せた道は、人のページ・一覧には出さない（道なし扱い）。伏せたつながりは maskedConnections で別に出す。
 */
export function useRelation(targetId: string): Relation {
  const { net } = useSnState();
  return openRelation(relationTo(targetId, ME_ID, net));
}
