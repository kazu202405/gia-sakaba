"use client";

// 見本の共通部品：顔・ロゴ・本人の一言・許可の札・つながりの一文・紹介の道すじ・人/会社の行・モーダル・紹介のおねがい・読み込み中。
// 画面ごとに同じものを書かない（ここを使う）。色・形は sns.css の変数だけ。

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Circle, Clock, FileText, HardHat, House, MapPin, Send, type LucideIcon } from "lucide-react";
import { uiToast } from "@/lib/ui-dialog";
import {
  INDUSTRY_KIND,
  INTRO_NOTE_MAX,
  ME_ID,
  answersFor,
  areaText,
  companyOf,
  dueInfo,
  findPerson,
  kindOfCompany,
  kindOfPerson,
  postRegions,
  relationText,
  relationTo,
  relationToCompany,
  routeTo,
  shortName,
  type Company,
  type Industry,
  type KindKey,
  type License,
  type Person,
  type Relation,
  type WantPost,
} from "@/lib/guild/look/sns-mock";
import { SnLink, useSnState } from "./store";

/** 業種の小さな印（建設＝ヘルメット／不動産＝家／士業＝書類／その他＝丸）。自分は印なし */
const KIND_ICON: Record<Exclude<KindKey, "me">, LucideIcon> = { build: HardHat, estate: House, pro: FileText, other: Circle };

export function KindIcon({ kind, size = 14 }: { kind: Exclude<KindKey, "me">; size?: number }) {
  const Icon = KIND_ICON[kind];
  return <Icon size={size} strokeWidth={2.2} aria-hidden />;
}

/** 顔。業種の色の輪＋右下に業種の印。自分は墨の丸に「私」。本番では本人の写真。見本は苗字 */
export function Avatar({ person, size }: { person: Pick<Person, "id" | "name" | "companyId">; size?: "sm" | "lg" }) {
  const kind = kindOfPerson(person);
  const cls = size ? `sn-fc sn-fc--${size}` : "sn-fc";
  if (kind === "me") return <span className={cls} data-kind="me" aria-hidden>私</span>;
  return (
    <span className={cls} data-kind={kind} aria-hidden>
      {shortName(person)}
      <span className="sn-fc-kind"><KindIcon kind={kind} /></span>
    </span>
  );
}

export function Logo({ company }: { company: Pick<Company, "mark" | "industries"> }) {
  return <span className="sn-logo" data-kind={kindOfCompany(company)} aria-hidden>{company.mark}</span>;
}

/** 業種の札（色つき＋印）。場所などの札は PlainPill */
export function IndustryPill({ industry }: { industry: Industry }) {
  const kind = INDUSTRY_KIND[industry];
  return <span className="sn-pill" data-kind={kind}><KindIcon kind={kind} />{industry}</span>;
}

export function PlainPill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return <span className="sn-pill sn-pill--plain">{icon}{children}</span>;
}

/**
 * 紹介の道（横）：あなた → 通る人 → 相手。直接の知り合いは実線、知り合いの知り合いは点線。一覧で小さく使う。
 * 自分が出した案件は「あなたの依頼」、道が無い相手は相手の顔だけ。
 */
export function RoutePath({ author }: { author: Person }) {
  const route = routeTo(author.id);
  if (author.id === ME_ID) {
    return <div className="sn-path"><Avatar person={author} size="sm" /><span className="sn-path-note">あなたの依頼</span></div>;
  }
  if (route.length === 0) {
    return <div className="sn-path"><Avatar person={author} size="sm" /><span className="sn-path-note">道はまだありません</span></div>;
  }
  return (
    <div className="sn-path" role="img" aria-label={`あなた、${route.map((p) => `${shortName(p)}さん`).join("、")}の順につながっています`}>
      <MeFace />
      {route.map((p, i) => (
        <Fragment key={p.id}>
          <i className={i > 0 ? "sn-far" : undefined} />
          <Avatar person={p} size="sm" />
        </Fragment>
      ))}
    </div>
  );
}

/** 自分の顔（墨の丸に「私」） */
export function MeFace({ size = "sm" }: { size?: "sm" | "lg" }) {
  return <Avatar person={{ id: ME_ID, name: "あなた", companyId: "" }} size={size} />;
}

/** 本人の一言（「」つき） */
export function Say({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className ? `sn-say ${className}` : "sn-say"}>{children}</p>;
}

/** 見直しの上の絵：顔を線でつなぐ。null は自分（あなた）。右に向かって「紹介の流れ」 */
export function MeetPicture({ people }: { people: readonly (Person | null)[] }) {
  return (
    <div className="sn-meet" aria-hidden>
      {people.map((p, i) => (
        <Fragment key={p?.id ?? ME_ID}>
          {i > 0 && <span className="sn-meet-line" />}
          <div className="sn-meet-side">
            {p ? <Avatar person={p} size="lg" /> : <MeFace size="lg" />}
            <b>{p ? `${p.name}さん` : "あなた"}</b>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/** 期限の表示（7日以内は赤）。期限なしは何も出さない */
export function Due({ deadline }: { deadline: string | null }) {
  const due = dueInfo(deadline);
  if (!due) return null;
  return <span className={due.soon ? "sn-due sn-due--soon" : due.past ? "sn-due sn-due--past" : "sn-due"}><Clock aria-hidden />{due.label}</span>;
}

/** 「探しています」の1行：紹介の道（横）・期限・題名・業種と場所の札。案件の一覧・ホーム・マイページで同じものを使う */
export function WantRow({ post }: { post: WantPost }) {
  const { myAnswers } = useSnState();
  const author = findPerson(post.authorId);
  if (!author) return null;
  const company = companyOf(author);
  return (
    <SnLink to={`/posts/${post.id}`} className="sn-want-row">
      <RoutePath author={author} />
      <Due deadline={post.deadline} />
      <p className="sn-want-w">{post.text}</p>
      <div className="sn-pills">
        <IndustryPill industry={post.industry} />
        <PlainPill icon={<MapPin aria-hidden />}>{postRegions(post).join("・")}</PlainPill>
      </div>
      <p className="sn-want-sub">
        {author.id === ME_ID ? "あなた" : `${author.name}さん${company ? `・${company.name}` : ""}`}　{post.ago}　返事 {answersFor(post.id, myAnswers).length}件
      </p>
    </SnLink>
  );
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

/**
 * 紹介の道（縦・大きく）：あなた → 知り合い → 相手。詳しいページの上に出す。
 * 間の人には、会社と確認済みの許可を添える。
 */
export function RouteLine({ person, relation }: { person: Person; relation: Relation }) {
  if (relation.kind === "self") return null;
  if (relation.kind === "none") {
    return <div className="sn-steps-route"><p className="sn-step-none">まだ紹介できる道がありません</p></div>;
  }
  const middle = relation.kind === "via" ? relation.via : null;
  return (
    <div className="sn-steps-route" aria-label={relationText(relation)}>
      <div className="sn-step" data-link="near">
        <MeFace size="lg" />
        <div><p className="sn-step-n">あなた</p><p className="sn-step-d">{middle ? `${shortName(middle)}さんを知っています` : `${shortName(person)}さんを知っています`}</p></div>
      </div>
      {middle && <RouteStep person={middle} note="あなたの知り合い" link="far" />}
      <RouteStep person={person} note={middle ? `${shortName(middle)}さんの知り合い` : "あなたの知り合い"} />
    </div>
  );
}

function RouteStep({ person, note, link }: { person: Person; note: string; link?: "far" }) {
  const company = companyOf(person);
  const verified = company?.licenses.find((l) => l.verified);
  return (
    <div className="sn-step" data-link={link ?? "near"}>
      <Avatar person={person} size="lg" />
      <div>
        <p className="sn-step-n">{person.name}</p>
        <p className="sn-step-d">{company ? `${company.name}　${person.title}・${person.prefecture}` : person.prefecture}</p>
        <p className="sn-step-d">{note}</p>
        {verified && <p className="sn-step-lic"><Check size={15} aria-hidden />{verified.name}　確認済み</p>}
      </div>
    </div>
  );
}

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
        <Send aria-hidden />{shortName(via)}さんに紹介をたのむ
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
          <MeetPicture people={[null, via, person]} />
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
