"use client";

// 仲間名鑑の絞り込み。AIで選ばず、条件で絞るだけ（なぜその人が出たか説明できるように）。

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Profile } from "@/lib/guild/types";
import { MemberCard, Window } from "./cards";
import { CheckBox } from "./form-parts";

export function MemberDirectory({ members, memberTerm = "ギルドメンバー", cardUrls = {} }: {
  members: Profile[];
  memberTerm?: string;
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

  const filtered = members.filter((m) => {
    if (industry && m.industry !== industry) return false;
    if (region && m.region !== region) return false;
    if (acceptOnly && !m.accept_intro) return false;
    const q = keyword.trim().toLocaleLowerCase("ja");
    if (!q) return true;
    const haystack = [
      m.display_name,
      m.name_kana,
      m.headline,
      m.company_name,
      m.industry,
      m.job,
      m.region,
      m.bio,
      m.values_text,
      m.looking_for,
      ...m.keywords,
    ].join(" ").toLocaleLowerCase("ja");
    return haystack.includes(q);
  });

  const hasFilter = keyword || industry || region || acceptOnly;

  return (
    <div>
      <Window title="さがす">
        <label className="block">
          <span className="sr-only">キーワード</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="キーワード（れい：採用、決算、ロゴ）"
            className="c-input h-11"
          />
        </label>
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

      <div className="flex items-center justify-end gap-3 text-sm" role="group" aria-label="表示のしかた">
        {([["list", "いつもの一覧"], ["cards", "めいし"]] as const).map(([mode, label]) => (
          <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={view === mode ? "underline underline-offset-4" : "c-muted"}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="c-card border-dashed px-4 py-10 text-center text-sm leading-relaxed">
          じょうけんに合う {memberTerm}が 見つかりませんでした。
          <br />
          <span className="c-muted">ギルドマスターに「こういう人いない？」と相談することもできます。</span>
        </p>
      ) : (
        view === "cards" ? (
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
