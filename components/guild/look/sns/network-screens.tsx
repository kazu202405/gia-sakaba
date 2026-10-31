"use client";

// 見本のやり取りの画面（10-31：下のメニュー「やり取り」）：届いた紹介のおねがい・返事した・自分が出したおねがい。
// 知り合いの一覧と招待は、マイページに移した。

import { useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import {
  ANSWER_LABEL,
  INCOMING_INTRO_REQUESTS,
  ME_ID,
  NETWORK_SUMMARY,
  directPeople,
  findPerson,
  findWantPost,
  secondDegreePeople,
  shortName,
  wantPosts,
} from "@/lib/guild/look/sns-mock";
import { ComposeFlow } from "./flow";
import { Avatar, MeetPicture, Say, WantRow } from "./parts";
import { SnLink, useSnState } from "./store";

type Tab = "incoming" | "replied" | "sent";

export function NetworkScreen() {
  const [tab, setTab] = useState<Tab>("incoming");
  const { introReplies, sentIntros, myAnswers, myPosts } = useSnState();
  const waiting = INCOMING_INTRO_REQUESTS.filter((r) => !introReplies[r.id]).length;
  const repliedCount = Object.keys(introReplies).length + myAnswers.length;
  const sentCount = Object.keys(sentIntros).length + wantPosts(myPosts).filter((p) => p.authorId === ME_ID).length;

  return (
    <div className="sn-page">
      <div className="sn-page-main">
        <div className="sn-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "incoming"} onClick={() => setTab("incoming")}>
            届いた{waiting > 0 ? ` ${waiting}` : ""}
          </button>
          <button type="button" role="tab" aria-selected={tab === "replied"} onClick={() => setTab("replied")}>返事した {repliedCount}</button>
          <button type="button" role="tab" aria-selected={tab === "sent"} onClick={() => setTab("sent")}>送った {sentCount}</button>
        </div>
        {tab === "incoming" && <IncomingList />}
        {tab === "replied" && <RepliedList />}
        {tab === "sent" && <SentList />}
      </div>
      <aside className="sn-page-side">
        <p className="sn-stats">
          <span><b>{NETWORK_SUMMARY.direct}</b>人の知り合い</span>
          <span>その先に<b>{NETWORK_SUMMARY.second}</b>人</span>
        </p>
        <p className="sn-meta sn-note">
          見本には、そのうち{directPeople().length + secondDegreePeople().length}人だけを入れています。知り合いの一覧と招待は、
          <SnLink to="/me"><u>マイページ</u></SnLink>にあります。
        </p>
      </aside>
    </div>
  );
}

/** 届いた紹介のおねがい（まだ返事をしていないもの） */
function IncomingList() {
  const { introReplies, addIntroReply } = useSnState();
  const [replying, setReplying] = useState<{ id: string; answer: "ask" | "decline" } | null>(null);
  const waiting = INCOMING_INTRO_REQUESTS.filter((r) => !introReplies[r.id]);
  if (waiting.length === 0) return <p className="sn-empty">返事をしていないおねがいは、ありません</p>;

  const target = replying ? INCOMING_INTRO_REQUESTS.find((r) => r.id === replying.id) : undefined;
  const from = target ? findPerson(target.fromId) : null;
  const to = target ? findPerson(target.toId) : null;

  return (
    <>
      <div className="sn-list">
        {waiting.map((r) => {
          const f = findPerson(r.fromId);
          const t = findPerson(r.toId);
          if (!f || !t) return null;
          return (
            <div key={r.id} className="sn-row">
              <Avatar person={f} />
              <div className="sn-row-body">
                <p><b>{f.name}さん</b>が、あなた経由で<b>{shortName(t)}さん</b>とつながりたいそうです</p>
                <Say>{r.note}</Say>
                <div className="sn-row-acts">
                  <button type="button" className="sn-btn sn-btn--main" onClick={() => setReplying({ id: r.id, answer: "ask" })}>{shortName(t)}さんに聞いてみる</button>
                  <button type="button" className="sn-btn" onClick={() => setReplying({ id: r.id, answer: "decline" })}>お断りする</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {replying && target && from && to && (
        <ComposeFlow
          title={replying.answer === "ask" ? `${shortName(to)}さんに聞いてみる` : `${shortName(from)}さんのおねがいをお断りする`}
          lead={replying.answer === "ask"
            ? `${shortName(to)}さんに「${shortName(from)}さんがつながりたいそうです」と伝えます。ひとこと添えるなら書いてください（なくても送れます）`
            : `${shortName(from)}さんに、お断りの返事を送ります。理由は書かなくても大丈夫です`}
          placeholder={replying.answer === "ask" ? "例：横浜の設備に強い方を探しているそうです" : "例：いまは紹介を控えています"}
          required={false}
          picture={replying.answer === "ask" ? <MeetPicture people={[from, null, to]} /> : undefined}
          reviewRows={(note) => replying.answer === "ask"
            ? [
                { label: "届く人", value: `${to.name}さん` },
                { label: "つなぎたい人", value: `${from.name}さん` },
                { label: "ひとこと", value: note },
              ]
            : [
                { label: "届く人", value: `${from.name}さん` },
                { label: "返事", value: "お断りします" },
                { label: "ひとこと", value: note },
              ]}
          sendLabel={replying.answer === "ask" ? "送る" : "お断りを送る"}
          onClose={() => setReplying(null)}
          onSent={(note) => {
            // 画面の変化（返事済みの表示）とトーストを同じ瞬間に出す
            addIntroReply(replying.id, { answer: replying.answer, note });
            setReplying(null);
            uiToast(replying.answer === "ask" ? `${shortName(to)}さんに聞きました` : "お断りの返事を送りました");
          }}
        />
      )}
    </>
  );
}

/** 返事した：届いた紹介のおねがいへの返事と、案件に出した返事（うちで受けたい／知り合いを紹介する） */
function RepliedList() {
  const { introReplies, myAnswers } = useSnState();
  const replied = INCOMING_INTRO_REQUESTS.filter((r) => introReplies[r.id]);
  if (replied.length === 0 && myAnswers.length === 0) {
    return <p className="sn-empty">まだ返事はありません。<br />届いたおねがいや案件に返事をすると、ここに並びます</p>;
  }
  return (
    <div className="sn-list">
      {replied.map((r) => {
        const f = findPerson(r.fromId);
        const t = findPerson(r.toId);
        const reply = introReplies[r.id];
        if (!f || !t) return null;
        return (
          <div key={r.id} className="sn-row">
            <Avatar person={f} />
            <div className="sn-row-body">
              <p><b>{f.name}さん</b>のおねがい（{shortName(t)}さんとつながりたい）</p>
              <p className="sn-rel" data-kind="direct">
                {reply.answer === "ask" ? `${shortName(t)}さんに聞いてみると返事しました` : "お断りしました"}
              </p>
              {reply.note && <Say>{reply.note}</Say>}
            </div>
          </div>
        );
      })}
      {myAnswers.map((a, i) => {
        const post = findWantPost(a.postId);
        const author = post ? findPerson(post.authorId) : null;
        if (!post || !author) return null;
        return (
          <SnLink key={`${a.postId}-${a.kind}-${i}`} to={`/posts/${post.id}`} className="sn-row">
            <Avatar person={author} />
            <div className="sn-row-body">
              <p><b>{author.name}さん</b>の案件に「{ANSWER_LABEL[a.kind]}」と返事</p>
              <p className="sn-meta">{post.text}</p>
              <Say>{a.note}</Say>
            </div>
          </SnLink>
        );
      })}
    </div>
  );
}

/** 送った：紹介をおねがいした人と、自分が出した依頼 */
function SentList() {
  const { sentIntros, myPosts } = useSnState();
  const entries = Object.entries(sentIntros);
  const mine = wantPosts(myPosts).filter((p) => p.authorId === ME_ID);
  if (entries.length === 0 && mine.length === 0) {
    return (
      <p className="sn-empty">
        まだ送ったものはありません。<br />
        <SnLink to="/search"><u>人・会社を探して</u></SnLink>紹介をたのむか、<SnLink to="/posts/new"><u>依頼</u></SnLink>を出せます
      </p>
    );
  }
  return (
    <>
      <div className="sn-list">
        {entries.map(([targetId, viaId]) => {
          const target = findPerson(targetId);
          const via = findPerson(viaId);
          if (!target || !via) return null;
          return (
            <SnLink key={targetId} to={`/people/${target.id}`} className="sn-row">
              <Avatar person={target} />
              <div className="sn-row-body">
                <p><b>{target.name}さん</b>への紹介を、<b>{shortName(via)}さん</b>におねがい中</p>
                <p className="sn-meta">{shortName(via)}さんの返事を待っています</p>
              </div>
            </SnLink>
          );
        })}
      </div>
      {mine.length > 0 && (
        <section>
          <div className="sn-sec"><div className="sn-sec-h"><h2>出した依頼</h2><span>{mine.length}件</span></div></div>
          <div>{mine.map((p) => <WantRow key={p.id} post={p} />)}</div>
        </section>
      )}
    </>
  );
}
