"use client";

// 見本のマイページ（設計書5-5・6-7、10-31：メニュー「マイページ」）：自分のプロフィール・出した依頼・知り合い・招待・設定・管理者の入口。
// プロフィールの編集は /me/edit。

import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import {
  ME_ID,
  NETWORK_SUMMARY,
  directPeople,
  inviteUrl,
  joinLines,
  secondDegreePeople,
  splitLines,
  wantPosts,
  type Person,
} from "@/lib/guild/look/sns-mock";
import { CopyUrlButton, SEND_MS } from "./flow";
import { PersonRow, WantRow } from "./parts";
import { PersonView } from "./screens";
import { SnLink, useSn, useSnState } from "./store";

export function MeScreen() {
  const { me, myPosts } = useSnState();
  const mine = wantPosts(myPosts).filter((p) => p.authorId === ME_ID);
  const url = inviteUrl(ME_ID);
  return (
    <>
      <div className="sn-me-bar">
        <p className="sn-meta">
          {me.openToIntro ? "知り合いの知り合いに、紹介の道を見せています" : "紹介の道は、知り合いにだけ見せています"}
        </p>
        <div className="sn-row-acts">
          <SnLink to="/me/edit" className="sn-btn sn-btn--main">プロフィールを編集</SnLink>
        </div>
      </div>
      <PersonView person={me} relation={{ kind: "self" }} />

      <section className="sn-me-sec">
        <div className="sn-sec"><div className="sn-sec-h"><h2>出した依頼</h2><span>{mine.length}件</span></div></div>
        {mine.length === 0 ? (
          <p className="sn-empty">まだ依頼はありません。<br /><SnLink to="/posts/new"><u>何を探していますか？</u></SnLink></p>
        ) : (
          <div>{mine.map((p) => <WantRow key={p.id} post={p} />)}</div>
        )}
      </section>

      <section className="sn-me-sec">
        <ContactsSection />
      </section>

      <section className="sn-me-sec">
        <div className="sn-sec">
          <div className="sn-sec-h"><h2>知り合いを招待する</h2></div>
          <p className="sn-meta">LINEに貼って送ると、相手がプロフィールを作ってつながれます。</p>
          <p className="sn-url">{url}</p>
          <CopyUrlButton url={url} label="招待URLをコピー" className="sn-btn sn-btn--main sn-btn--wide" />
        </div>
      </section>

      <section className="sn-me-sec">
        <div className="sn-sec">
          <div className="sn-sec-h"><h2>設定</h2></div>
          <p className="sn-meta">
            知り合い{NETWORK_SUMMARY.direct}人・その先に{NETWORK_SUMMARY.second}人。
            {me.openToIntro ? "紹介の道は、知り合いの知り合いにも見せています。" : "紹介の道は、知り合いにだけ見せています。"}
          </p>
          <div className="sn-row-acts">
            <SnLink to="/me/edit" className="sn-btn">プロフィールと公開範囲を変える</SnLink>
            <SnLink to="/admin" className="sn-btn">管理者の画面へ</SnLink>
          </div>
        </div>
      </section>
    </>
  );
}

/** 知り合い（直接）と、知り合いの知り合い。一覧は人の行（探すと同じ見え方） */
function ContactsSection() {
  const [tab, setTab] = useState<"direct" | "second">("direct");
  const direct = directPeople();
  const second = secondDegreePeople();
  const people: readonly Person[] = tab === "direct" ? direct : second;
  return (
    <>
      <div className="sn-sec"><div className="sn-sec-h"><h2>知り合い</h2><span>見本には{direct.length + second.length}人</span></div></div>
      <div className="sn-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "direct"} onClick={() => setTab("direct")}>知り合い {direct.length}</button>
        <button type="button" role="tab" aria-selected={tab === "second"} onClick={() => setTab("second")}>知り合いの知り合い {second.length}</button>
      </div>
      {tab === "second" && <p className="sn-count">知り合いを通して紹介をたのめる人です。紹介の道を見せない設定の人は出ません</p>}
      {people.length === 0 ? (
        <p className="sn-empty">{tab === "direct" ? "まだ知り合いがいません。招待URLを送って、つながってください" : "知り合いの知り合いは、まだいません"}</p>
      ) : (
        <div className="sn-list">{people.map((p) => <PersonRow key={p.id} person={p} />)}</div>
      )}
    </>
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
