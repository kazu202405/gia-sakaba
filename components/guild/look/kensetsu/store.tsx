"use client";

// モックの状態置き場と、見る人（?as=）・道の作り方の入口。
// 状態は画面の中だけ（再読み込みで元に戻る）。動かし方は lib/guild/look/kensetsu-mock-state.ts の reduce。
// 道は必ず useK().href で作る（?as= を引き継ぐため）。移動は useK().go（押した瞬間に仮の画面を出す共通の入口）。

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { DEFAULT_ROLE, KENSETSU_BASE, MEMBERS, MOCK_NOW_BASE, parseRole, roleInfo, type Member, type Role } from "@/lib/guild/look/kensetsu-mock";
import { initialState, reduce, type MockAction, type MockState } from "@/lib/guild/look/kensetsu-mock-state";

type Ctx = { state: MockState; dispatch: (action: MockAction) => void };
const MockContext = createContext<Ctx | null>(null);

export function KensetsuProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <MockContext.Provider value={value}>{children}</MockContext.Provider>;
}

export function useMock(): Ctx {
  const ctx = useContext(MockContext);
  if (!ctx) throw new Error("KensetsuProvider の外で useMock が呼ばれました");
  return ctx;
}

const LOADED_AT = Date.now();

/** モック上の「いま」。起点を固定し、開いてからの経過だけ進める（サーバーと画面の表示を食い違わせない）。操作の中でだけ呼ぶ */
export function mockNow(): number {
  return MOCK_NOW_BASE + (Date.now() - LOADED_AT);
}

/** 道に ?as= を付ける。既定の見る人（相談する人）は付けない */
export function withRole(path: string, role: Role): string {
  const full = `${KENSETSU_BASE}${path}`;
  if (role === DEFAULT_ROLE) return full;
  return `${full}${full.includes("?") ? "&" : "?"}as=${role}`;
}

export function useK() {
  const params = useSearchParams();
  const role = parseRole(params.get("as"));
  const router = useGuildRouter();
  const { state } = useMock();
  const personaId = roleInfo(role).personaId;
  const persona: Member = state.members.find((m) => m.id === personaId) ?? MEMBERS[0];
  const href = useCallback((path: string) => withRole(path, role), [role]);
  const go = useCallback((path: string) => router.push(withRole(path, role)), [router, role]);
  return { role, persona, href, go, params };
}

/** モックの中のリンク。?as= を引き継ぐ */
export function KLink({ to, ...rest }: { to: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const { href } = useK();
  return <Link {...rest} href={href(to)} />;
}
