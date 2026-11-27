import Link from "next/link";
import { Bell, Building2, ChevronRight, Network, Settings2, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { FeedbackButton } from "@/components/guild/feedback-button";
import { LiveMyInvite } from "@/components/guild/live-my-invite";
import { ShareUrlWindow } from "@/components/guild/share-url-window";
import type { ShareSettings } from "@/lib/guild/shared-profile";
import { LivePushSettings } from "@/components/guild/live-push-settings";
import type { ConstructionCompany, ConstructionConnection, ConstructionPost } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { areaText } from "@/lib/guild/look/sns-mock";
import { getGuildContext, getMyGuildProfile, getMyMemberInvite, getMyProfileDraft } from "@/lib/guild/server-data";
import { ConstructionPostRows } from "./post-rows";
import { ConstructionThemeSettings } from "./frame";

export async function ConstructionMyPage() {
  const { db, store, userId } = await constructionContext();
  const [me, context, invite, companies, posts, connections, draft, shareResult] = await Promise.all([
    getMyGuildProfile(), getGuildContext(), getMyMemberInvite(),
    constructionRows<ConstructionCompany>("sakaba_construction_list_companies"),
    constructionRows<ConstructionPost>("sakaba_construction_list_posts"),
    constructionRows<ConstructionConnection>("sakaba_construction_list_my_connections"),
    getMyProfileDraft(), db.rpc("sakaba_get_my_share", { p_guild_slug: store.slug }),
  ]);
  const share = shareResult.error ? null : shareResult.data as ShareSettings | null;
  const company = companies.find((item) => item.members.some((member) => member.user_id === userId));
  const mine = posts.filter((post) => post.author_id === userId);
  const manager = context.membership?.role === "owner" || context.membership?.role === "master";
  const connected = connections.filter((item) => item.status === "connected").length;
  return <div className="sn-page sn-page--me">
    <div className="sn-page-main">
      <div className="sn-hero">
        <div className="sn-card">
          <div className="sn-card-top">{me.region || company?.prefecture}<span>{me.industry || company?.industries.join("・")}</span></div>
          <div className="sn-card-mid"><span className="sn-fc sn-fc--lg" data-kind="me" aria-hidden="true">私</span><div>
            <h1>{me.display_name}</h1>{me.name_kana && <p className="sn-meta">{me.name_kana}</p>}
          </div></div>
          <div className="sn-card-bottom">{[company?.name ?? me.company_name, me.job, me.headline].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="sn-me-actions">
          <Link className="sn-btn sn-btn--main" href={store.path("/me/status")}>プロフィールを編集</Link>
          <Link className="sn-btn" href={store.path("/members/" + userId)}>人からの見え方</Link>
        </div>
        <nav className="sn-me-stats" aria-label="マイページの中の場所">
          <Link href={store.path("/network")}><b>{connected}</b>知り合い</Link>
          <a href="#my-construction-posts"><b>{mine.length}</b>出した依頼</a>
        </nav>
      </div>
      <section className="sn-me-sec">
        <div className="sn-sec-h"><h2>会社情報</h2><Link href={store.path("/network/company")}>{company ? "編集する" : "登録する"}</Link></div>
        {company ? <dl className="sn-dl">
          <div><dt>会社名</dt><dd>{company.name}</dd></div><div><dt>対応エリア</dt><dd>{areaText(company.areas)}</dd></div>
        </dl> : <p className="sn-meta">会社情報はまだ登録されていません。</p>}
      </section>
      <section className="sn-me-sec" id="my-construction-posts">
        <div className="sn-sec-h"><h2>出した依頼</h2><span>{mine.length}件</span></div>
        {mine.length ? <div className="sn-me-list"><ConstructionPostRows posts={mine} viewer={userId} members={[me]} connections={connections} base={store.path()} /></div>
          : <div className="sn-me-none"><p>まだ依頼はありません。</p><Link href={store.path("/posts/new")} className="sn-btn sn-btn--small">最初の依頼を出す</Link></div>}
      </section>
      <div className="sn-sec"><LiveMyInvite initial={invite} /></div>
      <details className="sn-sec" id="share">
        <summary className="cursor-pointer font-bold">プロフィールの共有URL</summary>
        {share ? <ShareUrlWindow initial={share} /> : <p className="sn-meta">共有URLを読み込めませんでした。</p>}
      </details>
      <section className="sn-me-sec">
        <div className="sn-sec-h"><h2>設定</h2></div>
        <ConstructionThemeSettings />
        <div className="sn-me-links">
          <Link href={store.path("/me/status")}><Settings2 aria-hidden /><span><b>プロフィールと公開範囲</b></span><ChevronRight aria-hidden /></Link>
          <Link href={store.path("/network/company")}><Building2 aria-hidden /><span><b>会社情報</b></span><ChevronRight aria-hidden /></Link>
          <Link href={store.path("/network")}><Network aria-hidden /><span><b>人脈の公開範囲</b></span><ChevronRight aria-hidden /></Link>
          <Link href={store.path("/me#push")}><Bell aria-hidden /><span><b>ホーム画面と通知</b></span><ChevronRight aria-hidden /></Link>
          {draft.ok && draft.draft && <Link href={store.path("/me/status/draft")}><Settings2 aria-hidden /><span><b>プロフィールの下書き</b></span><ChevronRight aria-hidden /></Link>}
          {manager && <Link href={store.path("/master")}><ShieldCheck aria-hidden /><span><b>管理者の画面へ</b></span><ChevronRight aria-hidden /></Link>}
        </div>
      </section>
      <section className="sn-me-sec" id="push"><LivePushSettings /></section>
      <div className="sn-sec flex flex-wrap gap-2">
        <Link className="sn-btn sn-btn--small" href={store.path("/plan")}>会員プラン</Link>
        <FeedbackButton label="ご意見" className="sn-btn sn-btn--small" />
        <LogoutButton redirectTo={store.path()} className="sn-btn sn-btn--small" showIcon={false} />
      </div>
    </div>
  </div>;
}
