// 名鑑の検索で照らし合わせる文字。段で範囲が変わる（0114）。
// 名前・よみ・職業はどの段でも探せる（気になる人を見つけて申請するため）。本文まで探すのはビジネスから。

import type { Profile } from "./types";
import type { SearchLevel } from "./plan-usage";

type Searchable = Pick<Profile, "display_name" | "name_kana" | "job" | "headline" | "company_name" | "industry" | "region" | "bio" | "values_text" | "looking_for" | "keywords">;

export function memberMatchesQuery(member: Searchable, query: string, level: SearchLevel): boolean {
  const q = query.trim().toLocaleLowerCase("ja");
  if (!q) return true;
  const fields = level === "keyword"
    ? [member.display_name, member.name_kana, member.job, member.headline, member.company_name, member.industry, member.region, member.bio, member.values_text, member.looking_for, ...member.keywords]
    : [member.display_name, member.name_kana, member.job];
  return fields.filter(Boolean).join(" ").toLocaleLowerCase("ja").includes(q);
}
