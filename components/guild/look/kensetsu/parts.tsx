"use client";

// モックの共通部品：種類のアイコン・進み具合の線・追跡の縦線・許可/免許の印・写真・モーダルの枠。
// 色・角丸は kensetsu.css（--guild-* を読む）。箱（カード）は作らない。モーダルだけは箱。

import { useEffect, useRef } from "react";
import { Banknote, Building2, Ellipsis, Hammer, Landmark, Users, X, type LucideIcon } from "lucide-react";
import {
  STATUS_FLOW,
  findReceiver,
  formatJst,
  licenseMarks,
  reachedSteps,
  statusText,
  type KindKey,
  type Member,
  type Photo,
  type Receiver,
  type Referral,
} from "@/lib/guild/look/kensetsu-mock";

const KIND_ICONS: Record<KindKey, LucideIcon> = {
  construction: Hammer,
  vendor: Users,
  land: Landmark,
  subsidy: Banknote,
  other: Ellipsis,
};

export function KindIcon({ kind, size = 28 }: { kind: KindKey; size?: number }) {
  const Icon = KIND_ICONS[kind] ?? Building2;
  return <Icon size={size} strokeWidth={1.8} aria-hidden className="kz-pick-icon" />;
}

/** 許可・免許の印（表示だけ。渡すのは止めない） */
export function Marks({ receiver }: { receiver: Pick<Receiver, "hasConstructionLicense" | "hasRealEstateLicense"> }) {
  return (
    <span className="kz-marks">
      {licenseMarks(receiver).map((m) => (
        <span key={m.label} className={m.on ? "kz-mark" : "kz-mark kz-mark--off"}>
          {m.label}　{m.on ? "あり" : "なし"}
        </span>
      ))}
    </span>
  );
}

/** 一覧の行に出す、4段の進み具合と、いまの状態の一文 */
export function StepLine({ referral, members }: { referral: Referral; members: readonly Member[] }) {
  const reached = reachedSteps(referral.status);
  const closed = referral.status === "declined" || referral.status === "withdrawn";
  return (
    <div className={closed ? "kz-steps kz-steps--closed" : "kz-steps"}>
      {STATUS_FLOW.map((s, i) => (
        <b key={s} className={i < reached ? "" : "off"} aria-hidden />
      ))}
      <span>{statusText(referral, members)}</span>
    </div>
  );
}

const TIMELINE_LABELS = ["受け付けました", "管理者が確認しました", "", "つながりました"] as const;

/** 追跡の縦の線（4段・各段に日時）。見送り・取り下げは線の代わりに文を出す */
export function Timeline({ referral, members }: { referral: Referral; members: readonly Member[] }) {
  if (referral.status === "declined") {
    return (
      <div className="kz-note-line">
        <p className="kz-label">見送りになりました</p>
        <p className="kz-quote">{referral.closeNote}</p>
        {referral.closedAt && <p className="kz-meta">{formatJst(referral.closedAt)}　管理者より</p>}
      </div>
    );
  }
  if (referral.status === "withdrawn") {
    return (
      <div className="kz-note-line">
        <p className="kz-label">取り下げました</p>
        {referral.withdrawnAt && <p className="kz-meta">{formatJst(referral.withdrawnAt)}</p>}
      </div>
    );
  }
  const reached = reachedSteps(referral.status);
  const times = [referral.createdAt, referral.reviewedAt, referral.passedAt, referral.connectedAt];
  const receiverName = findReceiver(referral.passedToId, members)?.name ?? "渡し先";
  const hints = ["管理者が内容を読みます", "渡し先を選んでいます", "お返事があり次第、お知らせします", ""];
  return (
    <ol className="kz-time" aria-label="進み具合">
      {STATUS_FLOW.map((s, i) => {
        const done = i < reached;
        const now = i === reached - 1 && referral.status !== "connected";
        const label = i === 2 ? `${receiverName}に相談中` : TIMELINE_LABELS[i];
        const cls = now ? "kz-st kz-st--now" : done ? "kz-st" : "kz-st kz-st--off";
        const time = times[i];
        return (
          <li key={s} className={cls} aria-current={now ? "step" : undefined}>
            <p>{label}</p>
            {done && time ? <p className="kz-meta">{formatJst(time)}{now && hints[i] ? `　${hints[i]}` : ""}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** 写真の並び。選んだ画像は Object URL で表示するだけ（アップロードしない）。仮データは「写真」の枠 */
export function PhotoTiles({ photos, onRemove }: { photos: readonly Photo[]; onRemove?: (id: string) => void }) {
  if (photos.length === 0) return null;
  return (
    <div className="kz-photos">
      {photos.map((p, i) => (
        <span key={p.id} className="kz-photo">
          {p.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- 端末の中の Object URL。最適化の対象ではない
            <img src={p.url} alt={`選んだ写真${i + 1}`} />
          ) : (
            "写真"
          )}
          {onRemove && (
            <button type="button" className="kz-photo-x" aria-label={`写真${i + 1}を外す`} onClick={() => onRemove(p.id)}>
              <span><X size={14} aria-hidden /></span>
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

/** モーダルの枠（確認・渡す）。Esc・背景を押すと閉じる（busy の間は閉じない）。開いている間は背面をスクロールさせない */
export function Modal({ title, onClose, busy = false, children }: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  return (
    <div className="kz-modal-back" onClick={() => !busy && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="kz-modal-title" className="kz-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="kz-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
