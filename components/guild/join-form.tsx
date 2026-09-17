"use client";

// 入会の入力。名前・会社名・役職と、名鑑に会社名と役職を出すか。
// 酒場は だれでも入れる。役職は 限定の集まり（経営者の方向け）の目安に使うだけで、ここでは はじかない。

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Position } from "@/lib/guild/types";
import { positionLabel } from "@/lib/guild/labels";
import { JOIN_COMPANY_MAX, JOIN_NAME_MAX, validateJoin, type JoinDraft, type JoinErrors } from "@/lib/guild/join";
import { guild } from "@/lib/guild/mock-data";
import { uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";
import { Field, TextInput, scrollToFirstError } from "./form-parts";

const POSITIONS = Object.keys(positionLabel) as Position[];

export function JoinForm({ inviterName }: { inviterName: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<JoinDraft>({
    display_name: "",
    company_name: "",
    position: "",
    show_company: true,
  });
  const [errors, setErrors] = useState<JoinErrors>({});

  const set = <K extends keyof JoinDraft>(key: K, value: JoinDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // 直しはじめたら、その欄の赤字は消す
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <Window title="入会">
      <p className="c-muted mb-6 text-xs">{inviterName}さんからの 招待です。</p>
      <form
        noValidate
        className="space-y-7"
        onSubmit={(e) => {
          e.preventDefault();
          const next = validateJoin(draft);
          setErrors(next);
          if (Object.keys(next).length > 0) {
            scrollToFirstError();
            return;
          }
          uiToast(`${guild.name}に 入会しました（見本のため保存はされません）`);
          router.push("/guild/me/status?new=1");
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

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={draft.show_company}
            onChange={(e) => set("show_company", e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#1b2a41]"
          />
          <span>
            <span className="block text-[15px]">会社名と役職を {guild.terms.member}めいかんに 出す</span>
            <span className="c-muted block text-xs">あとから マイページで 変えられます</span>
          </span>
        </label>

        <button type="submit" className="rpg-button h-12 w-full text-base sm:w-auto sm:px-8">
          ▶ 入会する
        </button>
      </form>
    </Window>
  );
}
