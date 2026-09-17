"use client";

// 有料会員の申し込み（見本）。「あなたの つよみ」が無いと 申し込めない。
// つよみは ステータスの「つよみ」と 同じ欄（別の列に持つと 食い違う）。見本では 申し込むと「有料会員で見る」に切り替わる。

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ENTRY_PLAN_PRICE_LABEL, FREE_ACTIVE_PROJECT_LIMIT, STRENGTH_MAX, strengthError } from "@/lib/guild/membership";
import { setMembership } from "@/lib/guild/membership-store";
import { ME_ID, getProfile, guild } from "@/lib/guild/mock-data";
import { uiToast } from "@/lib/ui-dialog";
import { BackLink, PageTitle, Window } from "./cards";
import { Field, TextArea } from "./form-parts";
import { useMembership } from "./membership-parts";

export function PlanForm() {
  const router = useRouter();
  const { isPaid } = useMembership();
  const me = getProfile(ME_ID)!;
  const [strength, setStrength] = useState(me.strengths);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-9">
      <BackLink href="/guild/me" label="マイページ" />
      <PageTitle
        title="有料会員"
        lead={`${ENTRY_PLAN_PRICE_LABEL}。交流（名鑑・クエスト・しょうかい）は 無料のままです。`}
      />

      <Window title="できること">
        <ul className="space-y-2 text-[15px] leading-relaxed">
          <li>▶ プロジェクトを いくつでも すすめられる（無料は {FREE_ACTIVE_PROJECT_LIMIT}つまで）</li>
          <li>▶ {guild.terms.master}が ひらく 限定の集まりに 申し込める（経営者の方向け）</li>
        </ul>
      </Window>

      {isPaid ? (
        <Window>
          <p className="text-[15px]">いまは 有料会員です（見本）。</p>
        </Window>
      ) : (
        <Window title="申し込み">
          <form
            noValidate
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              const next = strengthError(strength);
              setError(next);
              if (next) return;
              setMembership({ isPaid: true });
              uiToast("有料会員に なりました（見本のため 決済は ありません）");
              router.push("/guild/me");
            }}
          >
            <Field
              label="あなたの つよみ"
              required
              hint="あなたならではの、ほかと 差別化するための つよみ。これが ないと 有料会員に なれません。ステータスの「つよみ」にも 出ます"
              error={error ?? ""}
            >
              <TextArea
                value={strength}
                onChange={(v) => {
                  setStrength(v);
                  if (error) setError(null);
                }}
                rows={4}
                max={STRENGTH_MAX}
                label="あなたの つよみ"
                placeholder="例：職人の採用ページを 撮影から 1社で まとめて作れる。地方の工務店で 30社の実績"
              />
            </Field>
            <p className="c-muted text-xs tabular-nums">{strength.trim().length}字（20字以上）</p>
            <button type="submit" className="rpg-button h-12 w-full text-base sm:w-auto sm:px-8">
              ▶ 有料会員に 申し込む
            </button>
          </form>
        </Window>
      )}
    </div>
  );
}
