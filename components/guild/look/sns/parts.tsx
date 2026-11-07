"use client";

// 見本の共通部品：顔・ロゴ・本人の一言・許可の札・つながりの一文・紹介の道すじ・人/会社の行・モーダル・紹介のおねがい・読み込み中。
// 画面ごとに同じものを書かない（ここを使う）。色・形は sns.css の変数だけ。

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Circle, Clock, FileText, HardHat, House, MapPin, MessageSquare, Send, type LucideIcon } from "lucide-react";
import { uiToast } from "@/lib/ui-dialog";
import { PERMIT_LABELS } from "@/lib/guild/look/sns-construction";
import { createIntroRequest, hasOpenRequest, nextIntroId } from "@/lib/guild/look/sns-network";
import {
  INDUSTRY_KIND,
  INTRO_NOTE_MAX,
  ME_ID,
  answersFor,
  areaText,
  canReveal,
  companyOf,
  dueInfo,
  findPerson,
  introStatusText,
  kindOfCompany,
  kindOfPerson,
  maskedLabel,
  personContactRows,
  postRegions,
  relationText,
  relationToCompany,
  revealLabel,
  routeTo,
  shortName,
  todayIso,
  type Company,
  type Industry,
  type KindKey,
  type License,
  type Person,
  type Relation,
  type WantPost,
} from "@/lib/guild/look/sns-mock";
import { ComposeFlow } from "./flow";
import { SnLink, useRelation, useSnState } from "./store";

/** 業種の小さな印（建設＝ヘルメット／不動産＝家／士業＝書類／その他＝丸）。自分は印なし */
const KIND_ICON: Record<Exclude<KindKey, "me">, LucideIcon> = { build: HardHat, estate: House, pro: FileText, other: Circle };

export function KindIcon({ kind, size = 14 }: { kind: Exclude<KindKey, "me">; size?: number }) {
  const Icon = KIND_ICON[kind];
  return <Icon size={size} strokeWidth={2.2} aria-hidden />;
}

/** 顔。業種の色の輪＋右下に業種の印。自分は墨の丸に「私」。本番では本人の写真。見本は苗字 */
export function Avatar({ person, size, asOther = false }: { person: Pick<Person, "id" | "name" | "companyId">; size?: "sm" | "lg"; asOther?: boolean }) {
  const kind = kindOfPerson(person, asOther ? null : ME_ID);
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
  const { net } = useSnState();
  const route = routeTo(author.id, ME_ID, net);
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

/**
 * 会社の中身（会社のページとマイページで同じもの）。前半が会社の基本、後半が探すで使われる内容。
 * 番地・電話・FAX・メールは、本人が選んだ見せる相手（company.reveal）と relation で出し分ける。
 * showReveal＝マイページ用。本人に「だれに見せているか」を札で見せる。
 */
export function CompanyFacts({ company: c, relation, showReveal = false }: { company: Company; relation: Relation; showReveal?: boolean }) {
  const works = (c.construction ?? []).map((w) => `${w.trade}（${PERMIT_LABELS[w.permit]}）`).join("・");
  const see = (field: keyof Company["reveal"]) => canReveal(c.reveal[field], relation);
  const tag = (field: keyof Company["reveal"], text?: string) => showReveal && <span className="sn-reveal">{text}{revealLabel(c.reveal[field])}</span>;
  // 知り合いになれば見られる項目があるときだけ案内する（「見せない」は案内しない）
  const locked = (["street", "phone", "fax", "email"] as const).some((f) => c[f] && c.reveal[f] === "friends" && !see(f));
  const rows: readonly (readonly [string, React.ReactNode])[] = [
    ["所在地", see("street") ? <>{`${c.postalCode && `〒${c.postalCode} `}${c.prefecture}${c.city}${c.street}`}{tag("street", "番地：")}</> : `${c.prefecture}${c.city}`],
    ["電話", c.phone && see("phone") && <><a href={`tel:${c.phone}`}>{c.phone}</a>{tag("phone")}</>],
    ["FAX", c.fax && see("fax") && <>{c.fax}{tag("fax")}</>],
    ["メール", c.email && see("email") && <><a href={`mailto:${c.email}`}>{c.email}</a>{tag("email")}</>],
    ["連絡先", locked && "知り合いになると見られます"],
    ["ホームページ", c.url && <a href={c.url} target="_blank" rel="noopener noreferrer">{c.url}</a>],
    ["業種", c.industries.join("・")],
    ["事業の内容", c.business],
    ["対応エリア", areaText(c.areas)],
    ["得意なこと", c.specialties.join("・")],
    ["建設の業種", works],
    ["不動産の取引", c.estate?.transactions.join("・")],
    ["物件の種類", c.estate?.properties.join("・")],
    ["資格", c.professions?.join("・")],
    ["許可・登録", c.licenses.length > 0 && <LicenseTags licenses={c.licenses} />],
  ];
  return (
    <dl className="sn-dl">
      {rows.filter(([, value]) => value).map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
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
  if (relation.kind === "none" || relation.kind === "masked") {
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
  const relation = useRelation(person.id);
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
        <RelationLine relation={relation} />
      </div>
    </SnLink>
  );
}

/** 会社の行（探す） */
export function CompanyRow({ company }: { company: Company }) {
  const { net } = useSnState();
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
        <RelationLine relation={relationToCompany(company.id, ME_ID, net).relation} />
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
 * 紹介をおねがいする流れ（設計書7：A → B に頼み、B が承認して C に聞く）。
 * 人に届く文章なので、書く → 「この内容で送りますか？」→ 送る の順。「もどって なおす」で書いた内容は消えない。
 * vias が2人以上なら、書く画面の上に「だれにたのみますか」を出す（最初は1人目。確かめる画面の「届く人」は選んだ人）。
 * masked＝名前を伏せた相手。書く画面も確かめる画面も、業種・役職の札だけを出す（記録には targetId を持つが、つながるまで名前を出さない）。
 * 錠は押した瞬間にかけ、送れたら記録の追加・トースト・窓を閉じるを同じ瞬間に行う。
 */
export function IntroRequestFlow({ vias, target, masked, onClose }: { vias: readonly Person[]; target: Person; masked: boolean; onClose: () => void }) {
  const { introRecords, addIntroRecord } = useSnState();
  const [viaId, setViaId] = useState(vias[0]?.id ?? "");
  const [step, setStep] = useState<"write" | "review">("write");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const via = vias.find((v) => v.id === viaId) ?? vias[0];
  if (!via) return null;

  const label = masked ? `${maskedLabel(target)}の方` : `${target.name}さん`;
  const close = () => {
    if (busy) return;
    onClose();
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
      const record = createIntroRequest({
        id: nextIntroId(introRecords), requesterId: ME_ID, introducerId: via.id, targetId: target.id,
        note, maskedForRequester: masked, at: todayIso(),
      });
      if (!record) {
        uiToast("送れませんでした。内容を確かめてもう一度お試しください", "error");
        lock.current = false;
        setBusy(false);
        setStep("write");
        return;
      }
      // 画面の変化（「おねがい中」の表示）とトーストを同じ瞬間に出す。錠は外さない（この窓は閉じる）
      addIntroRecord(record);
      setBusy(false);
      onClose();
      uiToast(`${shortName(via)}さんにおねがいしました`);
    }, MOCK_SEND_MS);
  };

  if (step === "review") {
    return (
      <Modal title="この内容で送りますか？" onClose={() => !busy && setStep("write")} busy={busy}>
        {!masked && <MeetPicture people={[null, via, target]} />}
        <dl className="sn-review">
          <dt>届く人</dt>
          <dd>{via.name}さん</dd>
          <dt>紹介してほしい人</dt>
          <dd>{masked ? `${label}（名前は伏せています）` : `${target.name}さん（${companyOf(target)?.name ?? ""}）`}</dd>
          <dt>用件</dt>
          <dd>{note.trim()}</dd>
        </dl>
        <div className="sn-modal-acts">
          <button type="button" className="sn-btn" disabled={busy} onClick={() => setStep("write")}>もどって なおす</button>
          <button type="button" className="sn-btn sn-btn--main" disabled={busy} onClick={send}>{busy ? "送っています…" : "送る"}</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal
      title={masked ? `${shortName(via)}さんに、つながりのある${label}の紹介をおねがいする` : `${shortName(via)}さんに、${shortName(target)}さんの紹介をおねがいする`}
      onClose={close}
    >
      {vias.length >= 2 && (
        <fieldset className="sn-field sn-via-pick">
          <legend>だれにたのみますか</legend>
          {vias.map((v) => (
            <label key={v.id} className="sn-check sn-via-opt">
              <input type="radio" name="sn-intro-via" checked={v.id === via.id} onChange={() => setViaId(v.id)} />
              <Avatar person={v} size="sm" />
              <span>{v.name}<small>{shortName(v)}さんの知り合い</small></span>
            </label>
          ))}
        </fieldset>
      )}
      <p className="sn-meta sn-modal-lead">
        {shortName(via)}さんが承認して{masked ? "つながりのある方" : `${shortName(target)}さん`}に確かめ、よければつながります。断られることもあります。
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
  );
}

/** 直接メッセージ（直接連絡OKの相手だけ）：書く → この内容で送りますか？ → 送る。空は閉じずに赤字で理由 */
function DirectMessageFlow({ person, onClose }: { person: Person; onClose: () => void }) {
  const { sendMessage } = useSnState();
  return (
    <ComposeFlow
      title={`${shortName(person)}さんに直接メッセージを送る`}
      lead={`${shortName(person)}さんは、知り合いからの直接の連絡を受けつけています。`}
      placeholder="例：はじめまして。太陽光の保守の件で、お話をうかがいたいです"
      required
      emptyMessage="メッセージを書いてください"
      reviewRows={(note) => [
        { label: "届く人", value: `${person.name}さん` },
        { label: "メッセージ", value: note },
      ]}
      onClose={onClose}
      onSent={(note) => {
        // 画面の変化（送った一覧に並ぶ）とトーストを同じ瞬間に出す
        const ok = sendMessage(person.id, note);
        onClose();
        if (ok) uiToast(`${shortName(person)}さんにメッセージを送りました`);
        else uiToast("送れませんでした。直接連絡できない相手です", "error");
      }}
    />
  );
}

/**
 * 紹介をおねがいするボタン。つながりに応じて出し分ける：
 * 直接の知り合い＝連絡先／紹介の道（直接連絡OKの人がいる）＝「直接メッセージを送る」と「紹介をたのむ」／紹介の道のみ＝「紹介をたのむ」だけ／それ以外は出さない。
 * 同じ相手に返事待ちの依頼があるあいだは「おねがい中」のまま押せない（二重に頼まない）。
 */
export function IntroRequestButton({ person, relation }: { person: Person; relation: Relation }) {
  const { introRecords } = useSnState();
  const [flow, setFlow] = useState<"closed" | "intro" | "message">("closed");

  if (relation.kind !== "direct" && relation.kind !== "via") return null;
  if (relation.kind === "direct") {
    return <ContactButton person={person} relation={relation} />;
  }

  const pending = introRecords.find((r) => r.requesterId === ME_ID && r.targetId === person.id && hasOpenRequest([r], ME_ID, person.id));
  const askLabel = relation.vias.length === 1 ? `${shortName(relation.via)}さんに紹介をたのむ` : "紹介をたのむ";
  const askButton = pending ? (
    <button type="button" className="sn-btn sn-btn--wide" disabled>
      おねがい中（{introStatusText(pending)}）
    </button>
  ) : (
    <button type="button" className={relation.canDirect ? "sn-btn sn-btn--wide" : "sn-btn sn-btn--main sn-btn--wide"} onClick={() => setFlow("intro")}>
      <Send aria-hidden />{askLabel}
    </button>
  );

  return (
    <>
      {relation.canDirect ? (
        <div className="sn-sticky-pair">
          {askButton}
          <button type="button" className="sn-btn sn-btn--main sn-btn--wide" onClick={() => setFlow("message")}>
            <MessageSquare aria-hidden />直接メッセージを送る
          </button>
        </div>
      ) : askButton}
      {flow === "intro" && <IntroRequestFlow vias={relation.vias} target={person} masked={false} onClose={() => setFlow("closed")} />}
      {flow === "message" && <DirectMessageFlow person={person} onClose={() => setFlow("closed")} />}
    </>
  );
}

/** 直接の知り合いには、連絡先を出す（設計書7：当事者同士で連絡できる） */
function ContactButton({ person, relation }: { person: Person; relation: Relation }) {
  const [open, setOpen] = useState(false);
  const rows = personContactRows(person, relation);
  if (rows.length === 0) return <p className="sn-meta">連絡先は公開されていません</p>;
  if (open) return <ContactList person={person} rows={rows} />;
  return (
    <button type="button" className="sn-btn sn-btn--main sn-btn--wide" onClick={() => setOpen(true)}>
      連絡先を見る
    </button>
  );
}

export function ContactList({ person, rows }: { person: Pick<Person, "name">; rows: readonly { label: string; value: string }[] }) {
  return (
    <dl className="sn-review" aria-label={`${person.name}さんの連絡先`}>
      {rows.map((r) => (
        <Fragment key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </Fragment>
      ))}
    </dl>
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
