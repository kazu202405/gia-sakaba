"use client";

// マイページ：ギルドでの公開範囲と、紹介を受け付けるか。

import { useState } from "react";
import type { Profile, VisibleGroup } from "@/lib/guild/types";
import { groupLabel } from "@/lib/guild/labels";
import { uiToast } from "@/lib/ui-dialog";

const GROUPS = Object.keys(groupLabel) as VisibleGroup[];

export function MyStatusSettings({ me }: { me: Profile }) {
  const [visible, setVisible] = useState<VisibleGroup[]>(me.visible_groups);
  const [acceptIntro, setAcceptIntro] = useState(me.accept_intro);

  const toggleGroup = (g: VisibleGroup) => {
    const next = visible.includes(g) ? visible.filter((x) => x !== g) : [...visible, g];
    setVisible(next);
    uiToast(`「${groupLabel[g].title}」を${next.includes(g) ? "公開" : "非公開"}にしました（見本）`, "info");
  };

  return (
    <div>
      <ul className="divide-y-2 divide-dashed divide-[#1b2a41]/20">
        <Row title="きほん" note="名前・職業アイコン・肩書・業種・地域" right={<span className="c-muted text-xs">いつも公開</span>} />
        {GROUPS.map((g) => (
          <Row
            key={g}
            title={groupLabel[g].title}
            note={groupLabel[g].note}
            right={
              <button
                type="button"
                role="switch"
                aria-checked={visible.includes(g)}
                aria-label={`${groupLabel[g].title}を公開`}
                onClick={() => toggleGroup(g)}
                className="c-switch"
              />
            }
          />
        ))}
        <Row title="れんらく先" note="しょうかいが承諾された相手にだけ見えます" right={<span className="c-muted text-xs">名鑑には出ません</span>} />
      </ul>

      <ul className="c-dashed-top mt-2">
        <Row
          title="しょうかいを受けつける"
          note="オフにすると、名鑑に「しょうかいは お休み中」と出ます"
          right={
            <button
              type="button"
              role="switch"
              aria-checked={acceptIntro}
              aria-label="紹介を受け付ける"
              onClick={() => {
                setAcceptIntro(!acceptIntro);
                uiToast(!acceptIntro ? "紹介の受け付けを再開しました（見本）" : "紹介の受け付けを止めました（見本）", "info");
              }}
              className="c-switch"
            />
          }
        />
      </ul>
    </div>
  );
}

function Row({ title, note, right }: { title: string; note: string; right: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[15px]">{title}</p>
        <p className="c-muted text-xs">{note}</p>
      </div>
      <div className="shrink-0">{right}</div>
    </li>
  );
}
