// 招待URLのページ：申し込んだゲストに、同じ会に参加する会員のプロフィールを見せる。
// 載るのは「ゲストにも見せる」を選んだ参加会員と主催者だけ。会に来ない会員は名前も出さず、人数だけ。
// DBは supabase/migrations/0104_sakaba_gathering_guest_profiles.sql（sakaba_get_guest_gathering_members）。

import type { GuestGatheringMembers } from "@/lib/guild/guest-gathering";
import type { JobIconKey } from "@/lib/guild/types";
import { formatDate } from "@/lib/guild/labels";
import { JobAvatar } from "./job-avatar";
import { Window } from "./cards";

export function GuestGatheringMembersWindow({ data, isMember }: { data: GuestGatheringMembers; isMember: boolean }) {
  if (!data.can_view) {
    return <Window title="参加する会員">
      <p className="text-sm leading-relaxed">この集まりに申し込むと、一緒に参加する会員のプロフィールが見られます。</p>
      <p className="c-muted mt-1 text-xs">連絡先は表示されません。</p>
    </Window>;
  }

  return <Window title="参加する会員">
    <p className="c-muted text-xs leading-relaxed">この集まりに参加する会員のうち、ゲストへの表示に同意した人です。連絡先は表示しません。</p>
    {data.members.length === 0 ? (
      <p className="mt-4 text-sm">表示できる会員は、まだいません。</p>
    ) : (
      <ul className="mt-4 space-y-4">
        {data.members.map((member) => {
          const meta = [member.job, member.industry, member.region].filter(Boolean).join("・");
          const sections = [
            { label: "仕事内容・できること", value: member.bio },
            { label: "おもい", value: member.values_text },
            { label: "さがしているもの・であいたい人", value: member.looking_for },
          ].filter((section) => section.value.trim());
          return <li key={member.id} className="c-card p-4">
            <div className="flex items-center gap-3">
              <JobAvatar icon={member.job_icon as JobIconKey} photoUrl={member.photo_url} name={member.job || member.display_name} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-base tracking-wider">{member.display_name}</span>
                  {member.is_host && <span className="c-chip">主催</span>}
                </p>
                {meta && <p className="c-muted text-xs">{meta}</p>}
              </div>
            </div>
            {member.headline && <p className="mt-3 text-sm break-words">{member.headline}</p>}
            {(sections.length > 0 || member.introductions.length > 0) && (
              <details className="c-dashed-top mt-3 pt-3">
                <summary className="c-label cursor-pointer text-sm">プロフィールをくわしく見る</summary>
                <div className="mt-3 space-y-4">
                  {sections.map((section) => <div key={section.label}>
                    <p className="c-label text-xs">{section.label}</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed break-words">{section.value}</p>
                  </div>)}
                  {member.introductions.length > 0 && <div>
                    <p className="c-label text-xs">紹介状（{member.introductions.length}通）</p>
                    <ul className="mt-2 space-y-2">
                      {member.introductions.map((letter, index) => <li key={index} className="border-l-2 border-[#c8a55a] pl-3 text-sm">
                        <p className="whitespace-pre-line leading-relaxed break-words">{letter.body}</p>
                        <p className="c-muted mt-1 text-xs">{letter.author_name}・{formatDate(letter.updated_at)}</p>
                      </li>)}
                    </ul>
                  </div>}
                </div>
              </details>
            )}
          </li>;
        })}
      </ul>
    )}
    {!isMember && data.other_member_count !== null && data.other_member_count > 0 && (
      <div className="c-dashed-top mt-6 pt-5 text-sm leading-relaxed">
        <p>ギルドには、ほかに <span className="tabular-nums text-base">{data.other_member_count}</span>人の会員がいます。会員になると、全員のプロフィールが見られます。</p>
        <a href="#join-guild" className="rpg-button mt-3 inline-flex min-h-11 px-4 text-sm">▶ 会員登録を希望する</a>
      </div>
    )}
  </Window>;
}
