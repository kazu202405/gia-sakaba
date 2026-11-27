import Link from "next/link";
import { snsFontClass } from "@/components/guild/look/sns/typography";
import { guildPath, outsideStorePath } from "@/lib/guild/store-path";
import type { StoreConfig } from "@/lib/guild/stores";
import { PHRASE_WRAP, Ph } from "./phrase";

// 案内ページの文言は店舗設定の landing に置く。
export function StoreLanding({ config }: { config: StoreConfig }) {
  const landing = config.landing;
  if (!landing) return null;
  const loginHref = outsideStorePath("login", `?next=${encodeURIComponent(guildPath(config.slug))}`);

  return (
    <main className={`guild-landing ${snsFontClass} ${PHRASE_WRAP}`}>
      <header className="guild-landing-header">
        <div className="guild-landing-inner">
          <span className="guild-landing-name">{config.name}</span>
          <Link href={loginHref} className="guild-landing-login">会員ログイン</Link>
        </div>
      </header>

      <section className="guild-landing-hero guild-landing-inner" aria-labelledby="guild-landing-title">
        <h1 id="guild-landing-title"><Ph keep text={landing.headline} /></h1>
        <p><Ph keep text={landing.lead} /></p>
      </section>

      <div className="guild-landing-invite">
        <p className="guild-landing-inner"><Ph keep text={landing.inviteNote} /></p>
      </div>

      <ul className="guild-landing-points guild-landing-inner" aria-label="酒場でできること">
        {landing.points.map((point) => (
          <li key={point.title}>
            <h2><Ph keep text={point.title} /></h2>
            <p><Ph keep text={point.body} /></p>
          </li>
        ))}
      </ul>
    </main>
  );
}
