import type { Profile } from "@/lib/guild/types";
import { birthdayLabel } from "@/lib/guild/birthday";
import { Window } from "./cards";

export function PersonalProfileWindow({ profile }: { profile: Profile }) {
  const birthday = birthdayLabel(profile.birth_month, profile.birth_day, profile.birth_year);
  const items = [
    { label: "しゅっしんち", value: profile.hometown?.trim() ?? "" },
    { label: "たんじょうび", value: birthday },
    { label: "しゅみ・すきなこと", value: profile.hobbies?.trim() ?? "" },
    { label: "これまでの あゆみ", value: profile.life_story?.trim() ?? "" },
  ].filter((item) => item.value);

  if (items.length === 0) return null;
  return <Window title="人となり">
    <dl className="divide-y-2 divide-dashed divide-[#1b2a41]/15">
      {items.map((item) => <div key={item.label} className="py-4 first:pt-0 last:pb-0">
        <dt className="c-label text-[15px]">{item.label}</dt>
        <dd className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">{item.value}</dd>
      </div>)}
    </dl>
  </Window>;
}
