"use client";

// 店ごとのプロフィールのうち、建設・不動産の店だけの項目の入力部品（0134・0135）。
// どの店で出すかは lib/guild/stores.ts の profileFields（親の画面が見て、この部品を置くかを決める）。
//  - StoreOnlyFields：業種（選ぶ）・対応エリア・得意な工事・許可/免許の印。値は親が持ち、親の自動保存に乗る
//  - WorkPhotosEditor：伝えたいことに添える写真（任意・3枚まで）。画像を選んだその場で保存する

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { shrinkBusinessCardImage } from "@/lib/guild/business-card";
import {
  AREA_REGIONS,
  INDUSTRIES,
  WORK_PHOTO_BUCKET,
  WORK_PHOTO_MAX,
  WORK_PHOTO_SOURCE_LIMIT,
  WORK_TYPES,
  workPhotoPath,
  type ProfileField,
} from "@/lib/guild/store-profile";
import { useGuildStore } from "@/components/guild/store-context";
import { Field } from "./form-parts";

export type StoreOnlyValues = {
  industry: string;
  work_areas: string[];
  work_types: string[];
  has_construction_license: boolean;
  has_real_estate_license: boolean;
};

function toggle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const chipClass = (on: boolean) => `min-h-11 border-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guild-ink ${on ? "border-guild-ink bg-guild-accent-light" : "border-guild-ink/25 bg-guild-paper hover:border-guild-ink"}`;

export function StoreOnlyFields({ values, onChange }: {
  values: StoreOnlyValues;
  onChange: <K extends keyof StoreOnlyValues>(key: K, value: StoreOnlyValues[K]) => void;
}) {
  const store = useGuildStore();
  const has = (field: ProfileField) => store.config.profileFields.includes(field);
  return <>
    {has("industry_choice") && <Field label="業種" hint="ここで選んだ業種に合う相談が届きます">
      <div className="flex flex-wrap gap-2" role="group" aria-label="業種">
        {INDUSTRIES.map((item) => <button key={item.key} type="button" aria-pressed={values.industry === item.key} onClick={() => onChange("industry", values.industry === item.key ? "" : item.key)} className={chipClass(values.industry === item.key)}>{item.label}</button>)}
      </div>
    </Field>}
    {has("work_areas") && <Field label="対応エリア" hint={`タップで選びます（${values.work_areas.length}か所）`}>
      <div className="space-y-3">
        {AREA_REGIONS.map((region) => <div key={region.label}>
          <p className="c-muted mb-1 text-xs">{region.label}</p>
          <div className="flex flex-wrap gap-2">
            {region.prefectures.map((name) => <button key={name} type="button" aria-pressed={values.work_areas.includes(name)} onClick={() => onChange("work_areas", toggle(values.work_areas, name))} className={chipClass(values.work_areas.includes(name))}>{name}</button>)}
          </div>
        </div>)}
      </div>
    </Field>}
    {has("licenses") && <Field label="許可・免許" hint="印は、管理者が渡し先を選ぶときの目安として表示されます">
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={values.has_construction_license} onChange={(event) => onChange("has_construction_license", event.target.checked)} />建設業許可を持っている</label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={values.has_real_estate_license} onChange={(event) => onChange("has_real_estate_license", event.target.checked)} />宅建免許を持っている</label>
    </Field>}
    {has("work_types") && <Field label="得意な工事・できること" hint="相談との突き合わせに使います">
      <div className="flex flex-wrap gap-2" role="group" aria-label="得意な工事・できること">
        {WORK_TYPES.map((name) => <button key={name} type="button" aria-pressed={values.work_types.includes(name)} onClick={() => onChange("work_types", toggle(values.work_types, name))} className={chipClass(values.work_types.includes(name))}>{name}</button>)}
      </div>
    </Field>}
  </>;
}

export function WorkPhotosEditor({ userId, guildId, initialPaths, initialUrls }: {
  userId: string;
  guildId: string;
  initialPaths: string[];
  initialUrls: Record<string, string>;
}) {
  const store = useGuildStore();
  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 押した瞬間にかける錠（state は反映が遅れる）
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  async function save(next: string[]) {
    const { error: rpcError } = await createClient().rpc("sakaba_set_work_photos", { p_guild_slug: store.slug, p_paths: next });
    if (rpcError) throw rpcError;
  }

  async function add(files: FileList | null) {
    if (!files || files.length === 0 || lock.current) return;
    lock.current = true;
    setBusy(true); setError("");
    const supabase = createClient();
    const room = WORK_PHOTO_MAX - paths.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > picked.length) uiToast(`写真は${WORK_PHOTO_MAX}枚までです`, "info");
    const uploaded: string[] = [];
    try {
      for (const file of picked) {
        if (!file.type.startsWith("image/")) throw new Error("not image");
        if (file.size > WORK_PHOTO_SOURCE_LIMIT) { setError("画像は20MBまでです。"); throw new Error("too big"); }
        const blob = await shrinkBusinessCardImage(file);
        const path = workPhotoPath(userId, guildId, crypto.randomUUID());
        const { error: uploadError } = await supabase.storage.from(WORK_PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;
        uploaded.push(path);
      }
      const next = [...paths, ...uploaded];
      await save(next);
      const { data } = await supabase.storage.from(WORK_PHOTO_BUCKET).createSignedUrls(uploaded, 60 * 60);
      setPaths(next);
      setUrls((current) => ({ ...current, ...Object.fromEntries((data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])) }));
      uiToast("写真を付けました");
    } catch {
      // 載せられなかった画像は置いたままにしない
      if (uploaded.length > 0) await supabase.storage.from(WORK_PHOTO_BUCKET).remove(uploaded);
      setError((current) => current || "写真を付けられませんでした。画面を読み直して、もう一度お試しください。");
    } finally {
      lock.current = false;
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(path: string) {
    if (lock.current) return;
    const confirmed = await uiConfirm({ title: "この写真を外します", message: "外すと、ほかのメンバーからも見えなくなります。", okLabel: "外す", danger: true });
    if (!confirmed) return;
    lock.current = true;
    setBusy(true); setError("");
    try {
      const next = paths.filter((item) => item !== path);
      await save(next);
      await createClient().storage.from(WORK_PHOTO_BUCKET).remove([path]);
      setPaths(next);
      uiToast("写真を外しました");
    } catch {
      setError("写真を外せませんでした。画面を読み直して、もう一度お試しください。");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const full = paths.length >= WORK_PHOTO_MAX;
  return <Field label="写真" optional hint={`無くても大丈夫です。${WORK_PHOTO_MAX}枚まで。画像を選んだその場で保存します`}>
    {paths.length > 0 && <ul className="mb-3 grid grid-cols-3 gap-2">
      {paths.map((path) => <li key={path} className="c-card relative aspect-square overflow-hidden">
        {urls[path]
          // eslint-disable-next-line @next/next/no-img-element -- 期限つきの署名URLの画像なので next/image を通さない
          ? <img src={urls[path]} alt="伝えたいことの写真" className="h-full w-full object-cover" />
          : <span className="c-muted flex h-full items-center justify-center p-1 text-center text-xs">読み込めませんでした</span>}
        <button type="button" disabled={busy} onClick={() => void remove(path)} aria-label="この写真を外す" className="c-button-sub absolute right-1 top-1 h-9 px-2 text-xs disabled:opacity-50">外す</button>
      </li>)}
    </ul>}
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" aria-label="写真を選ぶ" onChange={(event) => void add(event.target.files)} />
    <button type="button" disabled={busy || full} onClick={() => input.current?.click()} className="c-button-sub h-11 px-4 text-sm disabled:opacity-50">{busy ? "処理中…" : full ? `${WORK_PHOTO_MAX}枚まで付けています` : "写真を付ける"}</button>
    {error && <p role="alert" className="mt-2 text-sm text-[#c62828]">{error}</p>}
  </Field>;
}
