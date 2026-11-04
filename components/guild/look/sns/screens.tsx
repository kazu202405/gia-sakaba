"use client";

// 見本の代表の画面：ホーム（探す欄・地域のチップ・探しています）・探す・人の詳しいページ・会社の詳しいページ。
// 残りの画面（人脈・案件・自分・管理者）も、ここと parts.tsx の部品で組む。

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import {
  INCOMING_INTRO_REQUESTS,
  INDUSTRIES,
  ME_ID,
  NETWORK_SUMMARY,
  RECENT_CONNECTIONS,
  REGION_NAMES,
  areaText,
  companyOf,
  filterByRegion,
  findCompany,
  findPerson,
  peopleOf,
  personContactRows,
  regionCounts,
  relationTo,
  relationToCompany,
  searchCompanies,
  searchPeople,
  shortName,
  sortByCloseness,
  wantPosts,
  type Industry,
  type Person,
  type Relation,
  type SearchFilter,
} from "@/lib/guild/look/sns-mock";
import { Avatar, CompanyFacts, CompanyRow, ContactList, IntroRequestButton, LicenseTags, Logo, PersonRow, PlainPill, RouteLine, Say, WantRow } from "./parts";
import { SnLink, useSnState } from "./store";
import { SearchFilters, ActiveSearchFilters } from "./search-filters";

// ---------- ホーム ----------

/** ホーム：検索 → 届いた紹介 → 探しています。地域は一覧の見出しで切り替える。 */
export function HomeScreen() {
  const { myPosts } = useSnState();
  const [region, setRegion] = useState<string | null>(null);
  const all = wantPosts(myPosts);
  const counts = regionCounts(all);
  const posts = sortByCloseness(filterByRegion(all, region));
  return (
    <div className="sn-page">
      <div className="sn-page-main">
        <div className="sn-band sn-sec">
          <SnLink to="/search" className="sn-search">
            <Search aria-hidden />
            人・会社を探す（業種・地域・名前）
          </SnLink>
        </div>
        <IncomingRequests />
        <section>
          <div className="sn-sec">
            <div className="sn-sec-h">
              <h2>探しています</h2>
              <div className="sn-feed-tools">
                <label className="sn-feed-area">
                  <MapPin size={14} aria-hidden /><span className="sr-only">案件の地域</span>
                  <select value={region ?? ""} onChange={(e) => setRegion(e.target.value || null)}>
                    <option value="">全国</option>
                    {REGION_NAMES.map((r) => <option key={r} value={r}>{r}（{counts[r]}）</option>)}
                  </select>
                </label>
                <span>近い順</span>
              </div>
            </div>
          </div>
          {posts.length === 0 ? (
            <p className="sn-empty">{region}の依頼は、まだありません。<br />地域を「全国」に戻すと、すべての依頼を見られます</p>
          ) : (
            <div>
              {posts.map((post) => (
                <WantRow key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
      <aside className="sn-page-side">
        <NetworkStats />
        <RecentFaces />
      </aside>
    </div>
  );
}

function NetworkStats() {
  return (
    <p className="sn-stats">
      <span>
        <b>{NETWORK_SUMMARY.direct}</b>人の知り合い
      </span>
      <span>
        その先に<b>{NETWORK_SUMMARY.second}</b>人
      </span>
    </p>
  );
}

/** まだ返事をしていない、届いた紹介のおねがい（藍の面）。押すとやり取りの画面で返事をする */
function IncomingRequests() {
  const { introReplies } = useSnState();
  const waiting = INCOMING_INTRO_REQUESTS.filter((r) => !introReplies[r.id]);
  return (
    <>
      {waiting.map((r) => {
        const from = findPerson(r.fromId);
        const to = findPerson(r.toId);
        if (!from || !to) return null;
        return (
          <div key={r.id} className="sn-ask">
            <Avatar person={from} />
            <p>
              <b>{from.name}さんから、紹介のおねがい</b>
              <small>あなた経由で{shortName(to)}さんとつながりたいそうです</small>
            </p>
            <SnLink to="/network" className="sn-ask-go">中身を見る</SnLink>
          </div>
        );
      })}
    </>
  );
}

function RecentFaces() {
  return (
    <section>
      <div className="sn-sec">
        <div className="sn-sec-h">
          <h2>最近つながった人</h2>
        </div>
      </div>
      <div className="sn-faces">
        {RECENT_CONNECTIONS.map((id) => {
          const p = findPerson(id);
          if (!p) return null;
          return (
            <SnLink key={id} to={`/people/${id}`}>
              <Avatar person={p} />
              {shortName(p)}さん
            </SnLink>
          );
        })}
      </div>
    </section>
  );
}

// ---------- 探す ----------

export function SearchScreen() {
  const { myCompany } = useSnState();
  const params = useSearchParams();
  const [tab, setTab] = useState<"people" | "companies">("people");
  const [filter, setFilter] = useState<SearchFilter>(() => {
    const region = params.get("region");
    const industry = params.get("industry") as Industry | null;
    return {
      query: params.get("q") ?? "",
      regions: region && REGION_NAMES.includes(region) ? [region] : [],
      industries: industry && (INDUSTRIES as readonly string[]).includes(industry) ? [industry] : [],
      licensedOnly: false,
      introducibleOnly: false,
    };
  });
  const people = searchPeople(filter);
  const companies = searchCompanies(filter, ME_ID, myCompany);
  const set = (patch: Partial<SearchFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="sn-page sn-page--search">
      <div className="sn-search-controls">
        <div className="sn-band sn-sec">
          <form role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="sn-search">
              <Search size={18} aria-hidden />
              <span className="sr-only">探す</span>
              <input type="search" enterKeyHint="search" value={filter.query} onChange={(e) => set({ query: e.target.value })} placeholder="人・会社・得意なことで探す" />
            </label>
          </form>
          <SearchFilters filter={filter} onChange={set} resultType={tab} />
        </div>
      </div>
      <div className="sn-page-main">
        <ActiveSearchFilters filter={filter} onChange={set} />
        <div className="sn-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")}>
            人 {people.length}
          </button>
          <button type="button" role="tab" aria-selected={tab === "companies"} onClick={() => setTab("companies")}>
            会社 {companies.length}
          </button>
        </div>
        <p className="sn-count">紹介できる順に並んでいます</p>
        {tab === "people" ? (
          people.length > 0 ? (
            <div className="sn-list">
              {people.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </div>
          ) : (
            <NoHit />
          )
        ) : companies.length > 0 ? (
          <div className="sn-list">
            {companies.map((c) => (
              <CompanyRow key={c.id} company={c} />
            ))}
          </div>
        ) : (
          <NoHit />
        )}
      </div>
    </div>
  );
}

function NoHit() {
  return (
    <p className="sn-empty">
      条件に合う人・会社が見つかりませんでした。
      <br />
      地域や業種をひとつ外してみてください
    </p>
  );
}

// ---------- 人の詳しいページ ----------

export function PersonScreen({ id }: { id: string }) {
  const { me } = useSnState();
  const person = id === me.id ? me : findPerson(id);
  if (!person) return <p className="sn-empty">この人は見つかりませんでした</p>;
  return <PersonView person={person} relation={relationTo(person.id)} />;
}

/**
 * 人の詳しいページの中身（マイページでも使う。自分なら relation は self で、紹介のボタンは出ない）。
 * マイページだけ、名刺の下に heroExtra（編集の入口と数）、プロフィールの下に children（依頼・知り合いなど）を足す。
 */
export function PersonView({ person, relation, preview = false, heroExtra, children }: { person: Person; relation: Relation; preview?: boolean; heroExtra?: React.ReactNode; children?: React.ReactNode }) {
  const { myCompany } = useSnState();
  const company = person.id === ME_ID ? myCompany : companyOf(person);
  // 知り合いは「連絡先を見る」から。知り合いでない人には「全員に見せる」にした項目だけ、はじめから出す
  const openContacts = relation.kind === "direct" || relation.kind === "self" ? [] : personContactRows(person, relation);
  return (
    <div className={children ? "sn-page sn-page--detail sn-page--me sn-person-profile" : "sn-page sn-page--detail sn-person-profile"}>
      <aside className="sn-page-side">
        <div className="sn-hero">
          {/* 名刺と同じ比率の枠：上に会社と役職、まん中に顔とふりがな・名前、下に許可と所在地 */}
          <div className="sn-card sn-person-card">
            <p className="sn-card-top">
              {company && <SnLink to={`/companies/${company.id}`}>{company.name}</SnLink>}
              <span>{person.title}</span>
            </p>
            <div className="sn-card-mid">
              <Avatar person={person} asOther={preview} />
              <div>
                <p className="sn-kana">{person.kana}</p>
                <h1>{person.name}</h1>
              </div>
            </div>
            <div className="sn-card-bottom">
              {company && <LicenseTags licenses={company.licenses} />}
              <p>{person.prefecture}{company && `　対応：${areaText(company.areas)}`}</p>
            </div>
          </div>
          <div className="sn-hero-say">
            <Say>{person.say}</Say>
            {person.talk.length > 0 && (
              <div className="sn-pills" aria-label="話のきっかけ">
                {person.talk.map((t) => (
                  <PlainPill key={t}>{t}</PlainPill>
                ))}
              </div>
            )}
          </div>
          {openContacts.length > 0 && <div className="sn-open-contact"><ContactList person={person} rows={openContacts} /></div>}
          {heroExtra}
        </div>
        {!preview && <RouteLine person={person} relation={relation} />}
      </aside>
      <div className="sn-page-main">
        <div className="sn-story">
          <Story k="これまで" v={person.past} />
          <Story k="いま" v={person.now} />
          <Story k="これから" v={person.future} />
        </div>
        <OfferWant offer={person.offer} want={person.want} />
        {/* 他の人から見たときの会社情報（連絡先は本人が選んだ見せる相手どおり）。マイページは自分の「会社情報」があるので出さない */}
        {company && relation.kind !== "self" && (
          <section className="sn-person-company">
            <div className="sn-sec-h"><h2>会社情報</h2><SnLink to={`/companies/${company.id}`}>会社のページ</SnLink></div>
            <CompanyFacts company={company} relation={relation} />
          </section>
        )}
        {children}
      </div>
      {relation.kind !== "self" && relation.kind !== "none" && (
        <div className="sn-sticky">
          <IntroRequestButton person={person} relation={relation} />
        </div>
      )}
    </div>
  );
}

function Story({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return (
    <div>
      <p className="sn-k">{k}</p>
      <p className="sn-v">{v}</p>
    </div>
  );
}

function OfferWant({ offer, want }: { offer: readonly string[]; want: readonly string[] }) {
  return (
    <div className="sn-pair">
      <div>
        <p className="sn-k">できること</p>
        <ul>
          {offer.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="sn-k">探していること</p>
        <ul>
          {want.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- 会社の詳しいページ ----------

export function CompanyScreen({ id }: { id: string }) {
  const { myCompany } = useSnState();
  const company = id === myCompany.id ? myCompany : findCompany(id);
  if (!company) return <p className="sn-empty">この会社は見つかりませんでした</p>;
  const { relation, person } = relationToCompany(company.id);
  const members = peopleOf(company.id);
  return (
    <div className="sn-page sn-page--detail">
      <aside className="sn-page-side">
        <div className="sn-hero">
          <div className="sn-card">
            <p className="sn-card-top">
              <span>{company.business}</span>
              <span>{company.prefecture}</span>
            </p>
            <div className="sn-card-mid">
              <Logo company={company} />
              <h1>{company.name}</h1>
            </div>
            <div className="sn-card-bottom">
              <LicenseTags licenses={company.licenses} />
              <p>対応：{areaText(company.areas)}</p>
            </div>
          </div>
          <p className="sn-v">{company.about}</p>
        </div>
        {person && <RouteLine person={person} relation={relation} />}
      </aside>
      <div className="sn-page-main">
        <CompanyFacts company={company} relation={relation} />
        <OfferWant offer={company.offer} want={company.want} />
        <section>
          <div className="sn-sec">
            <div className="sn-sec-h">
              <h2>この会社の人</h2>
            </div>
          </div>
          <div className="sn-list">
            {members.map((m: Person) => (
              <PersonRow key={m.id} person={m} />
            ))}
          </div>
        </section>
      </div>
      {person && relation.kind !== "self" && relation.kind !== "none" && (
        <div className="sn-sticky">
          <IntroRequestButton person={person} relation={relation} />
        </div>
      )}
    </div>
  );
}
