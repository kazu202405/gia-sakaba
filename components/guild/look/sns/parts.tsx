"use client";

// 見本の共通部品：顔・ロゴ・本人の一言・許可の札・つながりの一文・紹介の道すじ・人/会社の行・モーダル・紹介のおねがい・読み込み中。
// 画面ごとに同じものを書かない（ここを使う）。色・形は sns.css の変数だけ。

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uiToast } from "@/lib/ui-dialog";
import {
  INTRO_NOTE_MAX,
  areaText,
  companyOf,
  relationText,
  relationTo,
  relationToCompany,
  shortName,
  type Company,
  type License,
  type Person,
  type Relation,
} from "@/lib/guild/look/sns-mock";
import { SnLink, useSnState } from "./store";

/** id から決まる顔の下地の色（1〜4）。同じ人はいつも同じ色 */
function toneOf(id: string): number {
  let n = 0;
  for (const ch of id) n = (n + ch.charCodeAt(0)) % 4;
  return n + 1;
}

/** 顔。本番では本人の写真。見本は苗字 */
export function Avatar({ person }: { person: Pick<Person, "id" | "name"> }) {
  return (
    <span className="sn-av" data-tone={toneOf(person.id)} aria-hidden>
      {shortName(person)}
    </span>
  );
}

export function Logo({ company }: { company: Pick<Company, "mark"> }) {
  return <span className="sn-logo" aria-hidden>{company.mark}</span>;
}

/** 本人の一言（「」つき） */
export function Say({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className ? `sn-say ${className}` : "sn-say"}>{children}</p>;
}

/** 許可・免許。名刺と同じ並び（種類・許可行政庁・番号）で書き、確認済みと自己申告を見分けられるようにする */
export function LicenseTags({ licenses }: { licenses: readonly License[] }) {
  return (
    <>
      {licenses.map((l) => (
        <span key={l.name} className="sn-lic">
          {l.name}
          {l.number && `　${l.number}`}
          <b className={l.verified ? "sn-lic-ok" : "sn-lic-self"}>{l.verified ? "確認済み" : "自己申告"}</b>
        </span>
      ))}
    </>
  );
}

export function RelationLine({ relation }: { relation: Relation }) {
  return <p className="sn-rel" data-kind={relation.kind}>{relationText(relation)}</p>;
}

/** 紹介の道すじ（あなた → 知り合い → 相手）。詳しいページの上に出す */
export function RouteLine({ person, relation }: { person: Person; relation: Relation }) {
  if (relation.kind === "self") return null;
  if (relation.kind === "none") {
    return <p className="sn-route" data-kind="none">まだ紹介できる道がありません</p>;
  }
  return (
    <p className="sn-route" data-kind={relation.kind} aria-label={relationText(relation)}>
      <b>あなた</b>
      <i aria-hidden>→</i>
      {relation.kind === "via" && (
        <>
          <b>{shortName(relation.via)}さん</b>
          <i aria-hidden>→</i>
        </>
      )}
      <b>{shortName(person)}さん</b>
    </p>
  );
}

/** 人の行（探す・人脈・会社の所属で使う） */
/** 人の行（探す・人脈・会社の所属で使う）。名刺の並び：ふりがな・名前・会社と役職、右に所在地と対応エリア、その下に一言・許可・つながり */
export function PersonRow({ person }: { person: Person }) {
  const company = companyOf(person);
  return (
    <SnLink to={`/people/${person.id}`} className="sn-row sn-mrow">
      <Avatar person={person} />
      <div className="sn-row-body">
        <div className="sn-mrow-head">
          <div>
            <p className="sn-kana">{person.kana}</p>
            <p className="sn-mrow-name">{person.name}</p>
            {company && <p className="sn-mrow-co">{company.name}<span>{person.title}</span></p>}
          </div>
          <p className="sn-mrow-where">{person.prefecture}{company && <><br />{areaText(company.areas)}</>}</p>
        </div>
        <Say className="sn-mrow-say">{person.say}</Say>
        {company && <p className="sn-mrow-lic"><LicenseTags licenses={company.licenses} /></p>}
        <RelationLine relation={relationTo(person.id)} />
      </div>
    </SnLink>
  );
}

/** 会社の行（探す） */
export function CompanyRow({ company }: { company: Company }) {
  return (
    <SnLink to={`/companies/${company.id}`} className="sn-row sn-mrow">
      <Logo company={company} />
      <div className="sn-row-body">
        <div className="sn-mrow-head">
          <div>
            <p className="sn-mrow-name sn-mrow-name--co">{company.name}</p>
            <p className="sn-mrow-co">{company.business}</p>
          </div>
          <p className="sn-mrow-where">{company.prefecture}<br />{areaText(company.areas)}</p>
        </div>
        <p className="sn-mrow-say">得意：{company.specialties.join("・")}</p>
        <p className="sn-mrow-lic"><LicenseTags licenses={company.licenses} /></p>
        <RelationLine relation={relationToCompany(company.id).relation} />
      </div>
    </SnLink>
  );
}

/**
 * モーダルの枠。Esc・背景を押すと閉じる（busy の間は閉じない）。開いている間は背面をスクロールさせない。
 * 見本の一番外側（.sn）に出す。下に固定したボタンの中で開くと、下のメニューの裏に隠れて押せなくなるため（sticky は重なりの層を作る）
 */
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
  const box = (
    <div className="sn-modal-back" onClick={() => !busy && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sn-modal-title" className="sn-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="sn-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
  // モーダルは押したあとにだけ開くので、ここではいつも画面（document）がある
  const root = document.querySelector(".sn");
  return root ? createPortal(box, root) : box;
}

// 見本の「送る」にかける時間（本番では保存の待ち時間）
const MOCK_SEND_MS = 900;

/**
 * 紹介をおねがいするボタン（設計書7：A → B に頼み、B が C に確かめる）。
 * 人に届く文章なので、書く → 「この内容で送りますか？」→ 送る の順。「もどって なおす」で書いた内容は消えない。
 * 錠は押した瞬間にかけ、送ったあとは「おねがい中」のまま押せない（二重に頼まない）。
 */
export function IntroRequestButton({ person, relation }: { person: Person; relation: Relation }) {
  const { sentIntros, addSentIntro } = useSnState();
  const [step, setStep] = useState<"closed" | "write" | "review">("closed");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  if (relation.kind === "self" || relation.kind === "none") return null;

  if (relation.kind === "direct") {
    return <ContactButton person={person} />;
  }

  const via = relation.via;
  const sentVia = sentIntros[person.id];
  if (sentVia) {
    return (
      <button type="button" className="sn-btn sn-btn--wide" disabled>
        おねがい中（{shortName(via)}さんの返事を待っています）
      </button>
    );
  }

  const close = () => {
    if (busy) return;
    setStep("closed");
    setError("");
  };

  const toReview = () => {
    if (note.trim() === "") {
      setError("用件をひとこと書いてください。紹介する人が判断しやすくなります");
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
      // 画面の変化（ボタンが「おねがい中」に）とトーストを同じ瞬間に出す。錠は外さない（もう押せない状態になる）
      addSentIntro(person.id, via.id);
      setBusy(false);
      setStep("closed");
      uiToast(`${shortName(via)}さんにおねがいしました`);
    }, MOCK_SEND_MS);
  };

  return (
    <>
      <button type="button" className="sn-btn sn-btn--main sn-btn--wide" onClick={() => setStep("write")}>
        {shortName(via)}さんに紹介をたのむ
      </button>
      {step === "write" && (
        <Modal title={`${shortName(via)}さんに、${shortName(person)}さんの紹介をおねがいする`} onClose={close}>
          <p className="sn-meta sn-modal-lead">
            {shortName(via)}さんが{shortName(person)}さんに確かめて、{shortName(person)}さんがよければつながります。断られることもあります。
          </p>
          <label className="sr-only" htmlFor="sn-intro-note">用件</label>
          <textarea
            id="sn-intro-note"
            value={note}
            maxLength={INTRO_NOTE_MAX}
            placeholder="例：九州の太陽光の保守で、一度お話を聞きたいです"
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={error !== ""}
            aria-describedby={error ? "sn-intro-error" : undefined}
          />
          {error && <p id="sn-intro-error" className="sn-error" role="alert">{error}</p>}
          <div className="sn-modal-acts">
            <button type="button" className="sn-btn" onClick={close}>やめる</button>
            <button type="button" className="sn-btn sn-btn--main" onClick={toReview}>内容を確かめる</button>
          </div>
        </Modal>
      )}
      {step === "review" && (
        <Modal title="この内容で送りますか？" onClose={() => !busy && setStep("write")} busy={busy}>
          <dl className="sn-review">
            <dt>届く人</dt>
            <dd>{via.name}さん</dd>
            <dt>紹介してほしい人</dt>
            <dd>{person.name}さん（{companyOf(person)?.name ?? ""}）</dd>
            <dt>用件</dt>
            <dd>{note.trim()}</dd>
          </dl>
          <div className="sn-modal-acts">
            <button type="button" className="sn-btn" disabled={busy} onClick={() => setStep("write")}>もどって なおす</button>
            <button type="button" className="sn-btn sn-btn--main" disabled={busy} onClick={send}>{busy ? "送っています…" : "送る"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** 直接の知り合いには、連絡先を出す（設計書7：当事者同士で連絡できる） */
function ContactButton({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <dl className="sn-review" aria-label={`${person.name}さんの連絡先`}>
        <dt>電話</dt>
        <dd>{person.contact.phone}</dd>
        <dt>メール</dt>
        <dd>{person.contact.email}</dd>
      </dl>
    );
  }
  return (
    <button type="button" className="sn-btn sn-btn--main sn-btn--wide" onClick={() => setOpen(true)}>
      連絡先を見る
    </button>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中</span>
      <div aria-hidden>
        <span className="sn-skel sn-skel--face" />
        <span className="sn-skel sn-skel--title" />
        <span className="sn-skel sn-skel--line" />
        <span className="sn-skel sn-skel--block" />
        <span className="sn-skel sn-skel--block" />
      </div>
    </div>
  );
}
