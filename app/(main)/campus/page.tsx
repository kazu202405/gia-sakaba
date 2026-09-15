// HIROGARUキャンパス 創設メンバー募集ページ（ログイン不要・公開）。
//
// デザイン方針（2026-07-08 リデザイン）:
//   署名＝「広がる（HIROGARU）」を絵にする。暗（ネイビー）と明（アイボリー）を
//   交互に置いて格式の明暗リズムを作る。ヒーローは金色の熱源＋広がる同心円で
//   「一人の熱→仲間の熱→広がる」を視覚化（コレクティブ・エフィカシー）。
//   創設メンバーは金のリングで縁取った光る肖像＋「創設 No.001」（＝最初の顔の序列）。
//   思想背骨: contexts/projects/gia/coaching_principles.md。誘い方: campus_warm_list.md。
//
// 目的:
//   「メンバー図鑑」ではなく "創設メンバー募集"。0〜数人でも成立し、空を
//   「最初の顔になれるチャンス」として見せる。五島さんが声かけ時に送れる 1URL（/campus）。
//
// データ元:
//   public_member_profiles ビュー（migration 0075）。anon 読み取り可・
//   profile_published = true のみ・公開列だけ。実名は name_public=true のときだけ返る。
//
// 堅牢性:
//   0075 未適用でビューが無くてもページを落とさず [] にフォールバック（募集表示）。
//
// CTA: 「話を聞いてみる」→ GIA 公式 LINE。価格（¥11,000）は前面に出さない。

import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const INK = "#0c1c2c";
const NAVY = "#1c3550";
const GOLD = "#c9974a";
const EMBER = "#e7bd77";
const IVORY = "#f6f3ec";
const PAPER = "#faf8f3";
const LINE = "#e5ded1";

// サイト共通の「話を聞いてみる」導線（header 無料相談・/contact・/start と同一）。
const LINE_URL = "https://page.line.me/131liqrt";

export const metadata: Metadata = {
  title: { absolute: "HIROGARUキャンパス 創設メンバー募集 | GIA" },
  description:
    "ひとりの熱は、いつか消える。仲間の熱は、広がっていく。経営者どうしが「自分ならやれる」を高め合う場所。HIROGARUキャンパスは、いま創設メンバーを募集しています。",
  openGraph: {
    title: "HIROGARUキャンパス 創設メンバー募集 | GIA",
    description:
      "ひとりの熱は、いつか消える。仲間の熱は、広がっていく。いま創設メンバーを募集しています。",
  },
};

interface MemberCard {
  id: string;
  name: string | null;
  name_public: boolean;
  nickname: string | null;
  photo_url: string | null;
  headline: string | null;
  role_title: string | null;
  job_title: string | null;
  genre: string | null;
  location: string | null;
  member_no: number | null;
}

// 表向きの呼称：name_public=true なら実名（view が実値を返す）。それ以外は nickname。
function displayNameOf(m: MemberCard): string {
  return m.name?.trim() || m.nickname?.trim() || "GIAメンバー";
}

// 公開メンバーを取得。ビュー未適用・失敗でも [] にフォールバック。
async function fetchPublishedMembers(): Promise<MemberCard[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_member_profiles")
      .select(
        "id, name, name_public, nickname, photo_url, headline, " +
          "role_title, job_title, genre, location, member_no",
      )
      .order("member_no", { ascending: true, nullsFirst: false });
    if (error || !data) return [];
    return data as unknown as MemberCard[];
  } catch {
    return [];
  }
}

export default async function CampusPage() {
  const members = await fetchPublishedMembers();

  return (
    <div className="bg-white">
      {/* ═══ HERO（暗・熱源が広がる） ═══ */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: INK }}
      >
        {/* 熱源 */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            top: "2%",
            width: "1100px",
            height: "1100px",
            background:
              "radial-gradient(circle, rgba(224,169,79,0.28) 0%, rgba(201,151,74,0.11) 30%, transparent 62%)",
          }}
        />
        {/* 広がる同心円（署名） */}
        <div
          className="pointer-events-none absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          {[240, 470, 730, 1010].map((d, i) => (
            <span
              key={d}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `${d}px`,
                height: `${d}px`,
                border: `1px solid rgba(201,151,74,${0.2 - i * 0.045})`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-2xl px-5 pt-32 pb-28 text-center sm:pt-36 sm:pb-32">
          <p
            className="mb-9 font-[family-name:var(--font-en)] text-[12px] uppercase tracking-[0.42em]"
            style={{ color: EMBER }}
          >
            HIROGARU Campus
          </p>
          <h1
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontWeight: 500,
              fontSize: "clamp(30px, 6vw, 56px)",
              lineHeight: 1.45,
              letterSpacing: "0.02em",
            }}
          >
            ひとりの熱は、いつか消える。
            <br />
            <span style={{ color: EMBER }}>仲間の熱は、広がっていく。</span>
          </h1>
          <p
            className="mx-auto mt-9 max-w-xl text-[15px] sm:text-[16px]"
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontWeight: 300,
              lineHeight: 2.2,
              color: "rgba(255,255,255,0.74)",
            }}
          >
            経営者どうしが「自分ならやれる」を高め合う場所。
            <br className="hidden sm:block" />
            つながり、賢くなり、熱を絶やさない。HIROGARUキャンパス。
          </p>
          <p
            className="mt-14 font-[family-name:var(--font-en)] text-[11px] uppercase tracking-[0.3em]"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            — この場を、一緒に —
          </p>
        </div>
      </section>

      {/* ═══ WHY（明・アイボリー） ═══ */}
      <section style={{ background: IVORY }}>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:py-28">
          <p
            className="font-[family-name:var(--font-en)] text-[14px] tracking-[0.3em]"
            style={{ color: GOLD }}
          >
            01
          </p>
          <div className="mx-auto my-7 h-px w-9" style={{ background: GOLD }} />
          <h2
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontWeight: 500,
              fontSize: "clamp(23px, 3.6vw, 34px)",
              lineHeight: 1.62,
              color: NAVY,
            }}
          >
            熱は、<span style={{ color: GOLD }}>一人では続かない。</span>
            <br />
            だから、広がる場所をつくる。
          </h2>
          <p
            className="mx-auto mt-8 max-w-xl text-[15px] sm:text-[16px]"
            style={{ lineHeight: 2.25, color: "#4a5763" }}
          >
            一人でやっていると、熱はいつか下がる。でも、熱の高い経営者と同じ場所にいると、その熱は伝染して続く。HIROGARUキャンパスは、互いの「自分ならやれる」という確信——エフィカシー——を高め合う場です。
          </p>
        </div>
      </section>

      {/* ═══ VALUE（明・二本を罫線で対に） ═══ */}
      <section style={{ background: PAPER }}>
        <div className="mx-auto max-w-4xl px-5 py-24 sm:py-28">
          <div className="mb-14 text-center">
            <p
              className="font-[family-name:var(--font-en)] italic tracking-[0.04em]"
              style={{ color: GOLD, fontSize: "20px" }}
            >
              What grows here
            </p>
            <h2
              className="mt-1.5"
              style={{
                fontFamily: "'Noto Serif JP', serif",
                fontWeight: 500,
                fontSize: "clamp(22px, 3vw, 30px)",
                color: NAVY,
              }}
            >
              この場が育てる、二つのこと
            </h2>
          </div>
          <div
            className="grid grid-cols-1 overflow-hidden rounded-[4px] sm:grid-cols-2"
            style={{ border: `1px solid ${LINE}` }}
          >
            <ValueCell
              no="01"
              title="つながり"
              lead="人脈と紹介が、前に進む。"
              body="信頼でつながり、必要なら紹介し合う。ビジネスも人も、いい出会いから動き出す。一人の輪では届かない場所へ、仲間の輪で届く。"
            />
            <ValueCell
              no="02"
              title="賢くなる"
              lead="仲間と学べば、経営を見る目が育つ。"
              body="勉強会で、経営やお金の話を持ち寄る。一人で学ぶより、仲間と話すほうが深く残る。互いの視点が、それぞれの「見る目」を育てていく。"
              divider
            />
          </div>
        </div>
      </section>

      {/* ═══ 創設メンバー（暗・光る肖像） ═══ */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: INK }}
      >
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: "-40%",
            width: "1200px",
            height: "900px",
            background:
              "radial-gradient(circle, rgba(201,151,74,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-5xl px-5 py-24 sm:py-28">
          <div className="mb-14 text-center">
            <p
              className="font-[family-name:var(--font-en)] italic"
              style={{ color: EMBER, fontSize: "20px" }}
            >
              The founders
            </p>
            <h2
              className="mt-2"
              style={{
                fontFamily: "'Noto Serif JP', serif",
                fontWeight: 500,
                fontSize: "clamp(22px, 3vw, 32px)",
              }}
            >
              この場を作る、経営者たち
            </h2>
            <p
              className="mt-3.5 text-[14px]"
              style={{
                fontFamily: "'Noto Serif JP', serif",
                fontWeight: 300,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              創設メンバー ── 最初の熱をつくる人たち
            </p>
          </div>

          {members.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-7">
              {members.map((m, i) => (
                <FounderCard key={m.id} member={m} index={i} />
              ))}
              <OpenSlot index={members.length} />
            </div>
          ) : (
            <EmptyFounders />
          )}
        </div>
      </section>

      {/* ═══ 創設メンバー募集（帯・ネイビー） ═══ */}
      <section style={{ background: NAVY }}>
        <div className="mx-auto max-w-4xl px-5 py-20">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:gap-12 md:text-left">
            <div>
              <p
                className="mb-2.5 font-[family-name:var(--font-en)] italic"
                style={{ color: EMBER, fontSize: "18px" }}
              >
                Founding members
              </p>
              <h2
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontWeight: 500,
                  fontSize: "clamp(21px, 2.8vw, 28px)",
                  lineHeight: 1.5,
                  color: "#fff",
                }}
              >
                いま、最初の顔を募集しています。
              </h2>
            </div>
            <p
              className="max-w-md text-[14.5px]"
              style={{ lineHeight: 2, color: "rgba(255,255,255,0.62)" }}
            >
              お客さんとしてではなく、この場を一緒に作る仲間として。最初の熱は、最初にいる人たちがつくります。
              <span style={{ color: "#fff", fontWeight: 600 }}>
                最初の顔になりませんか。
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CTA（明） ═══ */}
      <section style={{ background: PAPER }}>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:py-28">
          <p
            className="font-[family-name:var(--font-en)] italic"
            style={{ color: GOLD, fontSize: "21px" }}
          >
            Let&rsquo;s talk
          </p>
          <h2
            className="mb-4 mt-2.5"
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontWeight: 500,
              fontSize: "clamp(24px, 3.4vw, 34px)",
              color: NAVY,
            }}
          >
            まずは、話を聞いてみませんか。
          </h2>
          <p
            className="mx-auto mb-10 max-w-md text-[15px]"
            style={{ lineHeight: 2, color: "#5a6672" }}
          >
            合いそうか、何ができそうか。売り込みではなく、一緒に作る仲間としての会話から。
          </p>
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-[2px] px-11 py-5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{
              background: NAVY,
              boxShadow: "0 14px 40px -16px rgba(28,53,80,0.6)",
            }}
          >
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: EMBER }}
            />
            話を聞いてみる
          </a>
        </div>
      </section>
    </div>
  );
}

// ─── 価値セル（罫線で対に） ───────────────────────────
function ValueCell({
  no,
  title,
  lead,
  body,
  divider,
}: {
  no: string;
  title: string;
  lead: string;
  body: string;
  divider?: boolean;
}) {
  return (
    <div
      className="bg-white px-8 py-12 sm:px-11"
      style={divider ? { borderLeft: `1px solid ${LINE}` } : undefined}
    >
      <div
        className="font-[family-name:var(--font-en)] leading-none"
        style={{ fontSize: "44px", color: LINE }}
      >
        {no}
      </div>
      <h3
        className="mb-1 mt-4"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontWeight: 600,
          fontSize: "24px",
          color: NAVY,
        }}
      >
        {title}
      </h3>
      <p className="mb-4 text-[15px] font-medium" style={{ color: GOLD }}>
        {lead}
      </p>
      <p className="text-[14.5px]" style={{ lineHeight: 2.1, color: "#5a6672" }}>
        {body}
      </p>
    </div>
  );
}

// ─── 創設メンバーカード（光る肖像・/members/[id] へ） ───────────
function FounderCard({ member, index }: { member: MemberCard; index: number }) {
  const name = displayNameOf(member);
  const sub =
    [member.role_title, member.job_title]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" / ") ||
    member.genre?.trim() ||
    "";
  const no = String(index + 1).padStart(3, "0");

  return (
    <Link
      href={`/members/${member.id}`}
      className="group block text-center"
    >
      <div
        className="relative mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-full"
        style={{
          background: "linear-gradient(160deg, #26445f, #16304a)",
          boxShadow: `0 0 0 1px ${EMBER}59, 0 0 34px -6px ${GOLD}73`,
        }}
      >
        {member.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={member.photo_url}
            alt={`${name} のプロフィール写真`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: "clamp(28px, 5vw, 40px)",
              color: EMBER,
            }}
          >
            {name.slice(0, 1)}
          </span>
        )}
      </div>
      <div
        className="mt-4 font-[family-name:var(--font-en)] tracking-[0.16em]"
        style={{ fontSize: "12px", color: GOLD }}
      >
        創設 No.{no}
      </div>
      <h4
        className="mt-1 truncate"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontWeight: 500,
          fontSize: "16px",
          color: "#fff",
        }}
      >
        {name}
      </h4>
      {sub && (
        <span
          className="mt-1 block truncate text-[12px]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {sub}
        </span>
      )}
    </Link>
  );
}

// ─── 空き枠（次の顔・募集中） ───────────────────────────
function OpenSlot({ index }: { index: number }) {
  const no = String(index + 1).padStart(3, "0");
  return (
    <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="block text-center">
      <div
        className="relative mx-auto flex aspect-square w-full items-center justify-center rounded-full"
        style={{ border: `1px dashed ${EMBER}66` }}
      >
        <span
          className="font-[family-name:var(--font-en)]"
          style={{ fontSize: "30px", color: `${EMBER}8c` }}
        >
          +
        </span>
      </div>
      <div
        className="mt-4 font-[family-name:var(--font-en)] tracking-[0.16em]"
        style={{ fontSize: "12px", color: GOLD }}
      >
        創設 No.{no}
      </div>
      <h4
        className="mt-1"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontWeight: 500,
          fontSize: "16px",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        次の顔になりませんか
      </h4>
      <span className="mt-1 block text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        募集中
      </span>
    </a>
  );
}

// ─── メンバー 0 人のときの募集表示（寂しい空にしない） ───────────
function EmptyFounders() {
  return (
    <div className="mx-auto max-w-md text-center">
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
        style={{ border: `1px dashed ${EMBER}66` }}
      >
        <span
          className="font-[family-name:var(--font-en)]"
          style={{ fontSize: "34px", color: `${EMBER}8c` }}
        >
          +
        </span>
      </div>
      <p
        className="mt-8"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          fontWeight: 500,
          fontSize: "clamp(18px, 2.6vw, 21px)",
          lineHeight: 1.6,
          color: "#fff",
        }}
      >
        まだ、最初のメンバーを迎えているところです。
      </p>
      <p
        className="mt-3 text-[14px]"
        style={{ lineHeight: 2, color: "rgba(255,255,255,0.6)" }}
      >
        あなたが、最初の一人になりませんか。
      </p>
    </div>
  );
}
