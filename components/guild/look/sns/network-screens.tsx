"use client";

// 見本のやり取りの画面（10-31：下のメニュー「やり取り」）：届いた・返事した・送った・紹介の記録。
// 紹介の流れは2段（A が B に頼む → B が承認して紹介料の条件を決め C に聞く → C が了承するとつながる）。
// 判定と状態の進め方は sns-network.ts。ここは見せるだけ（記録は消す・直す操作を出さない）。
// 知り合いの一覧と招待は、マイページに移した。

import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import {
  ANSWER_LABEL,
  INTRO_NOTE_MAX,
  ME_ID,
  NETWORK_SUMMARY,
  directPeople,
  findPerson,
  findWantPost,
  introEventText,
  introName,
  introShortName,
  introStatusText,
  involvesMe,
  maskedConnections,
  newestFirst,
  secondDegreePeople,
  shortName,
  todayIso,
  wantPosts,
  type Person,
} from "@/lib/guild/look/sns-mock";
import {
  FEE_KINDS,
  acceptIntro,
  approveIntro,
  awaitingReply,
  declineIntro,
  feeText,
  isOpenStatus,
  refuseIntro,
  validateFee,
  type FeeTerms,
  type IntroRecord,
} from "@/lib/guild/look/sns-network";
import { ComposeFlow, SEND_MS } from "./flow";
import { Avatar, MeetPicture, Modal, Say, WantRow } from "./parts";
import { SnLink, useSnState } from "./store";

type Tab = "incoming" | "replied" | "sent" | "log";

/** 自分が間の人（B）・紹介される本人（C）として、返事をしたあとの記録 */
function repliedRecords(records: readonly IntroRecord[]): IntroRecord[] {
  return records.filter((r) => (r.introducerId === ME_ID && r.status !== "requested") || (r.targetId === ME_ID && (r.status === "connected" || r.status === "declined_by_target")));
}

export function NetworkScreen() {
  const [tab, setTab] = useState<Tab>("incoming");
  const { introRecords, sentMessages, myAnswers, myPosts, net } = useSnState();
  const waiting = awaitingReply(introRecords, ME_ID).length;
  const repliedCount = repliedRecords(introRecords).length + myAnswers.length;
  const sentCount = introRecords.filter((r) => r.requesterId === ME_ID).length + sentMessages.length + wantPosts(myPosts).filter((p) => p.authorId === ME_ID).length;
  const logCount = introRecords.filter((r) => involvesMe(r)).length;

  return (
    <div className="sn-page">
      <div className="sn-page-main">
        <div className="sn-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "incoming"} onClick={() => setTab("incoming")}>
            届いた{waiting > 0 ? ` ${waiting}` : ""}
          </button>
          <button type="button" role="tab" aria-selected={tab === "replied"} onClick={() => setTab("replied")}>返事した {repliedCount}</button>
          <button type="button" role="tab" aria-selected={tab === "sent"} onClick={() => setTab("sent")}>送った {sentCount}</button>
          <button type="button" role="tab" aria-selected={tab === "log"} onClick={() => setTab("log")}>記録 {logCount}</button>
        </div>
        {tab === "incoming" && <IncomingList />}
        {tab === "replied" && <RepliedList />}
        {tab === "sent" && <SentList />}
        {tab === "log" && <LogList />}
      </div>
      <aside className="sn-page-side">
        <p className="sn-stats">
          <span><b>{NETWORK_SUMMARY.direct}</b>人の知り合い</span>
          <span>その先に<b>{NETWORK_SUMMARY.second}</b>人</span>
        </p>
        <p className="sn-meta sn-note">
          見本には、そのうち{directPeople(ME_ID, net).length + secondDegreePeople(ME_ID, net).length + maskedConnections(ME_ID, net).length}人だけを入れています。知り合いの一覧と招待は、
          <SnLink to="/me"><u>マイページ</u></SnLink>にあります。
        </p>
      </aside>
    </div>
  );
}

type Reply = { id: string; action: "approve" | "decline" | "accept" | "refuse" };

/** 届いた紹介のおねがい：自分が間の人（承認／辞退）と、紹介される本人（了承／お断り）の、返事を待っているもの */
function IncomingList() {
  const { introRecords, updateIntroRecord, addConnection } = useSnState();
  const [replying, setReplying] = useState<Reply | null>(null);
  const waiting = awaitingReply(introRecords, ME_ID);
  if (waiting.length === 0) return <p className="sn-empty">返事をしていないおねがいは、ありません</p>;

  const rec = replying ? introRecords.find((r) => r.id === replying.id) : undefined;
  const requester = rec ? findPerson(rec.requesterId) : null;
  const introducer = rec ? findPerson(rec.introducerId) : null;
  const target = rec ? findPerson(rec.targetId) : null;
  const close = () => setReplying(null);

  return (
    <>
      <div className="sn-list">
        {waiting.map((r) => {
          const a = findPerson(r.requesterId);
          const b = findPerson(r.introducerId);
          const c = findPerson(r.targetId);
          if (!a || !b || !c) return null;
          if (r.status === "requested") {
            return (
              <div key={r.id} className="sn-row">
                <Avatar person={a} />
                <div className="sn-row-body">
                  <p><b>{a.name}さん</b>から、<b>{shortName(c)}さん</b>への紹介依頼が届いています</p>
                  <Say>{r.note}</Say>
                  <div className="sn-row-acts">
                    <button type="button" className="sn-btn sn-btn--main" onClick={() => setReplying({ id: r.id, action: "approve" })}>承認して{shortName(c)}さんに聞く</button>
                    <button type="button" className="sn-btn" onClick={() => setReplying({ id: r.id, action: "decline" })}>辞退する</button>
                  </div>
                </div>
              </div>
            );
          }
          const note = r.events.find((e) => e.status === "asking_target")?.note ?? "";
          return (
            <div key={r.id} className="sn-row">
              <Avatar person={b} />
              <div className="sn-row-body">
                <p><b>{b.name}さん</b>が、<b>{shortName(a)}さん</b>を紹介したいそうです<span className="sn-meta">（{feeText(r.fee)}）</span></p>
                <p className="sn-meta">{shortName(a)}さんの用件</p>
                <Say>{r.note}</Say>
                {note && (
                  <>
                    <p className="sn-meta">{shortName(b)}さんのひとこと</p>
                    <Say>{note}</Say>
                  </>
                )}
                <div className="sn-row-acts">
                  <button type="button" className="sn-btn sn-btn--main" onClick={() => setReplying({ id: r.id, action: "accept" })}>了承してつながる</button>
                  <button type="button" className="sn-btn" onClick={() => setReplying({ id: r.id, action: "refuse" })}>お断りする</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {replying && rec && requester && introducer && target && (
        <>
          {replying.action === "approve" && <ApproveFlow rec={rec} requester={requester} target={target} onClose={close} />}
          {replying.action === "decline" && (
            <ComposeFlow
              title={`${shortName(requester)}さんのおねがいを辞退する`}
              lead={`${shortName(requester)}さんに、辞退の返事を送ります。理由は書かなくても大丈夫です`}
              placeholder="例：いまは紹介を控えています"
              required={false}
              reviewRows={(note) => [
                { label: "届く人", value: `${requester.name}さん` },
                { label: "返事", value: "辞退します" },
                { label: "ひとこと", value: note },
              ]}
              sendLabel="辞退を送る"
              onClose={close}
              onSent={(note) => {
                // 画面の変化（返事した・記録に移る）とトーストを同じ瞬間に出す
                const next = declineIntro(rec, ME_ID, note, todayIso());
                close();
                if (!next) return uiToast("送れませんでした。もう返事が済んでいるおねがいです", "error");
                updateIntroRecord(rec.id, () => next);
                uiToast("辞退の返事を送りました");
              }}
            />
          )}
          {(replying.action === "accept" || replying.action === "refuse") && (
            <ComposeFlow
              title={replying.action === "accept" ? `${shortName(introducer)}さんの紹介を了承する` : `${shortName(introducer)}さんの紹介をお断りする`}
              lead={replying.action === "accept"
                ? `了承すると、${shortName(requester)}さんと知り合いになります（${feeText(rec.fee)}）。ひとこと添えるなら書いてください（なくても送れます）`
                : `${shortName(introducer)}さんに、お断りの返事を送ります。理由は書かなくても大丈夫です`}
              placeholder={replying.action === "accept" ? "例：まずは電話でお話ししましょう" : "例：いまは新しいお取引を増やしていません"}
              required={false}
              picture={replying.action === "accept" ? <MeetPicture people={[requester, introducer, null]} /> : undefined}
              reviewRows={(note) => [
                { label: "届く人", value: `${introducer.name}さん` },
                { label: "返事", value: replying.action === "accept" ? `了承して、${requester.name}さんとつながります` : "お断りします" },
                { label: "紹介料の条件", value: feeText(rec.fee) },
                { label: "ひとこと", value: note },
              ]}
              sendLabel={replying.action === "accept" ? "了承を送る" : "お断りを送る"}
              onClose={close}
              onSent={(note) => {
                const accept = replying.action === "accept";
                const next = accept ? acceptIntro(rec, ME_ID, note, todayIso()) : refuseIntro(rec, ME_ID, note, todayIso());
                close();
                if (!next) return uiToast("送れませんでした。もう返事が済んでいるおねがいです", "error");
                // 画面の変化（知り合いに入る・記録が進む）とトーストを同じ瞬間に出す
                updateIntroRecord(rec.id, () => next);
                if (accept) {
                  addConnection(rec.requesterId, rec.targetId);
                  uiToast(`${shortName(requester)}さんとつながりました`);
                } else {
                  uiToast("お断りの返事を送りました");
                }
              }}
            />
          )}
        </>
      )}
    </>
  );
}

/**
 * 承認して C に聞く：紹介料の条件（4択。円・％は入力。空・範囲外は閉じずに赤字）とひとこと（任意）を書く → この内容で送りますか？ → 送る。
 * 錠は押した瞬間にかけ、「もどって なおす」で書いた内容は消えない。
 */
function ApproveFlow({ rec, requester, target, onClose }: { rec: IntroRecord; requester: Person; target: Person; onClose: () => void }) {
  const { updateIntroRecord } = useSnState();
  const [step, setStep] = useState<"write" | "review">("write");
  const [kind, setKind] = useState<FeeTerms["kind"]>("none");
  const [yen, setYen] = useState("");
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  // 承認するのは自分（間の人）。本人（C）に届く文言と同じ形で見せる
  const me = findPerson(ME_ID);

  const fee = (): FeeTerms => {
    if (kind === "fixed") return { kind, yen: Number(yen.trim()) };
    if (kind === "percent") return { kind, percent: Number(percent.trim()) };
    return { kind };
  };

  const toReview = () => {
    const problem = validateFee(fee());
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setStep("review");
  };

  const send = () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    window.setTimeout(() => {
      const next = approveIntro(rec, ME_ID, fee(), note.trim(), todayIso());
      if (!next) {
        onClose();
        uiToast("送れませんでした。もう返事が済んでいるおねがいです", "error");
        return;
      }
      // 画面の変化（返事した・記録に移る）とトーストを同じ瞬間に出す。錠は外さない（この窓は閉じる）
      updateIntroRecord(rec.id, () => next);
      onClose();
      uiToast(`${shortName(target)}さんに聞きました`);
    }, SEND_MS);
  };

  if (step === "review") {
    return (
      <Modal title="この内容で送りますか？" onClose={() => setStep("write")} busy={busy}>
        <MeetPicture people={[requester, null, target]} />
        <dl className="sn-review">
          <dt>届く人</dt>
          <dd>{target.name}さん</dd>
          <dt>つなぎたい人</dt>
          <dd>{requester.name}さん</dd>
          <dt>紹介料の条件</dt>
          <dd>{feeText(fee())}</dd>
          <dt>ひとこと</dt>
          <dd>{note.trim() === "" ? "（書かない）" : note.trim()}</dd>
        </dl>
        <div className="sn-modal-acts">
          <button type="button" className="sn-btn" disabled={busy} onClick={() => setStep("write")}>もどって なおす</button>
          <button type="button" className="sn-btn sn-btn--main" disabled={busy} onClick={send}>{busy ? "送っています…" : "送る"}</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title={`承認して${shortName(target)}さんに聞く`} onClose={onClose}>
      <p className="sn-meta sn-modal-lead">
        {shortName(target)}さんには「{me ? shortName(me) : "あなた"}さんが、{shortName(requester)}さんをあなたに紹介したいそうです」と届きます。紹介料の条件を決めてください（記録するだけで、お金のやり取りはこの画面では行いません）。
      </p>
      <fieldset className="sn-field sn-fee">
        <legend>紹介料の条件</legend>
        {FEE_KINDS.map((k) => (
          <label key={k.key} className="sn-check">
            <input type="radio" name="sn-fee-kind" checked={kind === k.key} onChange={() => { setKind(k.key); setError(""); }} />
            <span>{k.label}</span>
          </label>
        ))}
        {kind === "fixed" && (
          <label className="sn-field">
            <span>紹介料（円）</span>
            <input type="text" inputMode="numeric" value={yen} placeholder="例：30000" aria-invalid={error !== ""} onChange={(e) => setYen(e.target.value)} />
          </label>
        )}
        {kind === "percent" && (
          <label className="sn-field">
            <span>成約時の割合（%）</span>
            <input type="text" inputMode="decimal" value={percent} placeholder="例：3" aria-invalid={error !== ""} onChange={(e) => setPercent(e.target.value)} />
          </label>
        )}
      </fieldset>
      <label className="sn-field">
        <span>ひとこと（なくても送れます）</span>
        <textarea value={note} maxLength={INTRO_NOTE_MAX} placeholder="例：太陽光の保守で相談したいそうです" onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && <p className="sn-error" role="alert">{error}</p>}
      <div className="sn-modal-acts">
        <button type="button" className="sn-btn" onClick={onClose}>やめる</button>
        <button type="button" className="sn-btn sn-btn--main" onClick={toReview}>内容を確かめる</button>
      </div>
    </Modal>
  );
}

/** 返事した：自分が間の人・紹介される本人として返事をした記録と、案件に出した返事（うちで受けたい／知り合いを紹介する） */
function RepliedList() {
  const { introRecords, myAnswers } = useSnState();
  const replied = newestFirst(repliedRecords(introRecords));
  if (replied.length === 0 && myAnswers.length === 0) {
    return <p className="sn-empty">まだ返事はありません。<br />届いたおねがいや案件に返事をすると、ここに並びます</p>;
  }
  return (
    <div className="sn-list">
      {replied.map((r) => {
        const a = findPerson(r.requesterId);
        const c = findPerson(r.targetId);
        const mine = r.events.find((e) => e.byId === ME_ID && e.status !== "requested");
        if (!a || !c || !mine) return null;
        const what = {
          requested: "",
          asking_target: `承認して${shortName(c)}さんに聞きました（${feeText(r.fee)}）`,
          declined_by_introducer: "辞退しました",
          connected: `了承して、${shortName(a)}さんとつながりました`,
          declined_by_target: "お断りしました",
        }[mine.status];
        return (
          <div key={r.id} className="sn-row">
            <Avatar person={a} />
            <div className="sn-row-body">
              <p><b>{a.name}さん</b>のおねがい（{r.targetId === ME_ID ? "あなたとつながりたい" : `${shortName(c)}さんとつながりたい`}）</p>
              <p className="sn-rel" data-kind="direct">{what}</p>
              {isOpenStatus(r.status) && <p className="sn-meta">いまは{introStatusText(r)}</p>}
              {mine.note && <Say>{mine.note}</Say>}
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

/** 送った：紹介をおねがいした記録（いまの状態の一文つき）・直接メッセージ・自分が出した依頼。伏せた相手は、つながるまで伏せたまま */
function SentList() {
  const { introRecords, sentMessages, myPosts } = useSnState();
  const sent = newestFirst(introRecords.filter((r) => r.requesterId === ME_ID));
  const mine = wantPosts(myPosts).filter((p) => p.authorId === ME_ID);
  if (sent.length === 0 && sentMessages.length === 0 && mine.length === 0) {
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
        {sent.map((r) => {
          const target = findPerson(r.targetId);
          const via = findPerson(r.introducerId);
          if (!target || !via) return null;
          const hidden = r.maskedForRequester && r.status !== "connected";
          const body = (
            <>
              {hidden ? <span className="sn-fc" data-kind="other" aria-hidden>？</span> : <Avatar person={target} />}
              <div className="sn-row-body">
                <p><b>{introName(r, r.targetId)}</b>への紹介を、<b>{introShortName(r, r.introducerId)}</b>に{isOpenStatus(r.status) ? "おねがい中" : "おねがいしました"}</p>
                <p className="sn-meta">{introStatusText(r)}</p>
              </div>
            </>
          );
          return hidden
            ? <div key={r.id} className="sn-row">{body}</div>
            : <SnLink key={r.id} to={`/people/${target.id}`} className="sn-row">{body}</SnLink>;
        })}
        {sentMessages.map((m) => {
          const to = findPerson(m.toId);
          if (!to) return null;
          return (
            <SnLink key={m.id} to={`/people/${to.id}`} className="sn-row">
              <Avatar person={to} />
              <div className="sn-row-body">
                <p><b>{to.name}さん</b>に直接メッセージ</p>
                <Say>{m.text}</Say>
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

/** 紹介の記録：自分が A・B・C のどれかに入っている記録を新しい順に全部。後でもめないための記録なので、消す・直す操作は出さない */
function LogList() {
  const { introRecords } = useSnState();
  const records = newestFirst(introRecords.filter((r) => involvesMe(r)));
  if (records.length === 0) return <p className="sn-empty">紹介の記録は、まだありません</p>;
  return (
    <div className="sn-list">
      {records.map((r) => (
        <div key={r.id} className="sn-row sn-log">
          <div className="sn-row-body">
            <p><b>{introName(r, r.requesterId)}</b>が、<b>{introName(r, r.introducerId)}</b>経由で、<b>{introName(r, r.targetId)}</b>を紹介してほしい</p>
            <p className="sn-meta">用件：{r.note}</p>
            <p className="sn-meta">紹介料の条件：{feeText(r.fee)}</p>
            <ol className="sn-log-events">
              {r.events.map((e, i) => (
                <li key={`${r.id}-${i}`}>
                  {introEventText(r, e)}
                  {e.note && i > 0 && <small>「{e.note}」</small>}
                </li>
              ))}
            </ol>
            {isOpenStatus(r.status) && <p className="sn-rel" data-kind="direct">{introStatusText(r)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
