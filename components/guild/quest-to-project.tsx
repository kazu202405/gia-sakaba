"use client";

// クエストの画面の「プロジェクトにする」。出した人だけ・募集中か進行中のクエストだけ。
// 外から見ると「クエスト」、中で進めると「プロジェクト」。1クエストにつき1つで、作ってあれば そこへ移る。
// パーティに入れられるのは、ギルドマスター経由の紹介が承諾された人だけ（承諾前は選べない）。

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Quest } from "@/lib/guild/types";
import { ME_ID, getProfile, guild, introRequests, questApplications } from "@/lib/guild/mock-data";
import {
  createProjectFromQuest,
  getInitialProjectState,
  getProjectState,
  subscribeProjects,
} from "@/lib/guild/project-store";
import { canMakeProject, partyCandidates, projectOfQuest } from "@/lib/guild/projects";
import { canActivateProject } from "@/lib/guild/membership";
import { uiToast } from "@/lib/ui-dialog";
import { CheckBox, TextInput } from "./form-parts";
import { ProjectLimitNotice, useMembership } from "./membership-parts";

const TITLE_MAX = 40;

export function QuestToProject({ quest }: { quest: Quest }) {
  const { projects } = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const [open, setOpen] = useState(false);
  const { isPaid } = useMembership();

  if (!canMakeProject(quest, ME_ID)) return null;
  const existing = projectOfQuest(projects, quest.id);

  return (
    <div className="c-dashed-top mt-6 pt-6">
      <p className="c-label text-xs">この{guild.terms.quest}を すすめる</p>
      {existing ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm leading-relaxed">プロジェクト「{existing.title}」で すすめています。</p>
          <Link href={`/guild/projects/${existing.id}`} className="rpg-button h-11 w-full text-sm sm:w-auto sm:px-5">
            ▶ プロジェクトを 見る
          </Link>
        </div>
      ) : !canActivateProject(projects, ME_ID, isPaid) ? (
        <div className="mt-2">
          <ProjectLimitNotice compact />
        </div>
      ) : open ? (
        <QuestToProjectForm quest={quest} onCancel={() => setOpen(false)} />
      ) : (
        <div className="mt-2 space-y-2">
          <p className="c-muted text-xs leading-relaxed">
            引き受ける人が決まったら、タスクと しめきりで すすめられます。
          </p>
          <button
            type="button"
            className="rpg-button h-11 w-full text-sm sm:w-auto sm:px-5"
            onClick={() => setOpen(true)}
          >
            ▶ プロジェクトにする
          </button>
        </div>
      )}
    </div>
  );
}

function QuestToProjectForm({ quest, onCancel }: { quest: Quest; onCancel: () => void }) {
  const router = useRouter();
  const candidates = partyCandidates(quest, questApplications, introRequests);
  const [title, setTitle] = useState(quest.title.slice(0, TITLE_MAX));
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggle = (id: string) => setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <form
      noValidate
      className="c-card mt-3 space-y-5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim() === "") {
          setError("プロジェクトの なまえを 入れてください");
          return;
        }
        const id = createProjectFromQuest(quest, { title: title.trim(), member_ids: members });
        uiToast("プロジェクトに しました（見本のため保存はされません）");
        router.push(`/guild/projects/${id}`);
      }}
    >
      <div>
        <p className="text-[15px] tracking-wider">プロジェクトの なまえ</p>
        <div className="mt-2">
          <TextInput value={title} onChange={setTitle} max={TITLE_MAX} label="プロジェクトの なまえ" />
        </div>
        {error && <p className="mt-1 text-xs text-[#c62828]">{error}</p>}
      </div>

      <fieldset>
        <legend className="text-[15px] tracking-wider">いっしょに すすめる人（{guild.terms.party}）</legend>
        <p className="c-muted mt-0.5 text-xs leading-relaxed">
          入れられるのは、{guild.terms.master}の しょうかいが 承諾された人だけです。あとから プロジェクトの画面で
          足すこともできます。
        </p>
        {candidates.length === 0 ? (
          <p className="c-muted mt-3 text-sm">参加したいと伝えた人は まだ いません。自分だけで はじめられます。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {candidates.map((c) => {
              const p = getProfile(c.user_id);
              return (
                <li key={c.user_id}>
                  <CheckBox
                    checked={members.includes(c.user_id)}
                    disabled={!c.canJoin}
                    onChange={() => toggle(c.user_id)}
                  >
                    <span className="block text-[15px]">{p?.display_name}さん</span>
                    {!c.canJoin && (
                      <span className="c-muted block text-xs">しょうかいが 承諾されたら 入れられます</span>
                    )}
                  </CheckBox>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <p className="c-muted text-xs leading-relaxed">
        {members.length === 0
          ? "だれも選ばないと、自分だけの プロジェクトになります（あなたにしか見えません）。"
          : `あなたと 選んだ ${members.length}人にだけ 見えます。ギルド全体には 出ません。`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rpg-button h-11 px-5 text-sm">
          ▶ プロジェクトを つくる
        </button>
        <button type="button" className="c-muted h-11 px-2 text-xs" onClick={onCancel}>
          やめる
        </button>
      </div>
    </form>
  );
}
