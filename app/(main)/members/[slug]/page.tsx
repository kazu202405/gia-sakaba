// 社長インタビュー公開ページ（ログイン不要）。
//
// デザイン方針（2026-07-08 リデザイン）:
//   雑誌のインタビュー記事のような"人の物語"。/campus と同じ基準：
//   暗（ヒーロー）→明（本文＝読み物）→暗（CTA）の明暗リズム、Navy×Gold×明朝、
//   金リングで光る肖像。ストーリーは番号付きの見出しで editorial に流す。
//
// 目的:
//   会員社長ごとの「1URL で配れる公開の顔」。紹介（主）・採用支援（従）に使う。
//   詳細設計: contexts/projects/gia/network_app.md「社長インタビュー公開ページ」節。
//
// データ元:
//   public_member_profiles ビュー（migration 0075）。anon 読み取り可・
//   profile_published = true の会員のみ・公開列だけ。実名は name_public=true のみ返る。
//
// slug の解決: applicants.id（uuid）。URL は /members/<uuid>。
// 公開ガード: view が published 以外を返さない → 未公開/不正は notFound()。
// プライバシー: email/stripe_*/admin_notes/tier/人柄 は view に含めず出ない。

import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MessageCircle, Globe, Instagram } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

interface PublicProfile {
  id: string;
  name: string | null;
  name_public: boolean;
  nickname: string | null;
  photo_url: string | null;
  role_title: string | null;
  job_title: string | null;
  headline: string | null;
  services_summary: string | null;
  genre: string | null;
  location: string | null;
  story_origin: string | null;
  story_turning_point: string | null;
  story_now: string | null;
  story_future: string | null;
  want_to_connect_with: string | null;
  status_message: string | null;
  contact_line: string | null;
  contact_instagram: string | null;
  contact_website: string | null;
  member_no: number | null;
}

const INK = "#0c1c2c";
const NAVY = "#1c3550";
const GOLD = "#c9974a";
const EMBER = "#e7bd77";
const PAPER = "#faf8f3";
const LINE = "#e5ded1";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchPublicProfile(
  slug: string,
): Promise<PublicProfile | null> {
  if (!UUID_RE.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_member_profiles")
    .select(
      "id, name, name_public, nickname, photo_url, role_title, job_title, " +
        "headline, services_summary, genre, location, " +
        "story_origin, story_turning_point, story_now, story_future, " +
        "want_to_connect_with, status_message, " +
        "contact_line, contact_instagram, contact_website, member_no",
    )
    .eq("id", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as PublicProfile;
}

function displayNameOf(p: PublicProfile): string {
  return p.name?.trim() || p.nickname?.trim() || "GIAメンバー";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchPublicProfile(slug);
  if (!p) {
    return { title: { absolute: "ページが見つかりません | GIA" } };
  }
  const name = displayNameOf(p);
  const desc =
    p.headline?.trim() ||
    p.services_summary?.trim() ||
    `${name}さんのインタビュー`;
  return {
    title: { absolute: `${name} | GIA` },
    description: desc.slice(0, 120),
    openGraph: {
      title: `${name} | GIA`,
      description: desc.slice(0, 120),
      images: p.photo_url ? [p.photo_url] : undefined,
    },
  };
}

// ─── 連絡先 → CTA 用 URL の解決 ─────────────────────────────
function asUrl(v: string | null): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : null;
}

function instagramUrl(v: string | null): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.replace(/^@/, "");
  if (!/^[a-zA-Z0-9._]+$/.test(handle)) return null;
  return `https://instagram.com/${handle}`;
}

interface ContactAction {
  key: string;
  label: string;
  href: string;
  icon: typeof MessageCircle;
  brand?: "line";
}

function resolveContacts(p: PublicProfile): {
  actions: ContactAction[];
  lineIdNote: string | null;
} {
  const lineHref = asUrl(p.contact_line);
  const siteHref = asUrl(p.contact_website);
  const igHref = instagramUrl(p.contact_instagram);

  const actions: ContactAction[] = [];
  if (lineHref) {
    actions.push({
      key: "line",
      label: "LINEで話を聞く",
      href: lineHref,
      icon: MessageCircle,
      brand: "line",
    });
  }
  if (siteHref) {
    actions.push({
      key: "site",
      label: "ウェブサイトを見る",
      href: siteHref,
      icon: Globe,
    });
  }
  if (igHref) {
    actions.push({
      key: "instagram",
      label: "Instagram",
      href: igHref,
      icon: Instagram,
    });
  }
  const lineIdNote =
    !lineHref && p.contact_line?.trim() ? p.contact_line.trim() : null;
  return { actions, lineIdNote };
}

export default async function MemberInterviewPage({ params }: Props) {
  const { slug } = await params;
  const p = await fetchPublicProfile(slug);
  if (!p) notFound();

  const name = displayNameOf(p);
  const subInfo = [p.role_title, p.job_title]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" / ");

  const metaTags = [p.genre, p.location]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);

  const storyBlocks = [
    { label: "始めたきっかけ", text: p.story_origin },
    { label: "転機", text: p.story_turning_point },
    { label: "今の想い", text: p.story_now },
    { label: "これから", text: p.story_future },
  ].filter((b): b is { label: string; text: string } => !!b.text?.trim());

  const { actions, lineIdNote } = resolveContacts(p);
  const primary = actions[0];
  const secondary = actions.slice(1);
  const hasCta = actions.length > 0 || !!lineIdNote;

  return (
    <div className="bg-white">
      {/* ═══ ヒーロー（暗・肖像＋引用） ═══ */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: INK }}
      >
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            top: "-10%",
            width: "900px",
            height: "900px",
            background:
              "radial-gradient(circle, rgba(201,151,74,0.16) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-2xl px-5 pt-28 pb-20 text-center sm:pt-32">
          <p
            className="mb-9 font-[family-name:var(--font-en)] text-[11px] uppercase tracking-[0.4em]"
            style={{ color: EMBER }}
          >
            GIA Interview
          </p>

          {/* 肖像（金リングで光る） */}
          <div
            className="mx-auto flex items-center justify-center overflow-hidden rounded-full"
            style={{
              width: "clamp(128px, 34vw, 176px)",
              height: "clamp(128px, 34vw, 176px)",
              background: "linear-gradient(160deg, #26445f, #16304a)",
              boxShadow: `0 0 0 1px ${EMBER}59, 0 0 44px -6px ${GOLD}80`,
            }}
          >
            {p.photo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={p.photo_url}
                alt={`${name} のプロフィール写真`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: "48px",
                  color: EMBER,
                }}
              >
                {name.slice(0, 1)}
              </span>
            )}
          </div>

          <h1
            className="mt-7"
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontWeight: 500,
              fontSize: "clamp(28px, 5vw, 40px)",
              lineHeight: 1.3,
              letterSpacing: "0.02em",
            }}
          >
            {name}
          </h1>

          {p.status_message?.trim() && (
            <p
              className="mt-3 text-[14px] italic"
              style={{
                fontFamily: "var(--font-mincho)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {p.status_message}
            </p>
          )}
          {subInfo && (
            <p
              className="mt-2 text-[13.5px]"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {subInfo}
            </p>
          )}
          {metaTags.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {metaTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{
                    background: "rgba(231,189,119,0.1)",
                    color: EMBER,
                    border: `1px solid ${EMBER}3d`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* ヘッドライン＝引用（このページの一撃） */}
          {p.headline?.trim() && (
            <blockquote className="mx-auto mt-11 max-w-xl">
              <span
                className="mb-2 block font-[family-name:var(--font-en)] text-[40px] leading-none"
                style={{ color: `${GOLD}66` }}
                aria-hidden
              >
                &ldquo;
              </span>
              <p
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontWeight: 500,
                  fontSize: "clamp(19px, 3.2vw, 26px)",
                  lineHeight: 1.85,
                  color: "#fff",
                }}
              >
                {p.headline}
              </p>
            </blockquote>
          )}
        </div>
      </section>

      {/* ═══ 本文（明・読み物） ═══ */}
      <section style={{ background: PAPER }}>
        <div className="mx-auto max-w-2xl px-5 py-24 sm:px-8 sm:py-28">
          {/* ── インタビュー（ストーリー） ── */}
          {storyBlocks.length > 0 && (
            <div>
              <p
                className="mb-12 font-[family-name:var(--font-en)] italic"
                style={{ color: GOLD, fontSize: "21px" }}
              >
                Interview
              </p>
              {storyBlocks.map((b, i) => (
                <article
                  key={b.label}
                  className={i > 0 ? "mt-12 border-t pt-12" : ""}
                  style={i > 0 ? { borderColor: LINE } : undefined}
                >
                  <div className="mb-4 flex items-baseline gap-4">
                    <span
                      className="font-[family-name:var(--font-en)] leading-none"
                      style={{ fontSize: "30px", color: `${GOLD}80` }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2
                      style={{
                        fontFamily: "'Noto Serif JP', serif",
                        fontWeight: 600,
                        fontSize: "20px",
                        color: NAVY,
                      }}
                    >
                      {b.label}
                    </h2>
                  </div>
                  <p
                    className="whitespace-pre-wrap text-[15.5px]"
                    style={{
                      fontFamily: "var(--font-mincho)",
                      lineHeight: 2.15,
                      color: "#3f4b57",
                    }}
                  >
                    {b.text}
                  </p>
                </article>
              ))}
            </div>
          )}

          {/* ── 事業・サービス ── */}
          {p.services_summary?.trim() && (
            <div
              className={storyBlocks.length > 0 ? "mt-16 border-t pt-16" : ""}
              style={
                storyBlocks.length > 0 ? { borderColor: LINE } : undefined
              }
            >
              <h2
                className="mb-5"
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontWeight: 600,
                  fontSize: "18px",
                  color: NAVY,
                  borderLeft: `2px solid ${GOLD}`,
                  paddingLeft: "0.9rem",
                }}
              >
                事業・サービス
              </h2>
              <p
                className="whitespace-pre-wrap text-[15px]"
                style={{ lineHeight: 2.1, color: "#4a5763" }}
              >
                {p.services_summary}
              </p>
            </div>
          )}

          {/* ── つながりたい人（紹介・採用の核・強調パネル） ── */}
          {p.want_to_connect_with?.trim() && (
            <div
              className="mt-16 rounded-[6px] p-8 sm:p-10"
              style={{
                background: "#fff",
                border: `1px solid ${GOLD}59`,
                boxShadow: "0 18px 50px -30px rgba(28,53,80,0.4)",
              }}
            >
              <p
                className="mb-2 font-[family-name:var(--font-en)] text-[10px] uppercase tracking-[0.3em]"
                style={{ color: GOLD }}
              >
                Connect
              </p>
              <h2
                className="mb-5"
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontWeight: 600,
                  fontSize: "clamp(18px, 2.6vw, 22px)",
                  color: NAVY,
                }}
              >
                こんな人と、組みたい・紹介してほしい。
              </h2>
              <p
                className="whitespace-pre-wrap text-[15.5px]"
                style={{
                  fontFamily: "var(--font-mincho)",
                  lineHeight: 2.15,
                  color: "#3f4b57",
                }}
              >
                {p.want_to_connect_with}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ CTA（暗・本人へ直接） ═══ */}
      {hasCta && (
        <section style={{ background: INK }} className="text-white">
          <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:py-24">
            <p
              className="mb-3 font-[family-name:var(--font-en)] italic"
              style={{ color: EMBER, fontSize: "20px" }}
            >
              Get in touch
            </p>
            <h2
              className="mb-3"
              style={{
                fontFamily: "'Noto Serif JP', serif",
                fontWeight: 500,
                fontSize: "clamp(22px, 3vw, 28px)",
              }}
            >
              {name}さんと、話してみませんか。
            </h2>
            <p
              className="mx-auto mb-9 max-w-md text-[14px]"
              style={{ lineHeight: 2, color: "rgba(255,255,255,0.6)" }}
            >
              直接ご連絡いただけます。
            </p>

            {primary && (
              <a
                href={primary.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-[2px] px-9 py-4 text-[15px] font-medium transition-transform hover:-translate-y-0.5"
                style={
                  primary.brand === "line"
                    ? { background: "#06C755", color: "#fff" }
                    : { background: GOLD, color: "#1a1a1a" }
                }
              >
                <primary.icon className="h-4 w-4" />
                {primary.label}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}

            {secondary.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                {secondary.map((a) => (
                  <a
                    key={a.key}
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/20 px-4 py-2 text-xs font-medium text-white/85 transition-colors hover:bg-white/10"
                  >
                    <a.icon className="h-3.5 w-3.5" />
                    {a.label}
                  </a>
                ))}
              </div>
            )}

            {lineIdNote && (
              <p className="mt-5 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                LINE ID:{" "}
                <span className="font-semibold text-white">{lineIdNote}</span>
              </p>
            )}
          </div>
        </section>
      )}

      {/* ═══ HIROGARUキャンパスへの静かな導線 ═══ */}
      <section style={{ background: PAPER }}>
        <div className="mx-auto max-w-2xl px-5 py-12 text-center">
          <Link
            href="/campus"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-[var(--gia-deck-navy)]"
          >
            <span className="font-[family-name:var(--font-en)] uppercase tracking-[0.2em]">
              HIROGARU Campus を見る
            </span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
