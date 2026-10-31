"use client";

// 見本の「ひとこと → この内容で送りますか？ → 送る」の共通の流れと、URLのコピーボタン。
// 人脈・案件・管理者の画面で同じものを使う（画面ごとに書かない）。parts.tsx の Modal を使う。

import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import { INTRO_NOTE_MAX } from "@/lib/guild/look/sns-mock";
import { Modal } from "./parts";

// 見本の「送る」にかける時間（本番では保存の待ち時間）
export const SEND_MS = 900;

export type ReviewRow = { label: string; value: string };

/**
 * 文章を人に送る流れ。書く → 確かめ → 送る。
 * 「もどって なおす」で書いた内容は消えない。空は赤字で理由を出し、閉じない。送信中は押せず、錠は押した瞬間にかける。
 * 送れたら onSent(note) を呼ぶ（親が状態を変えてトーストを出し、この窓を閉じる）。錠は窓を閉じるまで外さない。
 */
export function ComposeFlow({
  title,
  lead,
  placeholder,
  required,
  emptyMessage,
  reviewRows,
  sendLabel = "送る",
  picture,
  onClose,
  onSent,
}: {
  title: string;
  lead?: string;
  placeholder?: string;
  /** true のとき、空だと先へ進めない */
  required: boolean;
  emptyMessage?: string;
  reviewRows: (note: string) => ReviewRow[];
  sendLabel?: string;
  /** 見直しの上に出す、だれとだれがつながるかの絵（任意） */
  picture?: React.ReactNode;
  onClose: () => void;
  onSent: (note: string) => void;
}) {
  const [step, setStep] = useState<"write" | "review">("write");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const toReview = () => {
    if (required && note.trim() === "") {
      setError(emptyMessage ?? "ひとこと書いてください");
      return;
    }
    setError("");
    setStep("review");
  };

  const send = () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    window.setTimeout(() => onSent(note.trim()), SEND_MS);
  };

  if (step === "write") {
    return (
      <Modal title={title} onClose={onClose}>
        {lead && <p className="sn-meta sn-modal-lead">{lead}</p>}
        <label className="sr-only" htmlFor="sn-flow-note">ひとこと</label>
        <textarea
          id="sn-flow-note"
          value={note}
          maxLength={INTRO_NOTE_MAX}
          placeholder={placeholder}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={error !== ""}
          aria-describedby={error ? "sn-flow-error" : undefined}
        />
        {error && <p id="sn-flow-error" className="sn-error" role="alert">{error}</p>}
        <div className="sn-modal-acts">
          <button type="button" className="sn-btn" onClick={onClose}>やめる</button>
          <button type="button" className="sn-btn sn-btn--main" onClick={toReview}>内容を確かめる</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="この内容で送りますか？" onClose={() => setStep("write")} busy={busy}>
      {picture}
      <dl className="sn-review">
        {reviewRows(note.trim()).map((r) => (
          <ReviewItem key={r.label} row={r} />
        ))}
      </dl>
      <div className="sn-modal-acts">
        <button type="button" className="sn-btn" disabled={busy} onClick={() => setStep("write")}>もどって なおす</button>
        <button type="button" className="sn-btn sn-btn--main" disabled={busy} onClick={send}>{busy ? "送っています…" : sendLabel}</button>
      </div>
    </Modal>
  );
}

function ReviewItem({ row }: { row: ReviewRow }) {
  return (
    <>
      <dt>{row.label}</dt>
      <dd>{row.value === "" ? "（書かない）" : row.value}</dd>
    </>
  );
}

/** URLをコピーする。できたらトースト、できなければURLを出してそのまま写してもらう */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 招待URLのコピーボタン。押した瞬間に「コピーしました」に変わる（コピーできなかったときは理由とURLを出す） */
export function CopyUrlButton({ url, label, doneLabel = "コピーしました", className = "sn-btn", onCopied }: {
  url: string;
  label: string;
  doneLabel?: string;
  className?: string;
  onCopied?: () => void;
}) {
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  const press = async () => {
    if (lock.current) return;
    lock.current = true;
    const ok = await copyText(url);
    lock.current = false;
    if (!ok) {
      uiToast(`コピーできませんでした。次のURLを写してください：${url}`, "error");
      return;
    }
    setDone(true);
    uiToast("招待URLをコピーしました。LINEに貼って送れます");
    onCopied?.();
    window.setTimeout(() => setDone(false), 2500);
  };
  return (
    <button type="button" className={className} onClick={press}>
      {done ? doneLabel : label}
    </button>
  );
}
