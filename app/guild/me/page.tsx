import type { Metadata } from "next";
import Link from "next/link";
import { JobAvatar } from "@/components/guild/job-avatar";
import { MoreLink, PageTitle, QuestCard, Window } from "@/components/guild/cards";
import { MyStatusSettings } from "@/components/guild/my-status-settings";
import { closedStatuses, introStatusLabel } from "@/lib/guild/labels";
import { ME_ID, applicantCount, getApplication, getProfile, guild, introRequests, parties, quests } from "@/lib/guild/mock-data";

export const metadata: Metadata = { title: "マイページ" };

export default function MyPage() {
  const me = getProfile(ME_ID)!;

  // 完成度は「書いた項目の数」だけで数える（人のレベルではない）
  const fields = [me.bio, me.can_help_with, me.strengths, me.values_text, me.vision, me.looking_for, me.want_to_meet];
  const filled = fields.filter((f) => f.trim() !== "").length + (me.photo_url ? 1 : 0);
  const total = fields.length + 1;

  const myQuests = quests.filter((q) => q.creator_id === ME_ID);
  const joinedQuests = quests.filter((q) => getApplication(q.id, ME_ID) !== undefined);
  const myParties = parties.filter((p) => p.member_ids.includes(ME_ID));
  const myActiveRequests = introRequests.filter((r) => r.requester_id === ME_ID && !closedStatuses.includes(r.status));

  return (
    <div className="space-y-11">
      <PageTitle title="マイページ" />

      <Window title={guild.terms.status}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <JobAvatar icon={me.job_icon} photoUrl={me.photo_url} name={me.job} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-2xl tracking-[0.12em]">{me.display_name}</p>
            <p className="mt-1 text-[15px]">{me.headline}</p>
            <div className="mt-4">
              <div className="c-muted flex items-center justify-between text-xs">
                <span>{guild.terms.status}の かんせいど</span>
                <span className="tabular-nums">
                  {filled}/{total}
                </span>
              </div>
              <div className="c-gauge mt-1" aria-hidden>
                {Array.from({ length: total }).map((_, i) => (
                  <span key={i} data-on={i < filled} />
                ))}
              </div>
              <p className="c-muted mt-2 text-xs">「つよみ」「これから」「しゃしん」を足すと、声がかかりやすくなります。</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:w-48">
            <Link href="/guild/me/status" className="rpg-button h-11 text-sm">
              ▶ {guild.terms.status}を なおす
            </Link>
            <Link href={`/guild/members/${me.id}`} className="c-button-sub h-11 text-sm">
              みんなからの 見え方
            </Link>
            <Link href="/guild/me/status?new=1" className="c-muted text-center text-[11px] underline underline-offset-4">
              はじめての人の画面を見る（見本）
            </Link>
          </div>
        </div>
      </Window>

      <div className="grid gap-11 md:grid-cols-2">
        <Window title="プロジェクト" action={<MoreLink href="/guild/projects" />}>
          <p className="text-sm leading-relaxed">すすめている ものも、おわった ものも ここから見られます。</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/guild/projects" className="c-button-sub h-11 px-4 text-sm">
              一覧を見る
            </Link>
            <Link href="/guild/projects/new" className="rpg-button h-11 px-4 text-sm">
              ▶ つくる
            </Link>
          </div>
        </Window>

        <Window title="しょうかい いらい" action={<MoreLink href="/guild/requests" />}>
          {myActiveRequests.length === 0 ? (
            <p className="c-muted text-sm">すすんでいる いらいは ありません。</p>
          ) : (
            <ul className="space-y-1">
              {myActiveRequests.map((r) => (
                <li key={r.id}>
                  <Link href="/guild/requests" className="rpg-cursor-row flex items-center justify-between gap-3 py-1.5 text-[15px]">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="rpg-cursor">▶</span>
                      <span className="truncate">{getProfile(r.target_id)?.display_name}さん</span>
                    </span>
                    <span className="c-muted shrink-0 text-xs">{introStatusLabel[r.status].requester}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Window>
      </div>

      <Window title="こうかい はんい">
        <MyStatusSettings me={me} />
      </Window>

      <Window title={`出した ${guild.terms.quest}`}>
        {myQuests.length === 0 ? (
          <p className="c-muted text-sm">
            まだ ありません。
            <Link href="/guild/quests/new" className="ml-1 underline underline-offset-4">
              {guild.terms.quest}を出す
            </Link>
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {myQuests.map((q) => (
              <div key={q.id} className="space-y-2">
                <QuestCard quest={q} compact />
                <Link
                  href={`/guild/quests/${q.id}/applicants`}
                  className="c-muted block text-xs underline underline-offset-4"
                >
                  ▶ 参加したい人を見る（{applicantCount(q.id)}人）
                </Link>
              </div>
            ))}
          </div>
        )}
      </Window>

      <Window title={`参加したい ${guild.terms.quest}`}>
        {joinedQuests.length === 0 ? (
          <p className="c-muted text-sm">まだ ありません。</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {joinedQuests.map((q) => (
              <QuestCard key={q.id} quest={q} compact />
            ))}
          </div>
        )}
      </Window>

      <Window title={guild.terms.party}>
        {myParties.length === 0 ? (
          <p className="c-muted text-sm leading-relaxed">
            {guild.terms.quest}を クリアすると、いっしょに動いた人たちが {guild.terms.party}として のこります。
          </p>
        ) : (
          <ul className="space-y-2">
            {myParties.map((p) => (
              <li key={p.id} className="text-[15px]">
                ▶ {p.name}
              </li>
            ))}
          </ul>
        )}
      </Window>
    </div>
  );
}
