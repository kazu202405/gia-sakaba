"use client";

// 入会の入力。名前・会社名・役職と、名鑑に会社名と役職を出すか。
// 酒場は だれでも入れる。役職は 限定の集まり（経営者の方向け）の目安に使うだけで、ここでは はじかない。

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Position } from "@/lib/guild/types";
import { positionLabel } from "@/lib/guild/labels";
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
import { CheckBox, Field, TextInput, scrollToFirstError } from "./form-parts";

const POSITIONS = Object.keys(positionLabel) as Position[];

export function JoinForm({ inviterName, inviteCode, preview = false, initialName = "" }: { inviterName: string; inviteCode: string; preview?: boolean; initialName?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<JoinDraft>({
    display_name: initialName.slice(0, JOIN_NAME_MAX),
    company_name: "",
    position: "",
    show_company: true,
    want_to_solve: "",
    agreed: false,
  });
  const [errors, setErrors] = useState<JoinErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const set = <K extends keyof JoinDraft>(key: K, value: JoinDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // 直しはじめたら、その欄の赤字は消す
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <Window title="冒険の準備">
      {preview ? <p className="mb-6 border-2 border-dashed border-[#1b2a41] bg-[#fffdf6] p-3 text-sm">入会フォームのプレビューです。入力しても送信・保存はできません。</p> :
        <p className="c-muted mb-6 text-xs">{inviterName}さんからの 招待状を確認しました。</p>}
      <form
        noValidate
        className="space-y-7"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving || preview) return;
          const next = validateJoin(draft);
          setErrors(next);
          if (Object.keys(next).length > 0) {
            scrollToFirstError();
            return;
          }
          setSaving(true);
          setSaveError("");
          try {
            const { data, error } = await createClient().rpc("sakaba_join_guild", {
              p_code: inviteCode,
              p_display_name: draft.display_name.trim(),
              p_company_name: draft.company_name.trim(),
              p_position: draft.position,
              p_show_company: draft.show_company,
              p_want_to_solve: draft.want_to_solve.trim(),
              p_agreed: draft.agreed,
            });
            if (error) throw error;
            uiToast((data as { already_member?: boolean } | null)?.already_member ? "すでに入会しています" : "GIAの酒場に入会しました");
            router.push("/guild/me/status?new=1");
            router.refresh();
          } catch {
            setSaveError("入会できませんでした。招待リンクの期限や利用回数を確認し、再度お試しください。");
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
          hint="ギルドマスターが ひらく 限定の集まりは、経営者（代表・役員・決裁者）の方向けです"
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

        <CheckBox checked={draft.show_company} onChange={(v) => set("show_company", v)}>
          <span className="block text-[15px]">会社名と役職を メンバーめいかんに 出す</span>
          <span className="c-muted block text-xs">あとから マイページで 変えられます</span>
        </CheckBox>

        <Field
          label="いま、なにを 解決したいですか？"
          hint="任意。ギルドマスターが だれと つなぐかを 考える手がかりに なります"
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
          <div className="pt-1">
            <CheckBox checked={draft.agreed} onChange={(v) => set("agreed", v)}>
              <span className="text-[15px]">約束を まもります</span>
            </CheckBox>
          </div>
          {errors.agreed && <p className="text-xs text-[#c62828]">{errors.agreed}</p>}
        </div>

        {saveError && <p role="alert" className="text-sm text-[#c62828]">{saveError}</p>}
        <button type="submit" disabled={saving || preview} aria-busy={saving} className="rpg-button h-12 w-full text-base disabled:opacity-50 sm:w-auto sm:px-8">
          {preview ? "プレビュー中（送信できません）" : saving ? "仲間に登録中…" : "▶ 酒場の仲間になる"}
        </button>
      </form>
    </Window>
  );
}
