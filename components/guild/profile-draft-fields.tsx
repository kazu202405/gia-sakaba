"use client";

// ステータスの下書きの入力欄（招待状の窓・メンバーの詳しい画面で共通）。
// 項目・上限・並びは lib/guild/profile-drafts.ts の一覧を読むだけ（ここには書かない）。

import { DRAFT_FIELDS, draftFieldIsLong, draftFieldLabelFor, draftFieldMax, type DraftField, type ProfileDraftFields } from "@/lib/guild/profile-drafts";
import { Field, TextArea, TextInput } from "./form-parts";
import { useGuildStore } from "@/components/guild/store-context";

export function ProfileDraftInputs({ value, onChange }: { value: ProfileDraftFields; onChange: (next: ProfileDraftFields) => void }) {
  const store = useGuildStore();
  const set = (key: DraftField, text: string) => onChange({ ...value, [key]: text });
  return <div className="space-y-5">
    {DRAFT_FIELDS.map((key) => <Field key={key} label={draftFieldLabelFor(store.w)[key]} optional>
      {draftFieldIsLong[key]
        ? <TextArea value={value[key]} onChange={(text) => set(key, text)} max={draftFieldMax[key]} rows={4} label={draftFieldLabelFor(store.w)[key]} />
        : <TextInput value={value[key]} onChange={(text) => set(key, text)} max={draftFieldMax[key]} label={draftFieldLabelFor(store.w)[key]} />}
    </Field>)}
  </div>;
}
