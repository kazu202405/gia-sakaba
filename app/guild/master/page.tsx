import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/guild/cards";
import { LiveGatheringApprovals } from "@/components/guild/live-gathering-approvals";
import { LivePendingMembers } from "@/components/guild/live-pending-members";
import { LiveMasterInvites } from "@/components/guild/live-master-invites";
import { LivePreparedInvites } from "@/components/guild/live-prepared-invites";
import { LiveMasterIntroductions } from "@/components/guild/live-master-introductions";
import { InviteNetwork } from "@/components/guild/invite-network";
import { MasterConsults } from "@/components/guild/master-consults";
import { MasterFeedback } from "@/components/guild/master-feedback";
import { parseFeedbackReports } from "@/lib/guild/feedback";
import { parseConsultRequests } from "@/lib/guild/enterprise";
import { listMealWishes } from "@/lib/guild/meal-wishes-server";
import { listMealAvailability } from "@/lib/guild/meal-availability-server";
import { formatScheduleShort, toJstInputValue } from "@/lib/guild/gathering-schedule";
import { createClient } from "@/lib/supabase/server";
import { getGuildContext, listGuildInviteNetwork, listGuildMasterInvites, listGuildMembers, listMasterIntroductions, listPendingGatheringApplications, listPendingMembers, listPreparedInvites } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "管理者" };

export default async function MasterPage() {
  const context = await getGuildContext();
  if (context.membership.role !== "owner" && context.membership.role !== "master") notFound();
  const preparedEnabled = process.env.SAKABA_PREJOIN_ENABLED === "true";
  const introductionsEnabled = process.env.SAKABA_MASTER_INTRO_ENABLED === "true";
  // 参加の申請（役職「その他」・0126）は、承認できるオーナーにだけ出す
  const isOwner = context.membership.role === "owner";
  const [pendingGatherings, invites, network, preparedInvites, introductions, introductionMembers, pendingMembers] = await Promise.all([
    listPendingGatheringApplications(), listGuildMasterInvites(), listGuildInviteNetwork(),
    preparedEnabled ? listPreparedInvites() : Promise.resolve([]),
    introductionsEnabled ? listMasterIntroductions() : Promise.resolve([]),
    introductionsEnabled ? listGuildMembers() : Promise.resolve([]),
    isOwner ? listPendingMembers() : Promise.resolve([]),
  ]);
  const diningEnabled = process.env.SAKABA_880_ENABLED === "true";
  const mealWishes = diningEnabled ? await listMealWishes(context.guild.id) : [];
  const availability = diningEnabled && process.env.SAKABA_AVAILABILITY_ENABLED === "true"
    ? await listMealAvailability(context.guild.id) : [];
  const memberNames = new Map(network.map((person) => [person.user_id, person.display_name]));
  const mealUserIds = [...new Set([...mealWishes.map((wish) => wish.user_id), ...availability.map((slot) => slot.user_id)])];
  const preparedIds = new Set(preparedInvites.map((invite) => invite.id));
  // 料金の段（0114）：支払い中なのに料金IDの表に無いもの。その人たちはビジネス扱いになっている
  const supabase = await createClient();
  const { data: unmappedData, error: unmappedError } = await supabase.rpc("sakaba_list_unmapped_billing_prices", { p_guild_slug: "gia" });
  const { data: consultData, error: consultError } = await supabase.rpc("sakaba_list_consult_requests", { p_guild_slug: "gia" });
  const consults = parseConsultRequests(consultData);
  const newConsults = consults.filter((item) => item.status === "new").length;
  const { data: feedbackData, error: feedbackError } = await supabase.rpc("sakaba_list_feedback_reports", { p_guild_slug: "gia" });
  const feedback = parseFeedbackReports(feedbackData);
  const newFeedback = feedback.filter((item) => item.status === "new").length;
  const unmapped = Array.isArray(unmappedData) ? unmappedData as { price_id: string; members: number }[] : [];
  return (
    <div className="space-y-9">
      <PageTitle
        title="管理者"
        lead="人の紹介、限定の集まり、メンバーの招待、酒場への参加のつながりを管理します。"
      />
      {(unmappedError || unmapped.length > 0) && <section className="c-window p-5 pt-10 sm:p-6 sm:pt-11">
        <span className="c-window-title">料金IDの登録</span>
        {unmappedError
          ? <p className="text-sm">料金の段の状態を読み込めませんでした。migration 0114 が適用済みか確認してください。</p>
          : <>
            <p className="text-sm leading-relaxed">支払い中なのに、どの段か登録されていない料金IDがあります。登録するまで、この人たちはビジネスプラン（880円）として扱っています。料金IDと段の対応（sakaba.billing_prices）に登録してください。</p>
            <ul className="mt-3 space-y-1 text-sm">{unmapped.map((row) => <li key={row.price_id} className="break-all"><code>{row.price_id}</code>：{row.members}人</li>)}</ul>
          </>}
      </section>}
      <nav aria-label="管理項目" className="c-window p-4 pt-7 sm:p-5 sm:pt-8">
        <span className="c-window-title">管理コマンド</span>
        <ul className="grid gap-x-8 text-sm sm:grid-cols-2">
          {isOwner && <li>
            <a href="#master-pending-members-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              参加の申請{pendingMembers.length > 0 && <span className="c-chip-strong ml-1 text-xs">承認待ち {pendingMembers.length}</span>}
            </a>
          </li>}
          {introductionsEnabled && <li>
            <a href="#master-introductions-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              人をつなぐ
            </a>
          </li>}
          <li>
            <a href="#master-consults-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              エンタープライズの相談{newConsults > 0 && <span className="c-chip-strong ml-1 text-xs">未対応 {newConsults}</span>}
            </a>
          </li>
          <li>
            <a href="#master-feedback-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              ご意見・不具合{newFeedback > 0 && <span className="c-chip-strong ml-1 text-xs">未対応 {newFeedback}</span>}
            </a>
          </li>
          <li>
            <a href="#master-gatherings-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              限定の集まり
            </a>
          </li>
          {diningEnabled && <li>
            <a href="#master-meal-wishes-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              会食の希望
            </a>
          </li>}
          <li>
            <a href="#master-invites-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              招待リンク
            </a>
          </li>
          {preparedEnabled && <li>
            <a href="#master-prepared-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              メンバーの仮登録
            </a>
          </li>}
          <li>
            <a href="#master-network-title" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              招待のつながり
            </a>
          </li>
          <li>
            <Link href="/guild/join?preview=1" className="rpg-cursor-row flex min-h-11 items-center gap-2 px-1 py-2 tracking-wider">
              <span className="rpg-cursor">▶</span>
              入会フォームを見る
            </Link>
          </li>
        </ul>
      </nav>
      {isOwner && <section aria-labelledby="master-pending-members-title" className="space-y-4">
        <h2 id="master-pending-members-title" className="text-xl tracking-wider">参加の申請</h2>
        <LivePendingMembers initial={pendingMembers} />
      </section>}
      {introductionsEnabled && <section aria-labelledby="master-introductions-title" className="space-y-4">
        <h2 id="master-introductions-title" className="text-xl tracking-wider">人をつなぐ</h2>
        <LiveMasterIntroductions initial={introductions} members={introductionMembers} />
      </section>}
      <section aria-labelledby="master-consults-title" className="space-y-4">
        <h2 id="master-consults-title" className="text-xl tracking-wider">エンタープライズの相談</h2>
        <p className="c-muted text-sm">会員プランの画面の「相談する」から届いた内容です。届くのは管理者だけです。</p>
        {consultError ? <p className="c-card p-5 text-sm">相談を読み込めませんでした。migration 0115 が適用済みか確認してください。</p> : <MasterConsults initial={consults} />}
      </section>
      <section aria-labelledby="master-feedback-title" className="space-y-4">
        <h2 id="master-feedback-title" className="text-xl tracking-wider">ご意見・不具合</h2>
        <p className="c-muted text-sm">会員が画面上の「ご意見」やマイページから送った内容です。送ったときに開いていた画面と端末も載せています（参考。その画面で起きたとは限りません）。</p>
        {feedbackError ? <p className="c-card p-5 text-sm">読み込めませんでした。migration 0117 が適用済みか確認してください。</p> : <MasterFeedback initial={feedback} />}
      </section>
      <section aria-labelledby="master-gatherings-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="master-gatherings-title" className="text-xl tracking-wider">限定の集まり</h2>
          <Link href="/guild/master/gathering/new" className="rpg-button inline-flex h-11 items-center px-5 text-sm">▶ 集まりを開く</Link>
        </div>
        <LiveGatheringApprovals initial={pendingGatherings} />
      </section>
      {diningEnabled && <section aria-labelledby="master-meal-wishes-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-meal-wishes-title" className="text-xl tracking-wider">会食の希望{process.env.SAKABA_AVAILABILITY_ENABLED === "true" ? "・空き日時" : ""}</h2>
        <p className="c-muted text-sm">ビジネスプラン相当の利用者から届いた内容です。ほかの会員には見えません。会食の開催・成立を約束するものではありません。</p>
        {mealUserIds.length === 0 ? <p className="c-card p-5 text-sm">まだ希望は届いていません。</p> : <div className="grid gap-4 md:grid-cols-2">
          {mealUserIds.map((userId) => {
            const wish = mealWishes.find((item) => item.user_id === userId);
            const slots = availability.filter((item) => item.user_id === userId);
            return <article key={userId} className="c-card min-w-0 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><Link href={`/guild/members/${userId}`} className="underline underline-offset-4">{memberNames.get(userId) ?? "メンバー"}</Link>{wish && <time className="c-muted text-xs" dateTime={wish.updated_at}>{new Date(wish.updated_at).toLocaleDateString("ja-JP")}</time>}</div>
              {wish ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{wish.wish_text}</p> : <p className="c-muted mt-3 text-xs">希望文は未登録です。</p>}
              {process.env.SAKABA_AVAILABILITY_ENABLED === "true" && <div className="c-dashed-top mt-4 pt-3">
                <p className="c-muted mb-2 text-xs">空き日時</p>
                {slots.length === 0 ? <p className="c-muted text-xs">未登録</p> : <ul className="space-y-2 text-xs">{slots.map((slot) => <li key={slot.id}><span className="tabular-nums">{formatScheduleShort(slot.starts_at)} ～ {toJstInputValue(slot.ends_at).slice(11)}</span>{slot.note && <span className="c-muted ml-2 break-words">{slot.note}</span>}</li>)}</ul>}
              </div>}
            </article>;
          })}
        </div>}
      </section>}
      <section aria-labelledby="master-invites-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-invites-title" className="text-xl tracking-wider">招待リンク</h2>
        <LiveMasterInvites initial={invites.filter((invite) => !preparedIds.has(invite.id))} excludedIds={[...preparedIds]} />
      </section>
      {preparedEnabled && <section aria-labelledby="master-prepared-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-prepared-title" className="text-xl tracking-wider">メンバーの仮登録</h2>
        <LivePreparedInvites initial={preparedInvites} />
      </section>}
      <section aria-labelledby="master-network-title" className="space-y-4 border-t-2 border-dashed border-[#1b2a41]/25 pt-8">
        <h2 id="master-network-title" className="text-xl tracking-wider">招待のつながり</h2>
        <InviteNetwork members={network} />
      </section>
    </div>
  );
}
