"use client";

// プロジェクトのパーティ。持ち主だけが、あとから人を足す・外す。
// 足せるのは、ギルドマスター経由の紹介が承諾された・紹介済みでつながっている人だけ。
// 足した人にはプロジェクトの中身（タスク・備考・人ごとのすすみ）が見えるので、足す前に確かめる。

import { useState } from "react";
import type { Profile, Project } from "@/lib/guild/types";
import { ME_ID, getProfile, guild, introRequests } from "@/lib/guild/mock-data";
import { addMember, removeMember } from "@/lib/guild/project-store";
import { connectedPeople } from "@/lib/guild/projects";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { MemberRow } from "./cards";
import { Select } from "./form-parts";

export function ProjectParty({ project, people, isOwner }: { project: Project; people: Profile[]; isOwner: boolean }) {
  const [adding, setAdding] = useState("");
  const [error, setError] = useState("");
  const canEdit = isOwner && project.status === "active";

  const options = connectedPeople(ME_ID, introRequests)
    .filter((id) => id !== project.owner_id && !project.member_ids.includes(id))
    .map((id) => ({ value: id, label: `${getProfile(id)?.display_name ?? ""}さん` }));

  const add = async () => {
    if (adding === "") {
      setError("足す人を えらんでください");
      return;
    }
    setError("");
    const name = getProfile(adding)?.display_name ?? "";
    const ok = await uiConfirm({
      title: `${name}さんを ${guild.terms.party}に 足します`,
      message:
        project.member_ids.length === 0
          ? `いまは あなたにしか見えない プロジェクトです。足すと、${name}さんにも タスク・備考・人ごとの すすみ が見えるようになります。`
          : `${name}さんにも タスク・備考・人ごとの すすみ が見えるようになります。`,
      okLabel: "足す",
    });
    if (!ok) return;
    addMember(project.id, adding);
    setAdding("");
    uiToast(`${name}さんを ${guild.terms.party}に 足しました`);
  };

  const remove = async (p: Profile) => {
    const ok = await uiConfirm({
      title: `${p.display_name}さんを ${guild.terms.party}から 外します`,
      message: `${p.display_name}さんには このプロジェクトが 見えなくなります。担当していたタスクは「きまっていない」に もどります。`,
      okLabel: "外す",
      danger: true,
    });
    if (!ok) return;
    removeMember(project.id, p.id);
    uiToast(`${p.display_name}さんを 外しました`);
  };

  return (
    <div className="space-y-5">
      <ul className="grid gap-4 sm:grid-cols-2">
        {people.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <MemberRow profile={p} />
            </div>
            {p.id === project.owner_id ? (
              <span className="c-muted shrink-0 text-[11px]">もちぬし</span>
            ) : (
              canEdit && (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="c-muted h-10 shrink-0 px-2 text-xs underline underline-offset-4"
                  aria-label={`${p.display_name}さんを ${guild.terms.party}から 外す`}
                >
                  外す
                </button>
              )
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="c-dashed-top space-y-2 pt-4">
          <p className="text-[15px] tracking-wider">人を 足す</p>
          {options.length === 0 ? (
            <p className="c-muted text-xs leading-relaxed">
              足せる人が いません。足せるのは、{guild.terms.master}の しょうかいが 承諾されて つながった人だけです。
            </p>
          ) : (
            <>
              <p className="c-muted text-xs leading-relaxed">
                {guild.terms.master}の しょうかいで つながった人から えらべます。
              </p>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Select value={adding} onChange={setAdding} options={options} label="足す人" />
                </div>
                <button type="button" onClick={add} className="rpg-button h-11 shrink-0 px-4 text-sm">
                  ▶ 足す
                </button>
              </div>
              {error && <p className="text-xs text-[#c62828]">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
