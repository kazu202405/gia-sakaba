"use client";

// 見本の代表の画面：ホーム（探す中心／近況が流れる）・探す・人の詳しいページ・会社の詳しいページ。
// 残りの画面（人脈・案件・自分・管理者）も、ここと parts.tsx の部品で組む。

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import {
  INCOMING_INTRO_REQUESTS,
  INDUSTRIES,
  NETWORK_SUMMARY,
  POSTS,
  RECENT_CONNECTIONS,
  REGION_NAMES,
  areaText,
  companyOf,
  findCompany,
  findPerson,
  peopleOf,
  relationTo,
  relationToCompany,
  searchCompanies,
  searchPeople,
  shortName,
  type Industry,
  type Person,
  type Post,
  type Relation,
  type SearchFilter,
} from "@/lib/guild/look/sns-mock";
import { Avatar, CompanyRow, IntroRequestButton, LicenseTags, Logo, PersonRow, RouteLine, Say } from "./parts";
import { SnLink, useSn, useSnState } from "./store";

// ---------- ホーム ----------

export function HomeScreen() {
  const { homeStyle } = useSnState();
  return homeStyle === "feed" ? <FeedHome /> : <SearchHome />;
}

/** ホームの検索窓。入れて決定すると「探す」へ移る */
function HomeSearch() {
  const { go } = useSn();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
      }}
    >
      <label className="sn-search">
        <Search size={18} aria-hidden />
        <span className="sr-only">探す</span>
        <input type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="人・会社・得意なことで探す" />
      </label>
    </form>
  );
}

function SearchHome() {
  const wants = POSTS.filter((p): p is Extract<Post, { kind: "want" }> => p.kind === "want");
  return (
    <div className="sn-page">
      <div className="sn-page-main">
        <div className="sn-band sn-sec">
          <HomeSearch />
          <div className="sn-chips">
            {INDUSTRIES.slice(0, 3).map((i) => (
              <SnLink key={i} to={`/search?industry=${encodeURIComponent(i)}`} className="sn-chip">
                {i}
              </SnLink>
            ))}
            {REGION_NAMES.map((r) => (
              <SnLink key={r} to={`/search?region=${encodeURIComponent(r)}`} className="sn-chip">
                {r}
              </SnLink>
            ))}
          </div>
        </div>
        <IncomingRequests />
        <section>
          <div className="sn-sec">
            <div className="sn-sec-h">
              <h2>いま、こんな人を探しています</h2>
            </div>
          </div>
          <div className="sn-rail">
            {wants.map((w) => {
              const author = findPerson(w.authorId);
              if (!author) return null;
              return (
                <SnLink key={w.id} to={`/people/${author.id}`}>
                  <Avatar person={author} />
                  <Say>{w.text}</Say>
                  <p className="sn-sub">
                    {author.name}・{w.ago}
                  </p>
                </SnLink>
              );
            })}
          </div>
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

/** まだ返事をしていない、届いた紹介のおねがい。押すと人脈の画面で返事をする */
function IncomingRequests() {
  const { introReplies } = useSnState();
  const waiting = INCOMING_INTRO_REQUESTS.filter((r) => !introReplies[r.id]);
  if (waiting.length === 0) return null;
  return (
    <section>
      <div className="sn-sec">
        <div className="sn-sec-h">
          <h2>紹介のおねがい</h2>
          <span>{waiting.length}件</span>
        </div>
      </div>
      {waiting.map((r) => {
        const from = findPerson(r.fromId);
        const to = findPerson(r.toId);
        if (!from || !to) return null;
        return (
          <SnLink key={r.id} to="/network?tab=intro" className="sn-ask">
            <Avatar person={from} />
            <p>
              <b>{from.name}さん</b>が、あなた経由で<b>{shortName(to)}さん</b>とつながりたいそうです
            </p>
          </SnLink>
        );
      })}
    </section>
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

function FeedHome() {
  return (
    <div className="sn-page">
      <div className="sn-page-main">
        <div className="sn-band sn-sec">
          <HomeSearch />
        </div>
        <IncomingRequests />
        <div className="sn-gap" />
        {POSTS.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
      <aside className="sn-page-side">
        <NetworkStats />
        <RecentFaces />
      </aside>
    </div>
  );
}

function FeedPost({ post }: { post: Post }) {
  const { reactions, toggleReaction } = useSnState();
  const author = findPerson(post.authorId);
  if (!author) return null;
  const company = companyOf(author);

  if (post.kind === "connected") {
    const other = findPerson(post.otherId);
    if (!other) return null;
    return (
      <div className="sn-slim">
        <Avatar person={author} />
        <p>
          <b>{author.name}さん</b>と<b>{other.name}さん</b>がつながりました　{post.ago}
        </p>
      </div>
    );
  }

  const head = (
    <SnLink to={`/people/${author.id}`} className="sn-post-head">
      <Avatar person={author} />
      <span>
        <span className="sn-post-name">{author.name}</span>
        <span className="sn-sub">{post.kind === "profile" ? `「${post.field}」を書き換えました　${post.ago}` : `${company?.name ?? ""}・${post.ago}`}</span>
      </span>
    </SnLink>
  );

  const react = (key: string, label: string, count: number) => {
    const on = reactions.has(`${post.id}:${key}`);
    return (
      <button type="button" aria-pressed={on} onClick={() => toggleReaction(`${post.id}:${key}`)}>
        {label} {count + (on ? 1 : 0)}
      </button>
    );
  };

  return (
    <article className="sn-post">
      {head}
      {post.kind === "want" && (
        <>
          <p className="sn-want">
            {post.text}
            <small>
              {post.industry}／{post.areas.join("・")}　{post.detail}
            </small>
          </p>
          <div className="sn-react">
            {react("know", "知ってる人いるよ", post.knowCount)}
            {react("can", "自分がやれる", post.canDoCount)}
          </div>
        </>
      )}
      {post.kind === "news" && (
        <>
          <p className="sn-post-body">{post.text}</p>
          {post.photo && (
            <div className="sn-photo" role="img" aria-label={post.photo}>
              {post.photo}
            </div>
          )}
          <div className="sn-react">{react("like", "いいね", post.likeCount)}</div>
        </>
      )}
      {post.kind === "profile" && <p className="sn-post-body">{post.text}</p>}
    </article>
  );
}

// ---------- 探す ----------

function toggle<T>(list: readonly T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function SearchScreen() {
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
  const companies = searchCompanies(filter);
  const set = (patch: Partial<SearchFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="sn-page sn-page--filters">
      <aside className="sn-page-side">
        <div className="sn-band sn-sec">
          <form role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="sn-search">
              <Search size={18} aria-hidden />
              <span className="sr-only">探す</span>
              <input type="search" enterKeyHint="search" value={filter.query} onChange={(e) => set({ query: e.target.value })} placeholder="人・会社・得意なことで探す" />
            </label>
          </form>
          <div className="sn-chips" role="group" aria-label="地域">
            {REGION_NAMES.map((r) => (
              <button key={r} type="button" className="sn-chip" aria-pressed={filter.regions.includes(r)} onClick={() => set({ regions: toggle(filter.regions, r) })}>
                {r}
              </button>
            ))}
          </div>
          <div className="sn-chips" role="group" aria-label="業種と条件">
            {INDUSTRIES.map((i) => (
              <button key={i} type="button" className="sn-chip" aria-pressed={filter.industries.includes(i)} onClick={() => set({ industries: toggle(filter.industries, i) })}>
                {i}
              </button>
            ))}
            <button type="button" className="sn-chip" aria-pressed={filter.licensedOnly} onClick={() => set({ licensedOnly: !filter.licensedOnly })}>
              許可・登録が確認済み
            </button>
            <button type="button" className="sn-chip" aria-pressed={filter.introducibleOnly} onClick={() => set({ introducibleOnly: !filter.introducibleOnly })}>
              紹介できる人だけ
            </button>
          </div>
        </div>
      </aside>
      <div className="sn-page-main">
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
      条件に合う人がいません。
      <br />
      地域や業種をひとつ外してみてください
    </p>
  );
}

// ---------- 人の詳しいページ ----------

export function PersonScreen({ id }: { id: string }) {
  const person = findPerson(id);
  if (!person) return <p className="sn-empty">この人は見つかりませんでした</p>;
  return <PersonView person={person} relation={relationTo(person.id)} />;
}

/** 人の詳しいページの中身（自分のページでも使う。自分なら relation は self で、紹介のボタンは出ない） */
export function PersonView({ person, relation }: { person: Person; relation: Relation }) {
  const company = companyOf(person);
  return (
    <div className="sn-page sn-page--detail">
      <aside className="sn-page-side">
        <div className="sn-hero">
          <Avatar person={person} />
          <h1>{person.name}</h1>
          <p className="sn-meta">
            {company ? (
              <SnLink to={`/companies/${company.id}`}>
                <u>{company.name}</u>
              </SnLink>
            ) : null}
            　{person.title}（{person.prefecture}）
          </p>
          <Say>{person.say}</Say>
          {person.talk.length > 0 && (
            <div className="sn-chips sn-chips--static" aria-label="話のきっかけ">
              {person.talk.map((t) => (
                <span key={t} className="sn-chip">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <RouteLine person={person} relation={relation} />
      </aside>
      <div className="sn-page-main">
        <div className="sn-story">
          <Story k="これまで" v={person.past} />
          <Story k="いま" v={person.now} />
          <Story k="これから" v={person.future} />
        </div>
        <OfferWant offer={person.offer} want={person.want} />
        {company && (
          <div className="sn-sec">
            <LicenseTags licenses={company.licenses} />
          </div>
        )}
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
  const company = findCompany(id);
  if (!company) return <p className="sn-empty">この会社は見つかりませんでした</p>;
  const { relation, person } = relationToCompany(company.id);
  const members = peopleOf(company.id);
  return (
    <div className="sn-page sn-page--detail">
      <aside className="sn-page-side">
        <div className="sn-hero">
          <Logo company={company} />
          <h1>{company.name}</h1>
          <p className="sn-meta">
            {company.prefecture}／{company.business}
          </p>
          <p className="sn-v">{company.about}</p>
        </div>
        {person && <RouteLine person={person} relation={relation} />}
      </aside>
      <div className="sn-page-main">
        <dl className="sn-dl">
          <div>
            <dt>対応エリア</dt>
            <dd>{areaText(company.areas)}</dd>
          </div>
          <div>
            <dt>得意なこと</dt>
            <dd>{company.specialties.join("・")}</dd>
          </div>
          <div>
            <dt>許可・登録</dt>
            <dd>
              <LicenseTags licenses={company.licenses} />
            </dd>
          </div>
        </dl>
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
