// メンバーのプロフィール：建設・不動産の店だけの項目（対応エリア・得意な工事・許可/免許の印）を並べる。
// 出す店かどうかは lib/guild/stores.ts の profileFields。出さない店・空のときは何も出さない。

import type { Profile } from "@/lib/guild/types";
import { currentStore } from "@/lib/guild/current-store";
import { storeHasField } from "@/lib/guild/store-profile";

export async function StoreProfileView({ profile }: { profile: Profile }) {
  const store = await currentStore();
  const areas = storeHasField(store.config, "work_areas") ? profile.work_areas ?? [] : [];
  const works = storeHasField(store.config, "work_types") ? profile.work_types ?? [] : [];
  const licenses = storeHasField(store.config, "licenses")
    ? [profile.has_construction_license ? "建設業許可" : "", profile.has_real_estate_license ? "宅建免許" : ""].filter(Boolean)
    : [];
  if (areas.length === 0 && works.length === 0 && licenses.length === 0) return null;
  return <dl className="c-dashed-top mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 pt-4 text-[15px]">
    {areas.length > 0 && <><dt className="c-label text-base">対応エリア</dt><dd className="break-words">{areas.join("・")}</dd></>}
    {licenses.length > 0 && <><dt className="c-label text-base">許可・免許</dt><dd><ul className="flex flex-wrap gap-2">{licenses.map((name) => <li key={name} className="c-chip">{name}</li>)}</ul></dd></>}
    {works.length > 0 && <><dt className="c-label text-base">得意な工事</dt><dd><ul className="flex flex-wrap gap-2">{works.map((name) => <li key={name} className="c-chip">{name}</li>)}</ul></dd></>}
  </dl>;
}
