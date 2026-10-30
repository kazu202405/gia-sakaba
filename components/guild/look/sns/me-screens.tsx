"use client";

// 見本の自分の画面（設計書5-5・6-7）：自分のページ（人の詳しいページと同じ見え方）と、プロフィールの編集。

import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import { joinLines, splitLines } from "@/lib/guild/look/sns-mock";
import { SEND_MS } from "./flow";
import { PersonView } from "./screens";
import { SnLink, useSn, useSnState } from "./store";

export function MeScreen() {
  const { me } = useSnState();
  return (
    <>
      <div className="sn-me-bar">
        <p className="sn-meta">
          {me.openToIntro ? "知り合いの知り合いに、紹介の道を見せています" : "紹介の道は、知り合いにだけ見せています"}
        </p>
        <div className="sn-row-acts">
          <SnLink to="/me/edit" className="sn-btn sn-btn--main">プロフィールを編集</SnLink>
          <SnLink to="/admin" className="sn-btn">管理者の画面へ</SnLink>
        </div>
      </div>
      <PersonView person={me} relation={{ kind: "self" }} />
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
