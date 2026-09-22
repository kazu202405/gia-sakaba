"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuildQuestApplicant } from "@/lib/guild/server-data";
import type { Profile } from "@/lib/guild/types";
import { formatDate, introStatusLabel } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";

export function LiveQuestApplicants({ questId, questTerm, applicants, members, canChoose }: {
  questId: string;
  questTerm: string;
  applicants: GuildQuestApplicant[];
  members: Profile[];
  canChoose: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [error, setError] = useState("");
  const byId = new Map(members.map((member) => [member.id, member]));

  async function choose(applicantId: string, name: string) {
    if (pendingId) return;
    const confirmed = await uiConfirm({
      title: `${name}さんを選びます`,
      message: `ギルドマスターに、この${questTerm}に応募した${name}さんとの紹介を依頼します。相手が承諾するまで連絡先は表示されません。`,
      okLabel: "紹介を依頼する",
    });
    if (!confirmed) return;
    setPendingId(applicantId);
    setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_request_quest_applicant_intro", {
        p_quest_id: questId,
        p_applicant_id: applicantId,
      });
      if (rpcError) throw rpcError;
      setSent((current) => [...current, applicantId]);
      uiToast("ギルドマスターに紹介を依頼しました");
      router.refresh();
    } catch {
      setError("紹介を依頼できませんでした。相手の受付状況を確認し、再度お試しください。");
    } finally {
      setPendingId(null);
    }
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="text-sm text-[#c62828]">{error}</p>}
    {applicants.length === 0 ? <p className="c-card border-dashed px-4 py-10 text-center text-sm">まだ参加希望者はいません。</p> :
      applicants.map((applicant) => {
        const member = byId.get(applicant.user_id);
        const name = member?.display_name ?? "メンバー";
        const hasRequest = applicant.intro_request_id !== null || sent.includes(applicant.user_id);
        return <article key={applicant.user_id} className="c-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {member ? <Link href={`/guild/members/${member.id}`} className="text-base underline underline-offset-2">{name}</Link> : <span className="text-base">{name}</span>}
              {member?.company_name && <p className="c-muted mt-1 text-xs">{member.company_name}</p>}
            </div>
            <span className="c-muted text-xs">{formatDate(applicant.created_at)}に参加希望</span>
          </div>
          {applicant.message && <p className="mt-4 whitespace-pre-line break-words border-2 border-dashed border-[#1b2a41]/25 px-3 py-2 text-sm">{applicant.message}</p>}
          <div className="mt-4">
            {hasRequest ? <Link href="/guild/requests" className="c-button-sub inline-flex h-11 items-center px-4 text-sm">{applicant.intro_status ? introStatusLabel[applicant.intro_status].requester : "紹介依頼済み"}・状況を見る ▶</Link>
              : canChoose && member?.accept_intro ? <button type="button" onClick={() => void choose(applicant.user_id, name)} disabled={pendingId !== null} className="rpg-button h-11 px-4 text-sm disabled:opacity-50">{pendingId === applicant.user_id ? "依頼中…" : "▶ この人にお願いしたい"}</button>
                : canChoose && member && !member.accept_intro ? <p className="c-muted text-xs">この人は現在、紹介を受け付けていません。</p> : null}
          </div>
        </article>;
      })}
    <p className="c-muted text-xs">参加希望者の一覧は、投稿者とギルドマスターだけが見られます。</p>
  </div>;
}
