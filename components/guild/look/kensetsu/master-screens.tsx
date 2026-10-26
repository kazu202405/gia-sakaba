"use client";

// 管理者の画面：受付箱(11)・1件の中身(12)・渡す確認のモーダル(13)・渡し先の一覧(14)。
// 渡すのは「人に届く文章」なので、押す前に必ず確認の窓を挟む。許可・免許は印を出すだけで、渡すのは止めない。
// アプリからメール・LINEは自動では送らない（コピー／LINEで送るは、管理者が自分の手で送る入口）。

import { useEffect, useRef, useState } from "react";
import { uiConfirm, uiPrompt, uiToast } from "@/lib/ui-dialog";
import {
  INBOX_TABS,
  KINDS,
  LAND_ADMIN_NOTICE,
  PARTNERS,
  buildPassMessage,
  canTransition,
  formatJst,
  inboxTabOf,
  kindLabel,
  partnersForKind,
  passWarning,
  placeOf,
  receiverFromMember,
  receiverFromPartner,
  requesterName,
  statusText,
  summaryOf,
  timingLabel,
  type InboxTab,
  type Partner,
  type Receiver,
  type Referral,
} from "@/lib/guild/look/kensetsu-mock";
import { Marks, Modal, PhotoTiles, StepLine, Timeline } from "./parts";
import { KLink, mockNow, useMock } from "./store";

type PassTarget = { referral: Referral; receiver: Receiver };

// ---------- 13. 渡す確認のモーダル ----------

export function PassModal({ target, requester, onClose }: { target: PassTarget; requester: string; onClose: () => void }) {
  const { dispatch } = useMock();
  const { referral, receiver } = target;
  const [phase, setPhase] = useState<"confirm" | "done">("confirm");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const message = buildPassMessage(referral, receiver, requester);
  const warning = passWarning(referral.kind, receiver);

  const pass = () => {
    // 押した瞬間に錠。記録と、画面の切り替え（トースト・追跡の進み）を同じ瞬間に行う
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    dispatch({ type: "pass", id: referral.id, receiverId: receiver.id, now: mockNow() });
    uiToast(`渡しました。追跡が「${receiver.name}に相談中」に進みました`);
    setPhase("done");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      uiToast("文面をコピーしました");
    } catch {
      uiToast("コピーできませんでした。文面を長押ししてコピーしてください", "error");
    }
  };

  if (phase === "done") {
    return (
      <Modal title="渡しました" onClose={onClose}>
        <p>次に、下の文面を{receiver.name}へ送ってください。アプリからは自動では送りません。</p>
        <div className="kz-modal-box">{message}</div>
        <div className="kz-btn-row">
          <button type="button" className="kz-btn" onClick={() => void copy()}>文面をコピーする</button>
          <a className="kz-btn kz-btn--sub" href={`https://line.me/R/share?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">LINEで送る</a>
          <button type="button" className="kz-btn kz-btn--sub" onClick={onClose}>閉じる</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`${receiver.name}へ渡しますか？`} onClose={onClose} busy={busy}>
      <p className="kz-label">渡す相手</p>
      <p>{receiver.name}</p>
      <Marks receiver={receiver} />
      <p className="kz-meta">連絡の方法：{receiver.contactNote}</p>
      {warning && <p className="kz-warn" role="alert">注意：{warning}それでも渡す場合は「渡す」を押してください（止めはしません）。</p>}
      <p className="kz-label">渡す文面</p>
      <div className="kz-modal-box">{message}</div>
      <p className="kz-meta">渡すと、出した人の追跡が「{receiver.name}に相談中」に進み、お知らせが届きます。</p>
      <div className="kz-btn-row">
        <button type="button" className="kz-btn" disabled={busy} onClick={pass}>{busy ? "渡しています…" : "渡す"}</button>
        <button type="button" className="kz-btn kz-btn--sub" disabled={busy} onClick={onClose}>やめる</button>
      </div>
    </Modal>
  );
}

// ---------- 11. 受付箱 ----------

export function InboxScreen() {
  const { state } = useMock();
  const [tab, setTab] = useState<InboxTab>("new");
  const [target, setTarget] = useState<PassTarget | null>(null);
  const rows = state.referrals.filter((r) => inboxTabOf(r.status) === tab).sort((a, b) => b.createdAt - a.createdAt);
  const counts = Object.fromEntries(INBOX_TABS.map((t) => [t.key, state.referrals.filter((r) => inboxTabOf(r.status) === t.key).length])) as Record<InboxTab, number>;

  return (
    <div>
      <h1>受付箱</h1>
      <div className="kz-tabs" role="tablist">
        {INBOX_TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}{t.key === "new" ? <em>{counts.new}</em> : <span className="kz-tab-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="kz-empty">このタブの相談はありません。</p>
      ) : (
        <div role="tabpanel">
          {rows.map((r) => (
            <div key={r.id} className="kz-row">
              <KLink to={`/master/${r.id}`} className="kz-row-link">
                <p>{summaryOf(r.body, 40)}</p>
                <p className="kz-meta">{kindLabel(r.kind)}・{placeOf(r)}・{timingLabel(r.timing)}・{requesterName(r.requesterId, state.members)}</p>
              </KLink>
              {r.interestedIds.length > 0 && <p className="kz-meta kz-meta--accent">手を挙げた人 {r.interestedIds.length}名</p>}
              {tab === "new" ? (
                <>
                  <div className="kz-pass-grid">
                    {partnersForKind(r.kind).map((p) => (
                      <div key={p.id} className="kz-pass-cell">
                        <button type="button" className="kz-btn kz-btn--small" onClick={() => setTarget({ referral: r, receiver: receiverFromPartner(p) })}>{p.name}へ</button>
                        <small>{p.hasConstructionLicense ? "建設業許可あり" : "建設業許可なし"}・{p.hasRealEstateLicense ? "宅建免許あり" : "宅建免許なし"}</small>
                      </div>
                    ))}
                    <div className="kz-pass-cell">
                      <KLink to={`/master/${r.id}`} className="kz-btn kz-btn--sub kz-btn--small">ほかを選ぶ</KLink>
                    </div>
                  </div>
                  {r.kind === "land" && <p className="kz-warn">{LAND_ADMIN_NOTICE}</p>}
                </>
              ) : (
                <>
                  <StepLine referral={r} members={state.members} />
                  <p className="kz-meta"><KLink to={`/master/${r.id}`}>中身を見る</KLink></p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {target && <PassModal target={target} requester={requesterName(target.referral.requesterId, state.members)} onClose={() => setTarget(null)} />}
    </div>
  );
}

// ---------- 12. 1件の中身（管理者） ----------

export function MasterDetailScreen({ id }: { id: string }) {
  const { state, dispatch } = useMock();
  const [target, setTarget] = useState<PassTarget | null>(null);
  const [acting, setActing] = useState<null | "connect" | "decline">(null);
  const lock = useRef(false);
  const r = state.referrals.find((x) => x.id === id);

  // 開いた時点で「確認しました」に進む（出した人に知らせる）。2回呼ばれても、進むのは1回だけ
  useEffect(() => {
    dispatch({ type: "adminOpen", id, now: mockNow() });
  }, [dispatch, id]);

  if (!r) {
    return (
      <div>
        <h1>相談が見つかりません</h1>
        <p className="kz-empty">この相談は、見本の中に残っていません。</p>
        <KLink to="/master" className="kz-btn">受付箱へ</KLink>
      </div>
    );
  }

  const requester = requesterName(r.requesterId, state.members);
  const canPass = canTransition(r.status, "passed");
  const matching = partnersForKind(r.kind);
  const others = PARTNERS.filter((p) => !matching.includes(p));
  const hands = r.interestedIds.map((mid) => state.members.find((m) => m.id === mid)).filter((m): m is NonNullable<typeof m> => !!m);

  const connect = async () => {
    if (lock.current) return;
    lock.current = true;
    setActing("connect");
    const ok = await uiConfirm({ title: "つながったことにしますか？", message: "出した人に「つながりました」のお知らせが届きます。", okLabel: "つながりました", cancelLabel: "やめる" });
    if (!ok) { lock.current = false; setActing(null); return; }
    dispatch({ type: "connect", id: r.id, now: mockNow() });
    uiToast("つながりました、にしました");
    lock.current = false;
    setActing(null);
  };

  const decline = async () => {
    if (lock.current) return;
    lock.current = true;
    setActing("decline");
    // 空のままは閉じず、その場に赤字で理由が出る（共通の入力窓）
    const note = await uiPrompt({ title: "見送りにしますか？", note: "出した人に、この一言がそのまま届きます（必須）。", placeholder: "例：今回は条件に合う渡し先が見つかりませんでした", okLabel: "見送りにする", maxLength: 200 });
    if (!note) { lock.current = false; setActing(null); return; }
    dispatch({ type: "decline", id: r.id, note, now: mockNow() });
    uiToast("見送りにしました。出した人に知らせました", "info");
    lock.current = false;
    setActing(null);
  };

  const passButton = (p: Partner, primary: boolean) => (
    <div key={p.id} className="kz-pass-cell">
      <button type="button" className={primary ? "kz-btn kz-btn--small" : "kz-btn kz-btn--sub kz-btn--small"} onClick={() => setTarget({ referral: r, receiver: receiverFromPartner(p) })}>{p.name}へ渡す</button>
      <Marks receiver={p} />
    </div>
  );

  return (
    <div>
      <p className="kz-meta"><KLink to="/master">‹ 受付箱</KLink></p>
      <h1>{summaryOf(r.body, 40)}</h1>
      <div className="kz-tags">
        <span className="kz-tag">{kindLabel(r.kind)}</span>
        <span className="kz-tag">{placeOf(r)}</span>
        <span className="kz-tag">{timingLabel(r.timing)}</span>
        <span className="kz-tag">{requester}</span>
      </div>
      <h2>相談の内容</h2>
      <p className="kz-quote">{r.body}</p>
      <PhotoTiles photos={r.photos} />
      <p className="kz-meta">{formatJst(r.createdAt)}に受け付け</p>

      <hr className="kz-rule" />
      <h2>手を挙げた人（{hands.length}名）</h2>
      {hands.length === 0 ? (
        <p className="kz-meta">まだ手を挙げた人はいません。</p>
      ) : (
        <div className="kz-list">
          {hands.map((m) => (
            <div key={m.id} className="kz-row">
              <p><strong>{m.company}</strong></p>
              <p className="kz-meta">{m.name}・{m.areas.join("・")}</p>
              <Marks receiver={m} />
              {canPass && (
                <div className="kz-pass-grid">
                  <button type="button" className="kz-btn kz-btn--small" onClick={() => setTarget({ referral: r, receiver: receiverFromMember(m) })}>この人へ渡す</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <hr className="kz-rule" />
      <h2>進み具合</h2>
      <Timeline referral={r} members={state.members} />

      {canPass && (
        <>
          <h2>渡し先を選ぶ</h2>
          {r.kind === "land" && <p className="kz-warn">{LAND_ADMIN_NOTICE}</p>}
          <div className="kz-pass-grid">
            {matching.map((p) => passButton(p, true))}
          </div>
          {others.length > 0 && (
            <>
              <p className="kz-meta">ほかの渡し先（種類は合いません）</p>
              <div className="kz-pass-grid">{others.map((p) => passButton(p, false))}</div>
            </>
          )}
        </>
      )}

      {r.status === "passed" && (
        <>
          <p className="kz-meta">{statusText(r, state.members)}。お返事があったら、下を押してください。</p>
          <div className="kz-btn-row">
            <button type="button" className="kz-btn" disabled={acting !== null} onClick={() => void connect()}>{acting === "connect" ? "確認しています…" : "つながりました"}</button>
            <button type="button" className="kz-btn kz-btn--sub" disabled={acting !== null} onClick={() => void decline()}>{acting === "decline" ? "確認しています…" : "見送りにする"}</button>
          </div>
        </>
      )}
      {canPass && (
        <div className="kz-btn-row">
          <button type="button" className="kz-btn kz-btn--sub" disabled={acting !== null} onClick={() => void decline()}>{acting === "decline" ? "確認しています…" : "見送りにする"}</button>
        </div>
      )}

      {target && <PassModal target={target} requester={requester} onClose={() => setTarget(null)} />}
    </div>
  );
}

// ---------- 14. 渡し先の一覧 ----------

export function PartnersScreen() {
  return (
    <div>
      <h1>渡し先</h1>
      <p className="kz-lead">相談を渡せる会社です。許可・免許の印は目安で、渡すのを止めるものではありません。</p>
      <div className="kz-list">
        {PARTNERS.map((p) => (
          <div key={p.id} className="kz-row">
            <p><strong>{p.name}</strong></p>
            <p className="kz-meta">扱う種類：{KINDS.filter((k) => p.kinds.includes(k.key)).map((k) => k.label).join("・")}</p>
            <Marks receiver={p} />
            <p className="kz-meta">連絡の方法：{p.contactNote}</p>
          </div>
        ))}
      </div>
      <p className="kz-meta">渡し先を足すときは、運営がSQLで行を足します。この画面は見るだけです。</p>
    </div>
  );
}
