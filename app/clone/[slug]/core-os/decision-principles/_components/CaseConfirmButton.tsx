"use client";

// AI が Slack/LINE から抽出した未確認事例を「確認する」ボタン。
// クリックで confirmDecisionCase を呼び、confirmed=true に昇格させる。
// 行クリックの onClick と競合しないよう stopPropagation 必須。

import { useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { confirmDecisionCase } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  caseId: string;
}

export function CaseConfirmButton({ slug, tenantId, caseId }: Props) {
  const [pending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await confirmDecisionCase(slug, tenantId, caseId);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#3d6651]/40 bg-[#e9efe9] text-[#3d6651] text-[11px] font-bold hover:bg-[#dde6dd] disabled:opacity-50 disabled:cursor-wait transition-colors"
    >
      {pending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <CheckCircle2 className="w-3 h-3" />
      )}
      確認する
    </button>
  );
}
