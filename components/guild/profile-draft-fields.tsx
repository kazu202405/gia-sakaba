"use client";

// ステータスの下書きの入力欄（招待状の窓・メンバーの詳しい画面で共通）。
// 項目・上限・並びは lib/guild/profile-drafts.ts の一覧を読むだけ（ここには書かない）。

import { DRAFT_FIELDS, draftFieldIsLong, draftFieldLabel, draftFieldMax, type DraftField, type ProfileDraftFields } from "@/lib/guild/profile-drafts";
import { Field, TextArea, TextInput } from "./form-parts";

export function ProfileDraftInputs({ value, onChange }: { value: ProfileDraftFields; onChange: (next: ProfileDraftFields) => void }) {
  const set = (key: DraftField, text: string) => onChange({ ...value, [key]: text });
  return <div className="space-y-5">
    {DRAFT_FIELDS.map((key) => <Field key={key} label={draftFieldLabel[key]} optional>
      {draftFieldIsLong[key]
        ? <TextArea value={value[key]} onChange={(text) => set(key, text)} max={draftFieldMax[key]} rows={4} label={draftFieldLabel[key]} />
        : <TextInput value={value[key]} onChange={(text) => set(key, text)} max={draftFieldMax[key]} label={draftFieldLabel[key]} />}
    </Field>)}
  </div>;
}
