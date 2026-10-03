"use client";

// 入会の入力。名前・会社名・役職と、名鑑に会社名と役職を出すか。
// 代表・役員・決裁者は そのまま入会できる。役職「その他」は、役職とお仕事の内容を書いて「参加を申請する」（オーナーの承認制・0126）。

import { useRef, useState } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import { createClient } from "@/lib/supabase/client";
import type { Position } from "@/lib/guild/types";
import { positionLabel } from "@/lib/guild/labels";
import { APPROVAL_COPY, OTHER_TITLE_MAX, OTHER_WORK_MAX, requiresApproval } from "@/lib/guild/approval";
import type { PreparedInvite } from "@/lib/guild/prepared-invites";
import { GROUND_RULES, GUILD_PROMISES, PROMISE_NOTE } from "@/lib/guild/rules";
import {
  JOIN_COMPANY_MAX,
  JOIN_NAME_MAX,
  JOIN_SOLVE_MAX,
  validateJoin,
  type JoinDraft,
  type JoinErrors,
} from "@/lib/guild/join";
import { uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";
import { LegalLinks } from "./legal-consent";
import { LoginGuide } from "./login-guide";
import { CheckBox, Field, TextInput, scrollToFirstError } from "./form-parts";

const POSITIONS = Object.keys(positionLabel) as Position[];

export function JoinForm({ inviterName, inviteCode, preview = false, initialName = "", prepared = null }: { inviterName: string; inviteCode: string; preview?: boolean; initialName?: string; prepared?: PreparedInvite | null }) {
  const router = useGuildRouter();
  const [draft, setDraft] = useState<JoinDraft>({
    display_name: initialName.slice(0, JOIN_NAME_MAX),
    company_name: prepared?.company_name ?? "",
    position: prepared?.position ?? "",
    show_company: true,
    want_to_solve: "",
    agreed: false,
    other_title: "",
    other_work: "",
  });
  const [errors, setErrors] = useState<JoinErrors>({});
  const [saving, setSaving] = useState(false);
  // 2度押しの錠は押した瞬間にかける（state は反映が遅れるので ref）
  const lockRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [acceptIntroduction, setAcceptIntroduction] = useState(false);

  const set = <K extends keyof JoinDraft>(key: K, value: JoinDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // 直しはじめたら、その欄の赤字は消す
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <Window title="入会フォーム">
      {preview ? <p className="mb-6 border-2 border-dashed border-[#1b2a41] bg-[#fffdf6] p-3 text-sm">入会フォームのプレビューです。入力しても送信・保存はできません。</p> :
        <p className="c-muted mb-6 text-xs">{inviterName}さんからの 招待状を確認しました。</p>}
      {!preview && <div className="mb-6"><LoginGuide /></div>}
      {prepared && <p className="c-card mb-6 px-4 py-3 text-sm leading-relaxed">招待した人が、お名前などを下書きしました。内容を確認し、違うところは直してください。入会するまでは名鑑に表示されません。</p>}
      <form
        noValidate
        className="space-y-7"
        onSubmit={async (e) => {
          e.preventDefault();
          if (lockRef.current || preview) return;
          const next = validateJoin(draft);
          setErrors(next);
          if (Object.keys(next).length > 0) {
            scrollToFirstError();
            return;
          }
          lockRef.current = true;
          setSaving(true);
          setSaveError("");
          const needsApproval = requiresApproval(draft.position);
          try {
            const { data, error } = await createClient().rpc(prepared ? "sakaba_join_prepared_guild" : "sakaba_join_guild", {
              p_code: inviteCode,
              p_display_name: draft.display_name.trim(),
              p_company_name: draft.company_name.trim(),
              p_position: draft.position,
              p_show_company: draft.show_company,
              p_want_to_solve: draft.want_to_solve.trim(),
              p_agreed: draft.agreed,
              p_other_title: needsApproval ? draft.other_title.trim() : "",
              p_other_work: needsApproval ? draft.other_work.trim() : "",
              ...(prepared ? { p_accept_introduction: acceptIntroduction } : {}),
            });
            if (error) throw error;
            // 承認が要る人は、申請後の画面（app/guild/layout.tsx が出す）へ。入会の祝いは出さない
            if ((data as { pending?: boolean } | null)?.pending) {
              uiToast(APPROVAL_COPY.appliedToast);
              router.push("/guild");
              router.refresh();
              return;
            }
            uiToast((data as { already_member?: boolean } | null)?.already_member ? "すでに入会しています" : "GIAの酒場に入会しました");
            // 入会した直後は、ホームで「はじめまして」を出す（すでに入会済みの人には出さない）
            router.push((data as { already_member?: boolean } | null)?.already_member ? "/guild" : "/guild?welcome=1");
            router.refresh();
          } catch {
            setSaveError(needsApproval ? "申請できませんでした。招待リンクの期限や利用回数、入力内容を確認し、再度お試しください。" : "入会できませんでした。招待リンクの期限や利用回数を確認し、再度お試しください。");
            lockRef.current = false;
            setSaving(false);
          }
        }}
      >
        <Field label="お名前" required error={errors.display_name ?? ""}>
          <TextInput
            value={draft.display_name}
            onChange={(v) => set("display_name", v)}
            max={JOIN_NAME_MAX}
            label="お名前"
            placeholder="例：山田 太郎"
          />
        </Field>

        <Field label="会社名" required hint="個人事業の方は 屋号を 入れてください" error={errors.company_name ?? ""}>
          <TextInput
            value={draft.company_name}
            onChange={(v) => set("company_name", v)}
            max={JOIN_COMPANY_MAX}
            label="会社名"
            placeholder="例：株式会社やまだ"
          />
        </Field>

        <Field
          label="役職"
          required
          hint={APPROVAL_COPY.positionHint}
          error={errors.position ?? ""}
        >
          <div role="radiogroup" aria-label="役職" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={draft.position === p}
                onClick={() => set("position", p)}
                className={draft.position === p ? "rpg-button h-11 text-sm" : "c-button-sub h-11 text-sm"}
              >
                {positionLabel[p]}
              </button>
            ))}
          </div>
        </Field>

        {requiresApproval(draft.position) && <>
          <div className="c-card space-y-1 p-4 text-sm leading-relaxed" data-testid="other-position-notice">
            {APPROVAL_COPY.otherNotice.map((line) => <p key={line}>{line}</p>)}
          </div>
          <Field label={APPROVAL_COPY.titleLabel} required error={errors.other_title ?? ""}>
            <TextInput
              value={draft.other_title}
              onChange={(v) => set("other_title", v)}
              max={OTHER_TITLE_MAX}
              label={APPROVAL_COPY.titleLabel}
            />
          </Field>
          <Field label={APPROVAL_COPY.workLabel} required error={errors.other_work ?? ""}>
            <TextInput
              value={draft.other_work}
              onChange={(v) => set("other_work", v)}
              max={OTHER_WORK_MAX}
              label={APPROVAL_COPY.workLabel}
            />
          </Field>
        </>}

        <CheckBox checked={draft.show_company} onChange={(v) => set("show_company", v)}>
          <span className="block text-[15px]">会社名と役職を メンバーめいかんに 出す</span>
          <span className="c-muted block text-xs">あとから マイページで 変えられます</span>
        </CheckBox>

        <Field
          label="いま、なにを 解決したいですか？"
          hint="任意。あとから マイページで 変えられます"
          error={errors.want_to_solve}
        >
          <TextInput
            value={draft.want_to_solve}
            onChange={(v) => set("want_to_solve", v)}
            max={JOIN_SOLVE_MAX}
            label="いま、なにを 解決したいですか？"
            placeholder="例：若い職人が 入ってこない"
          />
        </Field>

        {prepared?.introduction && <div className="c-card space-y-3 p-4">
          <p className="c-label text-xs">{inviterName}さんから見た、あなたの紹介</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{prepared.introduction}</p>
          <CheckBox checked={acceptIntroduction} onChange={setAcceptIntroduction}>
            <span className="block text-sm">入会後、この文章を紹介状に掲載する</span>
            <span className="c-muted block text-xs">チェックしなければ掲載されません。掲載後も自分で削除できます。</span>
          </CheckBox>
        </div>}

        {/* 儲かるなら何でもいい、ではない。入会の前に 約束に同意してもらう */}
        <div data-field-error={errors.agreed ? "true" : undefined} className="c-card space-y-3 p-4">
          <p className="text-[15px] tracking-wider">ギルドの 約束</p>
          {[
            { title: "酒場での しごとの約束", items: GUILD_PROMISES },
            { title: "話すときの 約束（グランドルール）", items: GROUND_RULES },
          ].map((group) => (
            <div key={group.title}>
              <p className="c-label text-xs">{group.title}</p>
              <ul className="mt-1 space-y-1.5 text-sm leading-relaxed">
                {group.items.map((promise) => (
                  <li key={promise} className="flex gap-2">
                    <span aria-hidden>・</span>
                    <span>{promise}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="c-muted text-xs leading-relaxed">{PROMISE_NOTE}</p>
          <div className="space-y-1 border-t border-[#1b2a41]/20 pt-3">
            <p className="text-sm leading-relaxed">入会の前に、利用規約とプライバシーポリシーもお読みください。</p>
            <LegalLinks />
          </div>
          <div className="pt-1">
            <CheckBox checked={draft.agreed} onChange={(v) => set("agreed", v)}>
              <span className="text-[15px]">約束を まもり、利用規約と プライバシーポリシーに 同意します</span>
            </CheckBox>
          </div>
          {errors.agreed && <p className="text-xs text-[#c62828]">{errors.agreed}</p>}
        </div>

        {saveError && <p role="alert" className="text-sm text-[#c62828]">{saveError}</p>}
        <button type="submit" disabled={saving || preview} aria-busy={saving} className="rpg-button h-12 w-full text-base disabled:opacity-50 sm:w-auto sm:px-8">
          {preview ? "プレビュー中（送信できません）" : requiresApproval(draft.position)
            ? (saving ? APPROVAL_COPY.submittingLabel : `▶ ${APPROVAL_COPY.submitLabel}`)
            : (saving ? "入会手続き中…" : "▶ 入会する")}
        </button>
      </form>
    </Window>
  );
}
