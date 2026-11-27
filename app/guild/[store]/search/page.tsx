import Link from "next/link";
import { Building2, Search, UserRound } from "lucide-react";
import type { ConstructionCompany } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { INDUSTRIES, PREFECTURES, areaText, regionOf } from "@/lib/guild/look/sns-mock";
import { listGuildMembers } from "@/lib/guild/server-data";

type SearchParams = { q?: string; kind?: string; industry?: string; area?: string };

export default async function ConstructionSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { store } = await constructionContext();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const kind = params.kind === "companies" ? "companies" : "people";
  const industry = INDUSTRIES.find((item) => item === params.industry);
  const area = PREFECTURES.find((item) => item === params.area);
  const [members, companies] = await Promise.all([
    listGuildMembers(),
    constructionRows<ConstructionCompany>("sakaba_construction_list_companies"),
  ]);
  const names = new Map(members.map((person) => [person.id, person.display_name]));
  const byMember = new Map(companies.flatMap((company) => company.members.map((member) => [member.user_id, company] as const)));
  const matches = (fields: string[]) => query.split(/\s+/).every((word) => fields.join(" ").toLowerCase().includes(word.toLowerCase()));
  const people = members.filter((person) => {
    const company = byMember.get(person.id);
    return (!industry || person.industry === industry || company?.industries.includes(industry))
      && (!area || person.region === area || company?.areas.includes(area))
      && matches([person.display_name, person.name_kana ?? "", person.company_name ?? "", person.industry, person.region,
        ...((company?.areas ?? []).flatMap((value) => [value, regionOf(value) ?? ""]))]);
  });
  const businesses = companies.filter((company) => (!industry || company.industries.includes(industry))
    && (!area || company.areas.includes(area) || company.prefecture === area)
    && matches([company.name, company.prefecture, ...company.industries, company.business,
      ...company.areas.flatMap((value) => [value, regionOf(value) ?? ""])]));
  const href = (type: "people" | "companies") => {
    const qs = new URLSearchParams({ kind: type });
    if (query) qs.set("q", query);
    if (industry) qs.set("industry", industry);
    if (area) qs.set("area", area);
    return store.path("/search?" + qs.toString());
  };
  return <div className="sn-page sn-page--search">
    <div className="sn-band sn-sec">
      <form role="search" action={store.path("/search")} className="space-y-3">
        <input type="hidden" name="kind" value={kind} />
        <div className="sn-home-search"><label className="sn-search"><Search aria-hidden /><span className="sr-only">人・会社を探す</span>
          <input type="search" name="q" defaultValue={query} maxLength={100} placeholder="人・会社を探す（業種・地域・名前）" />
        </label><button type="submit" className="sn-search-go">探す</button></div>
        <details open={industry || area ? true : undefined}><summary className="sn-post-select-row cursor-pointer">絞り込み</summary>
          <div className="sn-form-sec">
            <label className="sn-field"><span>業種</span><select name="industry" defaultValue={industry ?? ""}><option value="">すべて</option>{INDUSTRIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="sn-field"><span>都道府県</span><select name="area" defaultValue={area ?? ""}><option value="">すべて</option>{PREFECTURES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button type="submit" className="sn-btn sn-btn--main">絞り込む</button>
          </div>
        </details>
      </form>
    </div>
    <nav className="sn-tabs" aria-label="検索対象">
      <Link href={href("people")} aria-current={kind === "people" ? "page" : undefined} className="sn-live-tab"><UserRound size={15} aria-hidden />人 {people.length}</Link>
      <Link href={href("companies")} aria-current={kind === "companies" ? "page" : undefined} className="sn-live-tab"><Building2 size={15} aria-hidden />会社 {businesses.length}</Link>
    </nav>
    {kind === "people" ? (people.length ? people.map((person) => <Link key={person.id} href={store.path("/members/" + person.id)} className="sn-want-row">
      <span className="sn-want-w">{person.display_name}</span>
      <span className="sn-want-sub">{[person.company_name, person.industry, person.region].filter(Boolean).join(" · ")}</span>
    </Link>) : <p className="sn-empty">条件に合う人は見つかりませんでした。</p>) :
      businesses.length ? businesses.map((company) => <details key={company.id} className="sn-want-row">
        <summary className="sn-want-w cursor-pointer">{company.name}</summary>
        <p className="sn-want-sub">{company.industries.join("・")} · {areaText(company.areas)}</p>
        {company.business && <p className="sn-want-sub whitespace-pre-wrap">{company.business}</p>}
        {company.website && <p className="sn-want-sub"><a href={company.website} rel="noreferrer" target="_blank">ウェブサイト</a></p>}
        {company.members.map((person) => <p className="sn-want-sub" key={person.user_id}><Link className="underline" href={store.path("/members/" + person.user_id)}>{names.get(person.user_id) ?? "会員"}</Link>{person.title && " · " + person.title}</p>)}
      </details>) : <p className="sn-empty">条件に合う会社は見つかりませんでした。</p>}
  </div>;
}
