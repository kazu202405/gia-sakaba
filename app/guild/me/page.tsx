import type { Metadata } from "next";
import Link from "next/link";
import { JobAvatar } from "@/components/guild/job-avatar";
import { GuildBillingPortalButton } from "@/components/guild/guild-billing-portal-button";
import { LiveMyInvite } from "@/components/guild/live-my-invite";
import { InvitePathChain } from "@/components/guild/invite-path";
import { InvitePathSetting } from "@/components/guild/invite-path-setting";
import type { InvitePath } from "@/lib/guild/invite-path";
import { createClient } from "@/lib/supabase/server";
import { LiveMemberIntroductions } from "@/components/guild/live-member-introductions";
import { LivePushSettings } from "@/components/guild/live-push-settings";
import { PersonalProfileWindow } from "@/components/guild/personal-profile-window";
import { PageTitle, Window } from "@/components/guild/cards";
import { FeedbackButton } from "@/components/guild/feedback-button";
import { canSendMealWish, resolveSakabaAccessPlan, resolveSakabaPlan } from "@/lib/guild/billing-plans";
import { getConfiguredSakabaPrices } from "@/lib/stripe/client";
import { getAuthenticatedUserId, getGuildContext, getMyGuildBilling, getMyGuildProfile, getMyMemberInvite, listGuildMemberIntroductions, listGuildProjects, listGuildQuests } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "マイページ" };

export default async function MyPage() {
  const [context, me, quests, projects, invite, currentUserId, billing] = await Promise.all([
    getGuildContext(), getMyGuildProfile(), listGuildQuests(), listGuildProjects(), getMyMemberInvite(), getAuthenticatedUserId(), getMyGuildBilling(),
  ]);
  const introductions = await listGuildMemberIntroductions(me.id);
  // 自分の入会のつながり（根っこ → … → あなた）と、名前を出さない設定
  const invitePathResult = await (await createClient()).rpc("sakaba_get_invite_path", { p_target_id: me.id });
  const invitePath = invitePathResult.error ? null : invitePathResult.data as InvitePath;
  const fields = [me.bio, me.values_text, me.looking_for];
  const filled = fields.filter((value) => value.trim()).length + (me.photo_url ? 1 : 0);
  const myQuests = quests.filter((quest) => quest.creator_id === me.id && quest.status !== "withdrawn");
  const joinedQuests = quests.filter((quest) => quest.my_application?.status === "applied");
  const myProjects = projects.filter((project) => project.owner_id === me.id);
  const currentPlan = resolveSakabaPlan(billing, getConfiguredSakabaPrices());
  const accessPlan = resolveSakabaAccessPlan(billing, getConfiguredSakabaPrices());

  return <div className="space-y-9">
    <PageTitle title="マイページ" lead="自分のステータスと、酒場で進めていることを確認できます。" />
    <Window title={context.guild.terms.status}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <JobAvatar icon={me.job_icon} photoUrl={me.photo_url} name={me.job || me.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl tracking-[0.12em]">{me.display_name}</h1>
          {me.name_kana && <p className="c-muted mt-1 text-xs">{me.name_kana}</p>}
          <p className="mt-1 break-words text-[15px]">{me.headline || "ひとことはまだありません"}</p>
          <p className="c-muted mt-2 text-xs">{me.company_name} · {me.job || "職業未設定"} · {me.region || "地域未設定"}</p>
          <div className="mt-4">
            <div className="c-muted flex justify-between text-xs"><span>ステータスの かんせいど</span><span>{filled}/4</span></div>
            <div className="c-gauge mt-1" aria-label={`4項目中${filled}項目が入力済み`}>
              {Array.from({ length: 4 }, (_, index) => <span key={index} data-on={index < filled} />)}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:w-44">
          <Link href="/guild/me/status" className="rpg-button h-11 text-sm">▶ ステータスをなおす</Link>
          <Link href={`/guild/members/${me.id}`} className="c-button-sub h-11 text-sm">みんなからの見え方</Link>
        </div>
      </div>
    </Window>

    <PersonalProfileWindow profile={me} />

    <LiveMyInvite initial={invite} />

    <Window title="入会のつながり">
      {invitePath && invitePath.status === "ok" && invitePath.nodes.length > 0 ? <>
        <p className="c-muted mb-3 text-xs leading-relaxed">あなたが、だれの招待で酒場に入ったかのつながりです。ほかの会員のページでは、あなたとその人のつながりが見えます。</p>
        <InvitePathChain path={invitePath} />
      </> : invitePath ? <p className="c-muted text-sm">入会のつながりは見つかりませんでした。</p>
        : <p role="alert" className="text-sm text-[#c62828]">入会のつながりを読み込めませんでした。</p>}
      {invitePath && <InvitePathSetting initial={Boolean(invitePath.my_hide)} />}
    </Window>

    <div className="grid gap-6 md:grid-cols-2">
      <Window title={`出した ${context.guild.terms.quest}`}>
        {myQuests.length === 0 ? <p className="c-muted text-sm">まだありません。<Link href="/guild/quests/new" className="underline">クエストを出す</Link></p> :
          <ul className="space-y-2">{myQuests.map((quest) => <li key={quest.id}><Link href={`/guild/quests/${quest.id}`} className="rpg-cursor-row block break-words text-sm">▶ {quest.title}</Link></li>)}</ul>}
      </Window>
      <Window title="参加したいクエスト">
        {joinedQuests.length === 0 ? <p className="c-muted text-sm">まだありません。</p> :
          <ul className="space-y-2">{joinedQuests.map((quest) => <li key={quest.id}><Link href={`/guild/quests/${quest.id}`} className="rpg-cursor-row block break-words text-sm">▶ {quest.title}</Link></li>)}</ul>}
      </Window>
    </div>
    <Window title="自分のプロジェクト">
      {myProjects.length === 0 ? <p className="c-muted text-sm">まだありません。<Link href="/guild/projects/new" className="underline">プロジェクトをつくる</Link></p> :
        <ul className="space-y-2">{myProjects.map((project) => <li key={project.id}><Link href={`/guild/projects/${project.id}`} className="rpg-cursor-row block break-words text-sm">▶ {project.title} <span className="c-muted text-xs">{project.status === "done" ? "完了" : "進行中"}</span></Link></li>)}</ul>}
    </Window>
    <LiveMemberIntroductions targetId={me.id} targetName={me.display_name} currentUserId={currentUserId} initial={introductions} />
    {process.env.SAKABA_880_ENABLED === "true" && canSendMealWish(accessPlan) && <Window title="会食の希望">
      <p className="text-sm leading-relaxed">会って話したい人やテーマ{process.env.SAKABA_AVAILABILITY_ENABLED === "true" ? "、空いている日時" : ""}を、管理者に伝えられます。</p>
      <Link href="/guild/me/wish" className="c-button-sub mt-4 inline-flex min-h-11 items-center px-5 text-sm">希望{process.env.SAKABA_AVAILABILITY_ENABLED === "true" ? "・空き日時" : ""}を見る</Link>
    </Window>}
    <LivePushSettings />
    <Window title="ご意見・不具合">
      <p className="text-sm leading-relaxed">おかしな動きや「こうだったら使いやすい」を、管理者に送れます。画面上の「ご意見」からも、いつでも送れます。</p>
      <FeedbackButton label="▶ 送る" className="c-button-sub mt-4 inline-flex min-h-11 items-center px-5 text-sm" />
    </Window>
    <Window title="会員・お支払い">
      <p className="text-sm leading-relaxed">
        {billing.role !== "member" || billing.billing_status === "exempt" ? "現在は管理者枠です。料金なしで全機能を利用できます。" : billing.company_note_benefit ? "Company Noteの11,000円会員特典で、ビジネスプラン（月880円）の機能を利用中です。酒場への追加申込は不要です。" : billing.billing_status === "past_due" ? "お支払いを確認できていません。" : currentPlan === "standard" ? "現在はプラスプラン（月480円）です。" : currentPlan === "dining" ? "現在はビジネスプラン（月880円）です。" : billing.is_paid ? "現在、有料会員です。" : "現在はフリープランです。"}
      </p>
      {(billing.company_note_benefit || billing.role !== "member") && ["active", "trialing", "past_due"].includes(billing.billing_status) && <p className="mt-3 text-sm leading-relaxed">酒場の別契約は自動解約されず、請求も続きます。不要な場合は支払い管理から解約してください。</p>}
      <div className="mt-4">
        {billing.stripe_customer_id ? <GuildBillingPortalButton label={["active", "trialing"].includes(billing.billing_status) ? "支払い方法・解約を管理する" : billing.billing_status === "past_due" ? "お支払いを確認する" : "支払い履歴を見る"} /> :
          <Link href="/guild/plan" className="c-button-sub h-11 px-5 text-sm">会員プランを見る</Link>}
      </div>
      <Link href="/guild/plan" className="c-muted mt-3 inline-block text-sm underline underline-offset-4">プランをくらべる</Link>
      {billing.stripe_customer_id && <p className="c-muted mt-3 text-xs">解約はStripeの管理画面で手続きします。このボタンを押すだけでは解約されません。</p>}
    </Window>
  </div>;
}
