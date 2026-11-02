"use client";

// 見本のマイページ（設計書5-5・6-7、10-31：メニュー「マイページ」）：自分のプロフィール・出した依頼・知り合い・招待・設定・管理者の入口。
// プロフィールの編集は /me/edit。

import { useRef, useState } from "react";
import { ChevronRight, Eye, Plus, Settings2, ShieldCheck, UserPlus } from "lucide-react";
import { uiToast } from "@/lib/ui-dialog";
import {
  ME_ID,
  NETWORK_SUMMARY,
  companyOf,
  directPeople,
  inviteUrl,
  joinLines,
  relationTo,
  secondDegreePeople,
  splitLines,
  wantPosts,
  type Person,
} from "@/lib/guild/look/sns-mock";
import { CopyUrlButton, SEND_MS } from "./flow";
import { Avatar, RelationLine, WantRow } from "./parts";
import { PersonView } from "./screens";
import { SnLink, useSn, useSnState } from "./store";

type ContactTab = "direct" | "second";

// 知り合いが増えても招待・設定が遠くならないよう、はじめに出す人数
const CONTACTS_PREVIEW = 3;

export function MeScreen() {
  const { me, myPosts } = useSnState();
  const [contactTab, setContactTab] = useState<ContactTab>("direct");
  const mine = wantPosts(myPosts).filter((p) => p.authorId === ME_ID);
  const url = inviteUrl(ME_ID);
  return (
    <PersonView
      person={me}
      relation={{ kind: "self" }}
      heroExtra={
        <>
          <div className="sn-me-actions">
            <SnLink to="/me/edit" className="sn-btn sn-btn--main">プロフィールを編集</SnLink>
            <SnLink to="/me/preview" className="sn-btn"><Eye aria-hidden />人からの見え方</SnLink>
          </div>
          {/* 数はそのまま目次になる（プロフィールの下の、それぞれのまとまりへ飛ぶ） */}
          <nav className="sn-me-stats" aria-label="マイページの中の場所">
            <a href="#sn-me-contacts" onClick={() => setContactTab("direct")}><b>{NETWORK_SUMMARY.direct}</b>知り合い</a>
            <a href="#sn-me-contacts" onClick={() => setContactTab("second")}><b>{NETWORK_SUMMARY.second}</b>その先に</a>
            <a href="#sn-me-requests"><b>{mine.length}</b>出した依頼</a>
          </nav>
        </>
      }
    >
      <section id="sn-me-requests" className="sn-me-sec">
        <div className="sn-sec-h"><h2>出した依頼</h2><span>{mine.length}件</span></div>
        {mine.length === 0 ? (
          <div className="sn-me-none">
            <p>まだ依頼はありません。</p>
            <SnLink to="/posts/new" className="sn-btn sn-btn--small"><Plus aria-hidden />何を探していますか？</SnLink>
          </div>
        ) : (
          <div className="sn-me-list">{mine.map((p) => <WantRow key={p.id} post={p} />)}</div>
        )}
      </section>

      <section id="sn-me-contacts" className="sn-me-sec">
        <ContactsSection tab={contactTab} onTab={setContactTab} />
      </section>

      <section className="sn-me-sec sn-me-invite">
        <h2><UserPlus aria-hidden />知り合いを招待する</h2>
        <p className="sn-meta">LINEに貼って送ると、相手がプロフィールを作ってつながれます。</p>
        <p className="sn-url">{url}</p>
        <CopyUrlButton url={url} label="招待URLをコピー" className="sn-btn sn-btn--main sn-btn--wide" />
      </section>

      <section className="sn-me-sec">
        <div className="sn-sec-h"><h2>設定</h2></div>
        <div className="sn-me-links">
          <SnLink to="/me/edit">
            <Settings2 aria-hidden />
            <span>
              <b>プロフィールと公開範囲を変える</b>
              <small>{me.openToIntro ? "紹介の道は、知り合いの知り合いにも見せています" : "紹介の道は、知り合いにだけ見せています"}</small>
            </span>
            <ChevronRight aria-hidden />
          </SnLink>
          <SnLink to="/admin">
            <ShieldCheck aria-hidden />
            <span><b>管理者の画面へ</b></span>
            <ChevronRight aria-hidden />
          </SnLink>
        </div>
      </section>
    </PersonView>
  );
}

/** 知り合い（直接）と、知り合いの知り合い。マイページは一覧を見に来る所ではないので、行は短く、はじめは数人だけ */
function ContactsSection({ tab, onTab }: { tab: ContactTab; onTab: (tab: ContactTab) => void }) {
  const [showAll, setShowAll] = useState(false);
  const direct = directPeople();
  const second = secondDegreePeople();
  const people: readonly Person[] = tab === "direct" ? direct : second;
  const shown = showAll ? people : people.slice(0, CONTACTS_PREVIEW);
  const pick = (next: ContactTab) => {
    setShowAll(false);
    onTab(next);
  };
  return (
    <>
      <div className="sn-sec-h"><h2>知り合い</h2><span>見本には{direct.length + second.length}人</span></div>
      <div className="sn-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "direct"} onClick={() => pick("direct")}>知り合い {direct.length}</button>
        <button type="button" role="tab" aria-selected={tab === "second"} onClick={() => pick("second")}>知り合いの知り合い {second.length}</button>
      </div>
      {tab === "second" && <p className="sn-meta sn-me-tab-note">知り合いを通して紹介をたのめる人です。紹介の道を見せない設定の人は出ません</p>}
      {people.length === 0 ? (
        <div className="sn-me-none"><p>{tab === "direct" ? "まだ知り合いがいません。招待URLを送って、つながってください" : "知り合いの知り合いは、まだいません"}</p></div>
      ) : (
        <div className="sn-me-list">{shown.map((p) => <ContactRow key={p.id} person={p} far={tab === "second"} />)}</div>
      )}
      {shown.length < people.length && (
        <button type="button" className="sn-me-more" onClick={() => setShowAll(true)}>あと{people.length - shown.length}人を見る</button>
      )}
    </>
  );
}

/** マイページの知り合いの短い行：顔・名前・会社と役職。その先の人は、だれ経由かも出す */
function ContactRow({ person, far }: { person: Person; far: boolean }) {
  const company = companyOf(person);
  return (
    <SnLink to={`/people/${person.id}`} className="sn-me-row">
      <Avatar person={person} />
      <span>
        <b>{person.name}</b>
        <small>{company ? `${company.name}・${person.title}` : person.title}</small>
        {far && <RelationLine relation={relationTo(person.id)} />}
      </span>
      <ChevronRight aria-hidden />
    </SnLink>
  );
}

export function MeEditScreen() {
  const { me, saveMe } = useSnState();
  const { go } = useSn();
  const [past, setPast] = useState(me.past);
  const [now, setNow] = useState(me.now);
  const [future, setFuture] = useState(me.future);
  const [offer, setOffer] = useState(joinLines(me.offer));
  const [want, setWant] = useState(joinLines(me.want));
  const [talk, setTalk] = useState(joinLines(me.talk));
  const [openToIntro, setOpenToIntro] = useState(me.openToIntro);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    window.setTimeout(() => {
      // 見る画面に反映される保存とトーストを同じ瞬間に。錠は外さない（画面が変わるまで押せない）
      saveMe({ past: past.trim(), now: now.trim(), future: future.trim(), offer: splitLines(offer), want: splitLines(want), talk: splitLines(talk), openToIntro });
      uiToast("プロフィールを保存しました");
      go("/me");
    }, SEND_MS);
  };

  return (
    <div className="sn-form">
      <form onSubmit={save}>
        <div className="sn-sec"><div className="sn-sec-h"><h2>プロフィールを編集</h2></div></div>
        <div className="sn-fields">
          <p className="sn-meta">すべて書かなくても大丈夫です。書けるところだけで、人柄が伝わります。</p>
          <label className="sn-field">
            <span>これまで</span>
            <textarea rows={3} maxLength={300} value={past} placeholder="これまでの仕事や経験" onChange={(e) => setPast(e.target.value)} />
          </label>
          <label className="sn-field">
            <span>いま</span>
            <textarea rows={3} maxLength={300} value={now} placeholder="いまの仕事、好きなこと" onChange={(e) => setNow(e.target.value)} />
          </label>
          <label className="sn-field">
            <span>これから</span>
            <textarea rows={3} maxLength={300} value={future} placeholder="挑戦したいこと、出会いたい人" onChange={(e) => setFuture(e.target.value)} />
          </label>
          <label className="sn-field">
            <span>できること（1行に1つ）</span>
            <textarea rows={3} value={offer} placeholder={"例：\n受変電設備の更新工事"} onChange={(e) => setOffer(e.target.value)} />
          </label>
          <label className="sn-field">
            <span>探していること（1行に1つ）</span>
            <textarea rows={3} value={want} placeholder={"例：\n九州の協力会社"} onChange={(e) => setWant(e.target.value)} />
          </label>
          <label className="sn-field">
            <span>話のきっかけ（1行に1つ。趣味や出身など）</span>
            <textarea rows={3} value={talk} placeholder={"例：\n釣り（相模湾）"} onChange={(e) => setTalk(e.target.value)} />
          </label>
          <div className="sn-field">
            <span>公開範囲</span>
            <label className="sn-check">
              <input type="checkbox" checked={openToIntro} onChange={(e) => setOpenToIntro(e.target.checked)} />
              <span>知り合いの知り合いに、紹介の道を見せる</span>
            </label>
            <p className="sn-meta">
              {openToIntro
                ? "オンにすると、知り合いの知り合いが、あなたへの紹介を知り合い経由でたのめます。いつでもオフにできます。"
                : "オフのあいだは、知り合いにだけあなたの道が見えます。"}
            </p>
          </div>
        </div>
        <div className="sn-sticky">
          <div className="sn-modal-acts">
            <SnLink to="/me" className="sn-btn" aria-disabled={busy}>やめる</SnLink>
            <button type="submit" className="sn-btn sn-btn--main" disabled={busy}>{busy ? "保存しています…" : "保存する"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
