import Link from "next/link";
import { snsFontClass } from "@/components/guild/look/sns/typography";
import { guildPath, outsideStorePath } from "@/lib/guild/store-path";
import type { StoreConfig, StoreLanding as Landing } from "@/lib/guild/stores";
import { PHRASE_WRAP, Ph } from "./phrase";

// 案内ページ（未ログインで /guild/<店> を開いたとき）。文言は lib/guild/stores.ts の landing に1か所だけ置く。
// 見た目は2026-11-27 五島さん決定の「D案」：濃い色の帯のヒーロー＋紹介のつながりの図＋手順。
// 比較画像は contexts/projects/gia/sakaba_kensetsu_landing_look/（company 側）。
export function StoreLanding({ config }: { config: StoreConfig }) {
  const landing = config.landing;
  if (!landing) return null;
  const loginHref = outsideStorePath("login", `?next=${encodeURIComponent(guildPath(config.slug))}`);

  return (
    <main className={`guild-landing ${snsFontClass} ${PHRASE_WRAP}`}>
      <div className="guild-landing-band">
        <header className="guild-landing-header">
          <div className="guild-landing-inner">
            <span className="guild-landing-name">{config.name}</span>
            <Link href={loginHref} className="guild-landing-login">会員ログイン</Link>
          </div>
        </header>

        <section className="guild-landing-hero guild-landing-inner" aria-labelledby="guild-landing-title">
          <p className="guild-landing-eyebrow">{landing.eyebrow}</p>
          <h1 id="guild-landing-title"><Headline landing={landing} /></h1>
          <p className="guild-landing-lead"><Ph keep text={landing.lead} /></p>
          <Link href={loginHref} className="guild-landing-cta">会員の方はログイン</Link>
          <p className="guild-landing-invite"><Ph keep text={landing.inviteNote} /></p>
        </section>
      </div>

      <section className="guild-landing-path guild-landing-inner" aria-labelledby="guild-landing-path-title">
        <h2 id="guild-landing-path-title" className="guild-landing-h2">{landing.path.title}</h2>
        <PathFigure path={landing.path} />
        <p className="guild-landing-path-caption"><Ph keep text={landing.path.caption} /></p>
      </section>

      <section className="guild-landing-steps" aria-labelledby="guild-landing-steps-title">
        <div className="guild-landing-inner">
          <h2 id="guild-landing-steps-title" className="guild-landing-h2">{landing.pointsTitle}</h2>
          <ol>
            {landing.points.map((point, index) => (
              <li key={point.title}>
                <span className="guild-landing-step-no" aria-hidden="true">{index + 1}</span>
                <div>
                  <h3><Ph keep text={point.title} /></h3>
                  <p><Ph keep text={point.body} /></p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="guild-landing-end guild-landing-inner">
        <Link href={loginHref} className="guild-landing-cta-sub">会員の方はログイン</Link>
      </div>
    </main>
  );
}

// 見出しは | ごとに1行。headlineEmphasis の部分だけ強調する
function Headline({ landing }: { landing: Landing }) {
  const mark = landing.headlineEmphasis;
  return (
    <>
      {landing.headline.split("|").map((line, index) => {
        const at = mark ? line.indexOf(mark) : -1;
        if (at < 0) return <span key={index}>{line}</span>;
        return (
          <span key={index}>
            {line.slice(0, at)}
            <em>{mark}</em>
            {line.slice(at + mark.length)}
          </span>
        );
      })}
    </>
  );
}

// あなた → 知り合い → 紹介先。色は CSS の変数（guild-theme.css の .guild-landing-figure）で塗る
function PathFigure({ path }: { path: Landing["path"] }) {
  const label = `${path.you}、${path.middle}（${path.middleRole}）、${path.end}（${path.endRole}）の順につながる図`;
  return (
    <svg className="guild-landing-figure" viewBox="0 0 350 132" role="img" aria-label={label}>
      <path className="fig-line" d="M44 52 C 110 10, 130 10, 175 52 S 250 94, 306 52" />
      <circle className="fig-you" cx="44" cy="52" r="27" />
      <text className="fig-you-text" x="44" y="57">{path.you}</text>
      <circle className="fig-middle" cx="175" cy="52" r="27" />
      <text className="fig-middle-text" x="175" y="57">{path.middle}</text>
      <circle className="fig-end" cx="306" cy="52" r="27" />
      <text className="fig-end-text" x="306" y="50">{path.end}</text>
      <text className="fig-end-sub" x="306" y="64">{path.endExample}</text>
      <text className="fig-note" x="175" y="104">{path.approved}</text>
      <text className="fig-note" x="306" y="104">{path.approved}</text>
      <text className="fig-role" x="175" y="124">{path.middleRole}</text>
      <text className="fig-role" x="306" y="124">{path.endRole}</text>
    </svg>
  );
}
