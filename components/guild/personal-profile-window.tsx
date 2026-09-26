import type { Profile } from "@/lib/guild/types";
import { birthdayLabel } from "@/lib/guild/birthday";
import { Window } from "./cards";

export function PersonalProfileWindow({ profile }: { profile: Profile }) {
  const birthday = birthdayLabel(profile.birth_month, profile.birth_day, profile.birth_year);
  const items = [
    { label: "出身地", value: profile.hometown?.trim() ?? "" },
    { label: "誕生日", value: birthday },
    { label: "趣味・好きなこと", value: profile.hobbies?.trim() ?? "" },
    { label: "これまでの歩み", value: profile.life_story?.trim() ?? "" },
  ].filter((item) => item.value);

  if (items.length === 0) return null;
  return <Window title="人となり">
    <dl className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
      {items.map((item) => <div key={item.label} className="py-4 first:pt-0 last:pb-0">
        <dt className="c-label text-xs">{item.label}</dt>
        <dd className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">{item.value}</dd>
      </div>)}
    </dl>
  </Window>;
}
