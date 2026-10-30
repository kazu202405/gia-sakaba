"use client";

// 見本の人脈の画面（設計書6-5）：知り合い・知り合いの知り合い・紹介のおねがい（届いた／送った）・招待。

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import {
  INCOMING_INTRO_REQUESTS,
  ME_ID,
  NETWORK_SUMMARY,
  directPeople,
  findPerson,
  inviteUrl,
  secondDegreePeople,
  shortName,
  type Person,
} from "@/lib/guild/look/sns-mock";
import { ComposeFlow, CopyUrlButton } from "./flow";
import { Avatar, PersonRow, Say } from "./parts";
import { SnLink, useSnState } from "./store";

type Tab = "direct" | "second" | "intro";
type IntroTab = "incoming" | "sent";

export function NetworkScreen() {
  // ホームの「紹介のおねがい」から来たときは ?tab=intro で、そのタブを開く
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "intro" ? "intro" : "direct");
  const { introReplies, sentIntros } = useSnState();
  const direct = directPeople();
  const second = secondDegreePeople();
  const waiting = INCOMING_INTRO_REQUESTS.filter((r) => !introReplies[r.id]).length;
  const url = inviteUrl(ME_ID);

  return (
    <div className="sn-page">
      <div className="sn-page-main">
        <div className="sn-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "direct"} onClick={() => setTab("direct")}>知り合い {direct.length}</button>
          <button type="button" role="tab" aria-selected={tab === "second"} onClick={() => setTab("second")}>知り合いの知り合い {second.length}</button>
          <button type="button" role="tab" aria-selected={tab === "intro"} onClick={() => setTab("intro")}>
            紹介のおねがい{waiting > 0 ? ` ${waiting}` : ""}
          </button>
        </div>
        {tab === "direct" && <PeopleList people={direct} empty="まだ知り合いがいません。招待URLを送って、つながってください" />}
        {tab === "second" && (
          <>
            <p className="sn-count">知り合いを通して紹介をたのめる人です。紹介の道を見せない設定の人は出ません</p>
            <PeopleList people={second} empty="知り合いの知り合いは、まだいません" />
          </>
        )}
        {tab === "intro" && <IntroRequests sentCount={Object.keys(sentIntros).length} />}
      </div>
      <aside className="sn-page-side">
        <div className="sn-sec">
          <div className="sn-sec-h"><h2>知り合いを招待する</h2></div>
          <p className="sn-meta">LINEに貼って送ると、相手がプロフィールを作ってつながれます。</p>
          <p className="sn-url">{url}</p>
          <CopyUrlButton url={url} label="招待URLをコピー" className="sn-btn sn-btn--main sn-btn--wide" />
        </div>
        <p className="sn-stats">
          <span><b>{NETWORK_SUMMARY.direct}</b>人の知り合い</span>
          <span>その先に<b>{NETWORK_SUMMARY.second}</b>人</span>
        </p>
        <p className="sn-meta sn-note">見本には、そのうち{direct.length + second.length}人だけを入れています。</p>
      </aside>
    </div>
  );
}

function PeopleList({ people, empty }: { people: readonly Person[]; empty: string }) {
  if (people.length === 0) return <p className="sn-empty">{empty}</p>;
  return <div className="sn-list">{people.map((p) => <PersonRow key={p.id} person={p} />)}</div>;
}

function IntroRequests({ sentCount }: { sentCount: number }) {
  const [sub, setSub] = useState<IntroTab>("incoming");
  const { introReplies } = useSnState();
  const waiting = INCOMING_INTRO_REQUESTS.filter((r) => !introReplies[r.id]).length;
  return (
    <>
      <div className="sn-chips sn-chips--pad" role="group" aria-label="紹介のおねがい">
        <button type="button" className="sn-chip" aria-pressed={sub === "incoming"} onClick={() => setSub("incoming")}>届いた {waiting}</button>
        <button type="button" className="sn-chip" aria-pressed={sub === "sent"} onClick={() => setSub("sent")}>送った {sentCount}</button>
      </div>
      {sub === "incoming" ? <IncomingList /> : <SentList />}
    </>
  );
}

function IncomingList() {
  const { introReplies, addIntroReply } = useSnState();
  const [replying, setReplying] = useState<{ id: string; answer: "ask" | "decline" } | null>(null);
  if (INCOMING_INTRO_REQUESTS.length === 0) return <p className="sn-empty">届いたおねがいはありません</p>;

  const target = replying ? INCOMING_INTRO_REQUESTS.find((r) => r.id === replying.id) : undefined;
  const from = target ? findPerson(target.fromId) : null;
  const to = target ? findPerson(target.toId) : null;

  return (
    <>
      <div className="sn-list">
        {INCOMING_INTRO_REQUESTS.map((r) => {
          const f = findPerson(r.fromId);
          const t = findPerson(r.toId);
          if (!f || !t) return null;
          const reply = introReplies[r.id];
          return (
            <div key={r.id} className="sn-row">
              <Avatar person={f} />
              <div className="sn-row-body">
                <p><b>{f.name}さん</b>が、あなた経由で<b>{shortName(t)}さん</b>とつながりたいそうです</p>
                <Say>{r.note}</Say>
                {reply ? (
                  <p className="sn-rel" data-kind="direct">
                    {reply.answer === "ask" ? `${shortName(t)}さんに聞いてみると返事しました` : "お断りしました"}
                  </p>
                ) : (
                  <div className="sn-row-acts">
                    <button type="button" className="sn-btn sn-btn--main" onClick={() => setReplying({ id: r.id, answer: "ask" })}>{shortName(t)}さんに聞いてみる</button>
                    <button type="button" className="sn-btn" onClick={() => setReplying({ id: r.id, answer: "decline" })}>お断りする</button>
                  </div>
                )}
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

function SentList() {
  const { sentIntros } = useSnState();
  const entries = Object.entries(sentIntros);
  if (entries.length === 0) {
    return (
      <p className="sn-empty">
        まだ送ったおねがいはありません。<br />
        <SnLink to="/search"><u>探す</u></SnLink>で見つけた人に、紹介をたのめます
      </p>
    );
  }
  return (
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
  );
}
