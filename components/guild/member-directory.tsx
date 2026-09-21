"use client";

// 仲間名鑑の絞り込み。AIで選ばず、条件で絞るだけ（なぜその人が出たか説明できるように）。

import { useMemo, useState } from "react";
import type { Profile } from "@/lib/guild/types";
import { MemberCard, Window } from "./cards";
import { CheckBox } from "./form-parts";

export function MemberDirectory({ members, memberTerm = "ギルドメンバー" }: { members: Profile[]; memberTerm?: string }) {
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
    const q = keyword.trim();
    if (!q) return true;
    // 非公開のまとまりの中身では引っかからないようにする（本番はDB側で返さない）
    const haystack = [
      m.display_name,
      m.headline,
      m.job,
      m.visible_groups.includes("work") ? [m.bio, m.can_help_with, ...m.keywords].join(" ") : "",
    ].join(" ");
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

      {filtered.length === 0 ? (
        <p className="c-card border-dashed px-4 py-10 text-center text-sm leading-relaxed">
          じょうけんに合う {memberTerm}が 見つかりませんでした。
          <br />
          <span className="c-muted">ギルドマスターに「こういう人いない？」と相談することもできます。</span>
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((m) => (
            <MemberCard key={m.id} profile={m} />
          ))}
        </div>
      )}
    </div>
  );
}
