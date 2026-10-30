"use client";

// 相談する人の画面：出す＝種類をえらぶ(1')・相談を出す(2)・確認(3)・追跡(4)・出した相談の一覧(5)。
// 送る・取り下げるは、押した瞬間に useRef で錠をかけ、ボタンを「〇〇中…」にして押せなくする。
// 錠は次の画面が出るまで外さない（送れたあと、画面が移る前にもう一度押されないように）。

import { ChevronRight, Camera, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uiAlert, uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Ph } from "@/components/guild/phrase";
import {
  BODY_MAX,
  CONSENT_TEXT,
  FLOW_STEPS,
  KINDS,
  LAND_NOTICE,
  PHOTO_MAX,
  PREFECTURES,
  SEND_FAILURE_MESSAGES,
  TIMINGS,
  canWithdraw,
  formatJst,
  isKindKey,
  isOpen,
  kindLabel,
  placeOf,
  remainingSends,
  summaryOf,
  timingLabel,
  validateStep,
  type DraftStepError,
  type SendFailure,
  type TimingKey,
} from "@/lib/guild/look/kensetsu-mock";
import { emptyDraft } from "@/lib/guild/look/kensetsu-mock-state";
import { KindIcon, PhotoTiles, StepLine, Timeline } from "./parts";
import { KLink, mockNow, useK, useMock } from "./store";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ---------- 1'. 出す（種類をえらぶ） ----------
// ホームは案件（member-screens.tsx の HomeScreen）。ここへは下メニュー「出す」とホームの「＋ 相談・案件を出す」から来る

export function PostScreen() {
  const { state, dispatch } = useMock();
  const { persona } = useK();
  const mine = state.referrals.filter((r) => r.requesterId === persona.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  return (
    <div>
      <h1>何のご相談・案件ですか？</h1>
      <p className="kz-lead"><Ph text="押すと、3つの質問に|答えるだけで|管理者に届きます。|管理者が確認してから、|合う会員に|案件として回ります。" /></p>
      <div className="kz-picks">
        {KINDS.map((k) => (
          <KLink key={k.key} to={`/new?kind=${k.key}`} className="kz-pick" onClick={() => dispatch({ type: "startDraft", kind: k.key })}>
            <KindIcon kind={k.key} />
            <span className="kz-pick-text">
              {k.label}
              {k.note && <small>{k.note}</small>}
            </span>
            <ChevronRight size={22} className="kz-pick-go" aria-hidden />
          </KLink>
        ))}
      </div>
      <hr className="kz-rule" />
      <div className="kz-sec-head">
        <h2>出した相談</h2>
        <KLink to="/referrals">すべて</KLink>
      </div>
      {mine.length === 0 ? (
        <p className="kz-empty">まだ出した相談はありません。上の種類を押すと、はじめられます。</p>
      ) : (
        <div className="kz-list">
          {mine.map((r) => (
            <KLink key={r.id} to={`/referrals/${r.id}`} className="kz-row kz-row-link">
              <p>{summaryOf(r.body)}</p>
              <p className="kz-meta">{kindLabel(r.kind)}・{placeOf(r)}・{formatJst(r.createdAt)}</p>
              <StepLine referral={r} members={state.members} />
            </KLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- 2. 相談を出す（1/3〜3/3） ----------

export function RequestFlow() {
  const { state, dispatch } = useMock();
  const { go, params } = useK();
  const draft = state.draft;
  const kindParam = params.get("kind");
  const kind = isKindKey(kindParam) ? kindParam : draft.kind;
  // 直接URLで開いたとき用。ホームから来たときは、押した時点で下書きを用意してある（同じ種類の途中の下書きは残す）
  useEffect(() => {
    dispatch({ type: "startDraft", kind });
  }, [dispatch, kind]);
  const stepParam = Number(params.get("step"));
  const [step, setStep] = useState(stepParam >= 1 && stepParam <= 3 ? stepParam : 1);
  const [error, setError] = useState<DraftStepError | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 用意が済むまでの一瞬は、空の下書きとして見せる（前の相談の内容を見せない）
  const shown = draft.sent || draft.kind !== kind ? emptyDraft(kind) : draft;
  const meta = FLOW_STEPS[step - 1];

  const next = () => {
    if (lock.current) return;
    const err = validateStep(step, shown);
    setError(err);
    if (err) return;
    if (step < 3) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    lock.current = true;
    setBusy(true);
    go("/new/confirm");
  };
  const back = () => {
    setError(null);
    setStep(step - 1);
    window.scrollTo({ top: 0 });
  };

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = PHOTO_MAX - shown.photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(room, 0));
    if (files.length > picked.length) uiToast(`写真は${PHOTO_MAX}枚までです`, "info");
    if (picked.length > 0) {
      dispatch({ type: "addPhotos", photos: picked.map((f, i) => ({ id: `up-${Date.now()}-${i}`, name: f.name, url: URL.createObjectURL(f) })) });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <p className="kz-progress">{step}/3</p>
      <div className="kz-bar" aria-hidden>
        {[1, 2, 3].map((n) => <i key={n} className={n <= step ? "on" : ""} />)}
      </div>
      <p className="kz-meta">{kindLabel(kind)}</p>
      <h1>{meta.title}</h1>

      {step === 1 && (
        <div>
          {kind === "land" && <p className="kz-note-line">{LAND_NOTICE}</p>}
          <label className="kz-field">
            <span>都道府県（必ず選びます）</span>
            <select
              className="kz-input"
              value={shown.prefecture}
              aria-invalid={error?.field === "prefecture"}
              onChange={(e) => { dispatch({ type: "patchDraft", patch: { prefecture: e.target.value } }); setError(null); }}
            >
              <option value="">選んでください</option>
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {error?.field === "prefecture" && <p className="kz-error" role="alert">{error.message}</p>}
          </label>
          <label className="kz-field">
            <span>市区町村（分かれば）</span>
            <input className="kz-input" type="text" value={shown.city} maxLength={40} placeholder="例：堺市" onChange={(e) => dispatch({ type: "patchDraft", patch: { city: e.target.value } })} />
          </label>
        </div>
      )}

      {step === 2 && (
        <fieldset className="kz-field">
          <legend className="kz-label">いつまでに、動き出したいですか</legend>
          <div className="kz-choices" role="radiogroup">
            {TIMINGS.map((t) => (
              <label key={t.key} className="kz-choice">
                <input type="radio" name="timing" checked={shown.timing === t.key} onChange={() => { dispatch({ type: "patchDraft", patch: { timing: t.key as TimingKey } }); setError(null); }} />
                {t.label}
              </label>
            ))}
          </div>
          {error?.field === "timing" && <p className="kz-error" role="alert">{error.message}</p>}
        </fieldset>
      )}

      {step === 3 && (
        <div>
          <label className="kz-field">
            <span>ご相談の内容</span>
            <textarea
              ref={textRef}
              className="kz-input"
              value={shown.body}
              maxLength={BODY_MAX}
              aria-invalid={error?.field === "body"}
              placeholder="例：倉庫の屋根から雨漏りがしています。次の雨までに見てもらえる会社を探しています。"
              onChange={(e) => { dispatch({ type: "patchDraft", patch: { body: e.target.value } }); setError(null); }}
            />
            <p className="kz-count">{shown.body.length}/{BODY_MAX}</p>
            {error?.field === "body" && <p className="kz-error" role="alert">{error.message}</p>}
          </label>
          <div className="kz-tools">
            <button
              type="button"
              className="kz-btn kz-btn--sub"
              onClick={() => {
                textRef.current?.focus();
                uiToast("キーボードのマイクを押して話すと、そのまま文字になります", "info");
              }}
            >
              <Mic size={22} aria-hidden />声で入れる
            </button>
            <button
              type="button"
              className="kz-btn kz-btn--sub"
              aria-disabled={shown.photos.length >= PHOTO_MAX}
              onClick={() => {
                if (shown.photos.length >= PHOTO_MAX) { uiToast(`写真は${PHOTO_MAX}枚までです`, "info"); return; }
                fileRef.current?.click();
              }}
            >
              <Camera size={22} aria-hidden />写真を付ける
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <PhotoTiles photos={shown.photos} onRemove={(id) => dispatch({ type: "removePhoto", id })} />
          <p className="kz-meta">写真は{PHOTO_MAX}枚まで。この見本では、選んだ写真はこの画面の中にだけ表示します。</p>
        </div>
      )}

      <div className="kz-btn-row">
        <button type="button" className="kz-btn" disabled={busy} onClick={next}>
          {busy ? "確認の画面へ…" : step < 3 ? "次へ" : "確認へ"}
        </button>
        {step > 1 ? (
          <button type="button" className="kz-btn kz-btn--sub" disabled={busy} onClick={back}>もどる</button>
        ) : (
          <KLink to="/post" className="kz-btn kz-btn--sub">種類をえらびなおす</KLink>
        )}
      </div>
    </div>
  );
}

// ---------- 3. 確認 ----------

export function ConfirmScreen() {
  const { state, dispatch } = useMock();
  const { go, persona, params } = useK();
  const draft = state.draft;
  const [consent, setConsent] = useState(draft.consent);
  const [consentError, setConsentError] = useState(false);
  const [sending, setSending] = useState(false);
  const lock = useRef(false);

  if (draft.sent && !sending) {
    return (
      <div>
        <h1>この相談は送りました</h1>
        <p className="kz-empty">同じ内容は、もう一度送れません。進み具合は、出した相談から見られます。</p>
        <KLink to="/referrals" className="kz-btn">出した相談を見る</KLink>
      </div>
    );
  }
  if (!draft.body.trim()) {
    return (
      <div>
        <h1>入力がありません</h1>
        <p className="kz-empty">相談の入力が見つかりません。はじめからやり直してください。</p>
        <KLink to="/post" className="kz-btn">はじめからやり直す</KLink>
      </div>
    );
  }

  const send = async () => {
    if (lock.current) return;
    if (!consent) {
      setConsentError(true);
      return;
    }
    // 押した瞬間に錠（useRef）。state は反映が遅れるので、ここで先にかける
    lock.current = true;
    setSending(true);
    const fail = async (reason: SendFailure) => {
      const { title, message } = SEND_FAILURE_MESSAGES[reason];
      await uiAlert({ title, message, okLabel: "閉じる", danger: true });
      lock.current = false;
      setSending(false);
    };
    const now = mockNow();
    if (remainingSends(state.referrals, persona.id, now) <= 0) return fail("limit");
    await wait(700);
    // 見本用：?fail=network / ?fail=other を付けると、失敗の窓を確かめられる
    const forced = params.get("fail");
    if (forced === "network" || forced === "other") return fail(forced);
    const id = `r${state.nextId}`;
    dispatch({ type: "patchDraft", patch: { consent: true } });
    dispatch({ type: "submit", requesterId: persona.id, now });
    uiToast("管理者に届きました");
    // 錠は外さない。追跡の画面が出るまで、もう一度押せないまま
    go(`/referrals/${id}`);
  };

  return (
    <div>
      <h1>この内容で送りますか？</h1>
      <p className="kz-lead">送る前に、内容を確かめてください。</p>
      <dl className="kz-list">
        <ConfirmRow term="種類" value={kindLabel(draft.kind)} />
        <ConfirmRow term="場所" value={`${draft.prefecture}${draft.city.trim()}`} />
        <ConfirmRow term="いつまでに" value={timingLabel(draft.timing)} />
        <div className="kz-row">
          <dt className="kz-label">内容</dt>
          <dd className="kz-quote">{draft.body.trim()}</dd>
          <PhotoTiles photos={draft.photos} />
        </div>
      </dl>
      <label className="kz-check">
        <input type="checkbox" checked={consent} disabled={sending} onChange={(e) => { setConsent(e.target.checked); setConsentError(false); }} />
        <span>{CONSENT_TEXT}</span>
      </label>
      {consentError && <p className="kz-error" role="alert">同意にチェックを入れてください。チェックがないと送れません。</p>}
      <div className="kz-btn-row">
        <button type="button" className="kz-btn" disabled={sending} onClick={() => void send()}>
          {sending ? "送っています…" : "この内容で送る"}
        </button>
        <KLink to={`/new?kind=${draft.kind}&step=3`} className="kz-btn kz-btn--sub" aria-disabled={sending} onClick={(e) => { if (sending) e.preventDefault(); }}>もどって なおす</KLink>
      </div>
    </div>
  );
}

function ConfirmRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="kz-row">
      <dt className="kz-label">{term}</dt>
      <dd className="kz-confirm-value">{value}</dd>
    </div>
  );
}

// ---------- 4. 追跡 ----------

export function TrackingScreen({ id }: { id: string }) {
  const { state, dispatch } = useMock();
  const { persona } = useK();
  const [withdrawing, setWithdrawing] = useState(false);
  const lock = useRef(false);
  const r = state.referrals.find((x) => x.id === id);

  if (!r) {
    return (
      <div>
        <h1>相談が見つかりません</h1>
        <p className="kz-empty">この相談は、見本の中に残っていません（再読み込みで元に戻ります）。</p>
        <KLink to="/referrals" className="kz-btn">出した相談の一覧へ</KLink>
      </div>
    );
  }

  const withdraw = async () => {
    if (lock.current) return;
    lock.current = true;
    setWithdrawing(true);
    const ok = await uiConfirm({
      title: "取り下げますか？",
      message: "この相談を取り下げます。管理者には渡されなくなります。取り下げたあとは、元に戻せません。",
      okLabel: "取り下げる",
      cancelLabel: "やめる",
      danger: true,
    });
    if (!ok) {
      lock.current = false;
      setWithdrawing(false);
      return;
    }
    dispatch({ type: "withdraw", id: r.id, now: mockNow() });
    uiToast("取り下げました", "info");
  };

  return (
    <div>
      <p className="kz-meta"><KLink to="/referrals">‹ 出した相談</KLink></p>
      <h1>{summaryOf(r.body, 40)}</h1>
      <div className="kz-tags">
        <span className="kz-tag">{kindLabel(r.kind)}</span>
        <span className="kz-tag">{placeOf(r)}</span>
        <span className="kz-tag">{timingLabel(r.timing)}</span>
      </div>
      <Timeline referral={r} members={state.members} />
      <h2>送った内容</h2>
      <p className="kz-quote">{r.body}</p>
      <PhotoTiles photos={r.photos} />
      {canWithdraw(r.status) && r.requesterId === persona.id && (
        <>
          <hr className="kz-rule" />
          <button type="button" className="kz-btn kz-btn--sub" disabled={withdrawing} onClick={() => void withdraw()}>
            {withdrawing ? "取り下げています…" : "取り下げる"}
          </button>
          <p className="kz-meta">取り下げられるのは、管理者が渡す前までです。</p>
        </>
      )}
    </div>
  );
}

// ---------- 5. 出した相談の一覧 ----------

export function ReferralsScreen() {
  const { state } = useMock();
  const { persona } = useK();
  const [tab, setTab] = useState<"open" | "closed">("open");
  const mine = state.referrals.filter((r) => r.requesterId === persona.id).sort((a, b) => b.createdAt - a.createdAt);
  const open = mine.filter((r) => isOpen(r.status));
  const closed = mine.filter((r) => !isOpen(r.status));
  const shown = tab === "open" ? open : closed;
  return (
    <div>
      <h1>出した相談</h1>
      <div className="kz-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "open"} onClick={() => setTab("open")}>進行中<em>{open.length}</em></button>
        <button type="button" role="tab" aria-selected={tab === "closed"} onClick={() => setTab("closed")}>終わった<em>{closed.length}</em></button>
      </div>
      {shown.length === 0 ? (
        <p className="kz-empty">{tab === "open" ? "進行中の相談はありません。" : "終わった相談はまだありません。"}</p>
      ) : (
        <div role="tabpanel">
          {shown.map((r) => (
            <KLink key={r.id} to={`/referrals/${r.id}`} className="kz-row kz-row-link">
              <p>{summaryOf(r.body)}</p>
              <p className="kz-meta">{kindLabel(r.kind)}・{placeOf(r)}・{formatJst(r.createdAt)}</p>
              <StepLine referral={r} members={state.members} />
            </KLink>
          ))}
        </div>
      )}
    </div>
  );
}
