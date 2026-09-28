"use client";

// 仲間名鑑の絞り込み。AIで選ばず、条件で絞るだけ（なぜその人が出たか説明できるように）。

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Profile } from "@/lib/guild/types";
import type { SearchLevel } from "@/lib/guild/plan-usage";
import { memberMatchesQuery } from "@/lib/guild/member-search";
import { MemberCard, Window } from "./cards";
import { CheckBox } from "./form-parts";

export function MemberDirectory({ members, memberTerm = "ギルドメンバー", cardUrls = {}, searchLevel = "keyword" }: {
  members: Profile[];
  memberTerm?: string;
  /** 段で変わる探し方：list＝一覧だけ（フリー）／filter＝絞り込み＋めいし（プラス）／keyword＝＋キーワード（ビジネス） */
  searchLevel?: SearchLevel;
  /** 人ごとの名刺の表面の署名URL（「めいし」表示で使う） */
  cardUrls?: Record<string, string>;
}) {
  // いつもの一覧 と 名刺の表面を並べる「めいし」を切り替える
  const [view, setView] = useState<"list" | "cards">("list");
  const [keyword, setKeyword] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [acceptOnly, setAcceptOnly] = useState(false);

  const industries = useMemo(() => [...new Set(members.map((m) => m.industry))], [members]);
  const regions = useMemo(() => [...new Set(members.map((m) => m.region))], [members]);

  const canFilter = searchLevel !== "list";
  const canKeyword = searchLevel === "keyword";

  // 名前・職業での検索はどの段でも。絞り込みはプラスから、本文まではビジネスから
  const filtered = members.filter((m) => {
    if (canFilter && industry && m.industry !== industry) return false;
    if (canFilter && region && m.region !== region) return false;
    if (canFilter && acceptOnly && !m.accept_intro) return false;
    return memberMatchesQuery(m, keyword, searchLevel);
  });

  const hasFilter = keyword || (canFilter && (industry || region || acceptOnly));
  const shownView = canFilter ? view : "list";

  return (
    <div>
      <Window title="さがす">
        <label className="block">
          <span className="sr-only">{canKeyword ? "キーワード" : "名前・職業"}</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={canKeyword ? "キーワード（れい：採用、決算、ロゴ）" : "名前・職業で探す（れい：税理士）"}
            className="c-input h-11"
          />
        </label>
        {!canKeyword && <p className="c-muted mt-2 text-xs">{canFilter ? "自己紹介などの本文まで探すのは、ビジネスからです。" : "業種・地域での絞り込みと「めいし」表示はプラス、本文まで探すのはビジネスからです。"}<Link href="/guild/plan" className="ml-1 underline underline-offset-4">段をくらべる</Link></p>}
        {canFilter && <>
        {/* えらぶ欄の名前は 枠の外に出す（中に入れると スマホで 文字が切れる） */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <span className="c-muted mb-1 block text-xs">ぎょうしゅ</span>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="c-input h-11">
              <option value="">すべて</option>
              {industries.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="c-muted mb-1 block text-xs">ちいき</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="c-input h-11">
              <option value="">すべて</option>
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <CheckBox checked={acceptOnly} onChange={setAcceptOnly}>
            <span className="text-sm">しょうかいを受けつけている人だけ</span>
          </CheckBox>
        </div>
        </>}
      </Window>

      <div className="mt-6 mb-3 flex items-center justify-between text-sm">
        <span>{filtered.length}人 見つかりました</span>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setIndustry("");
              setRegion("");
              setAcceptOnly(false);
            }}
            className="c-muted text-xs underline underline-offset-4"
          >
            じょうけんを クリア
          </button>
        )}
      </div>

      {canFilter && <div className="flex items-center justify-end gap-3 text-sm" role="group" aria-label="表示のしかた">
        {([["list", "いつもの一覧"], ["cards", "めいし"]] as const).map(([mode, label]) => (
          <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={view === mode ? "underline underline-offset-4" : "c-muted"}>
            {label}
          </button>
        ))}
      </div>}

      {filtered.length === 0 ? (
        <p className="c-card border-dashed px-4 py-10 text-center text-sm leading-relaxed">
          じょうけんに合う {memberTerm}が 見つかりませんでした。
          <br />
          <span className="c-muted">管理者に「こういう人いない？」と相談することもできます。</span>
        </p>
      ) : (
        shownView === "cards" ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {filtered.map((m) => (
              <li key={m.id}>
                <Link href={`/guild/members/${m.id}`} className="block">
                  {cardUrls[m.id] ? (
                    <span className="c-card block aspect-[91/55] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 期限つきの署名URLの画像なので next/image を通さない */}
                      <img src={cardUrls[m.id]} alt={`${m.display_name}さんの名刺`} className="h-full w-full object-cover" loading="lazy" />
                    </span>
                  ) : (
                    // 名刺が無い人は、名前・職業・会社で作った名札を代わりに出す（並びに穴をあけない）
                    <span className="c-card flex aspect-[91/55] flex-col justify-between p-3">
                      <span className="c-muted block truncate text-[10px]">{m.show_company && m.company_name ? m.company_name : m.industry}</span>
                      <span className="block truncate text-base tracking-wider">{m.display_name}</span>
                      <span className="c-muted block truncate text-[10px]">{[m.job, m.region].filter(Boolean).join("・")}</span>
                    </span>
                  )}
                  <span className="mt-1 block truncate text-xs">{m.display_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((m) => (
              <MemberCard key={m.id} profile={m} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
