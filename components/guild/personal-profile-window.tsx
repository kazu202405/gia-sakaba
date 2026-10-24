import type { Profile } from "@/lib/guild/types";
import { birthdayLabel } from "@/lib/guild/birthday";
import { currentStore } from "@/lib/guild/current-store";
import { Window } from "./cards";

export async function PersonalProfileWindow({ profile }: { profile: Profile }) {
  const store = await currentStore();
  const birthday = birthdayLabel(profile.birth_month, profile.birth_day, profile.birth_year);
  const items = [
    { label: store.w("personal.hometown"), value: profile.hometown?.trim() ?? "" },
    { label: store.w("personal.birthday"), value: birthday },
    { label: store.w("personal.hobbies"), value: profile.hobbies?.trim() ?? "" },
    { label: store.w("personal.lifeStory"), value: profile.life_story?.trim() ?? "" },
  ].filter((item) => item.value);

  if (items.length === 0) return null;
  return <Window title="人となり">
    <dl className="divide-y-2 divide-dashed divide-guild-ink/15">
      {items.map((item) => <div key={item.label} className="py-4 first:pt-0 last:pb-0">
        <dt className="c-label text-base">{item.label}</dt>
        <dd className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">{item.value}</dd>
      </div>)}
    </dl>
  </Window>;
}
