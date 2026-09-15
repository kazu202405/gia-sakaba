import { notFound } from "next/navigation";
import { ApplicantChooseButton } from "@/components/guild/applicant-choose-button";
import { BackLink, MemberRow, PageTitle, Window, questCategoryMark } from "@/components/guild/cards";
import { formatDate, introStatusLabel, questCategoryLabel } from "@/lib/guild/labels";
import {
  ME_ID,
  canSeeApplicants,
  findQuestIntro,
  getProfile,
  getQuest,
  guild,
  listApplications,
} from "@/lib/guild/mock-data";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "参加したい人" };

export default async function QuestApplicantsPage({ params }: Props) {
  const { id } = await params;
  const q = getQuest(id);
  if (!q) notFound();

  const back = <BackLink href={`/guild/quests/${q.id}`} label={`${guild.terms.quest}に もどる`} />;

  // 本番では RLS／RPC で返さない。見本では画面で止める
  if (!canSeeApplicants(q, ME_ID)) {
    return (
      <div className="space-y-11">
        {back}
        <Window title="参加したい人">
          <p className="text-sm leading-relaxed">
            参加したい人の一覧は、{guild.terms.quest}を出した人と {guild.terms.master}だけが見られます。
          </p>
        </Window>
      </div>
    );
  }

  const apps = listApplications(q.id);
  const isOpen = q.status === "open";

  return (
    <div className="space-y-11">
      {back}

      <PageTitle
        title="参加したい人"
        lead={`「この人にお願いしたい」を押すと、${guild.terms.master}に届きます。相手が承諾したら、おたがいの連絡先が見えるようになります。`}
      />

      <Window title={`${questCategoryMark[q.category]} ${questCategoryLabel[q.category]}`}>
        <p className="text-lg leading-snug tracking-wider break-words">{q.title}</p>
        <p className="c-muted mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          <span>参加したい {apps.length}人</span>
          {q.member_limit && <span>にんずう {q.member_limit}人まで</span>}
          {q.deadline && <span>しめきり {formatDate(q.deadline)}</span>}
        </p>
      </Window>

      {apps.length === 0 ? (
        <Window title="参加したい人">
          <p className="c-muted text-sm leading-relaxed">
            まだ いません。{guild.terms.member}めいかんで 声をかけたい人を見つけたら、紹介を依頼することもできます。
          </p>
        </Window>
      ) : (
        <ul className="space-y-5">
          {apps.map((a) => {
            const p = getProfile(a.user_id);
            if (!p) return null;
            const intro = findQuestIntro(q, a.user_id);
            return (
              <li key={a.user_id} className="c-card p-4 sm:p-5">
                <MemberRow profile={p} />
                {a.message ? (
                  <p className="mt-4 text-sm leading-relaxed whitespace-pre-line break-words">「{a.message}」</p>
                ) : (
                  <p className="c-muted mt-4 text-xs">ひとことは ありません。</p>
                )}
                <div className="c-dashed-top mt-4 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="c-muted text-xs">{formatDate(a.created_at)}に 手をあげました</p>
                  {isOpen || intro ? (
                    <ApplicantChooseButton
                      applicantName={p.display_name}
                      existingLabel={intro ? introStatusLabel[intro.status].requester : null}
                    />
                  ) : (
                    <p className="c-muted text-xs">ぼしゅうを おえています</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="c-muted text-xs leading-relaxed">
        ほかの参加希望者には、だれが手をあげたかは見えません（人数だけ）。
      </p>
    </div>
  );
}
