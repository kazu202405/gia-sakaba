"use client";

// プロジェクトを つくる・なおす画面。はじめは本人だけのプロジェクトになる。
// パーティで進めるものは、クエストで参加する人が決まったときに作る（見本ではまだ作れない）。

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ME_ID, SALES_STEP_NAMES, TODAY } from "@/lib/guild/mock-data";
import {
  createProject,
  getInitialProjectState,
  getProjectState,
  subscribeProjects,
  updateProject,
} from "@/lib/guild/project-store";
import { uiToast } from "@/lib/ui-dialog";
import { BackLink, PageTitle, Window } from "./cards";
import { Field, TextArea, TextInput, scrollToFirstError } from "./form-parts";

const TITLE_MAX = 40;
const GOAL_MAX = 200;
export const PROJECT_MEMO_MAX = 500;

type Errors = { title?: string; start?: string; due?: string };

export function ProjectForm({ projectId }: { projectId?: string }) {
  const { projects } = useSyncExternalStore(subscribeProjects, getProjectState, getInitialProjectState);
  const editing = projectId ? projects.find((p) => p.id === projectId) : undefined;

  // なおせるのは持ち主だけ。見えない・無いときは「ない」と同じに見せる
  if (projectId && (!editing || editing.owner_id !== ME_ID)) {
    return (
      <div className="space-y-9">
        <BackLink href="/guild/projects" label="プロジェクト" />
        <Window>
          <p className="text-sm">このプロジェクトは 見つかりませんでした。</p>
        </Window>
      </div>
    );
  }

  return <ProjectFormBody key={projectId ?? "new"} editing={editing} />;
}

function ProjectFormBody({ editing }: { editing?: ReturnType<typeof getProjectState>["projects"][number] }) {
  const router = useRouter();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [goal, setGoal] = useState(editing?.goal ?? "");
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [start, setStart] = useState(editing?.start_date ?? TODAY);
  const [due, setDue] = useState(editing?.due_date ?? "");
  const [withSteps, setWithSteps] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const back = editing ? `/guild/projects/${editing.id}` : "/guild/projects";

  const submit = () => {
    const next: Errors = {};
    if (title.trim() === "") next.title = "なまえを 入れてください";
    if (start === "") next.start = "はじめる日を 入れてください";
    if (due !== "" && start !== "" && due < start) next.due = "しめきりは はじめる日より あとにしてください";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      scrollToFirstError();
      return;
    }
    const input = {
      title: title.trim(),
      goal: goal.trim(),
      memo: memo.trim(),
      start_date: start,
      due_date: due || null,
    };
    if (editing) {
      updateProject(editing.id, input);
      uiToast("なおしました（見本のため保存はされません）");
      router.push(back);
      return;
    }
    const id = createProject({ ...input, withSteps });
    uiToast("プロジェクトを つくりました（見本のため保存はされません）");
    router.push(`/guild/projects/${id}`);
  };

  return (
    <div className="space-y-9">
      <BackLink href={back} label={editing ? "プロジェクトに もどる" : "プロジェクト"} />
      <PageTitle
        title={editing ? "プロジェクトを なおす" : "プロジェクトを つくる"}
        lead="自分が すすめたいことを ひとつ決めて、やることを タスクに分けます。自分だけのプロジェクトは あなたにしか見えません。"
      />
      <Window>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-7"
        >
          <Field label="なまえ" required hint="例：自社ホームページを 新しくする" error={errors.title ?? ""}>
            <TextInput value={title} onChange={setTitle} max={TITLE_MAX} label="なまえ" />
          </Field>
          <Field label="なにができたら おわりか" hint="空でも大丈夫です">
            <TextArea
              value={goal}
              onChange={setGoal}
              rows={2}
              max={GOAL_MAX}
              label="なにができたら おわりか"
              placeholder="例：トップと サービスのページを 公開しなおす"
            />
          </Field>
          <div className="grid gap-7 sm:grid-cols-2">
            <Field label="はじめる日" required error={errors.start ?? ""}>
              <TextInput type="date" value={start} onChange={setStart} max={10} label="はじめる日" />
            </Field>
            <Field label="しめきり" hint="入れると 期間のバーと 工程表が出ます" error={errors.due ?? ""}>
              <TextInput type="date" value={due} onChange={setDue} max={10} label="しめきり" />
            </Field>
          </div>
          <Field
            label="備考"
            hint={`すすめるための メモです（${PROJECT_MEMO_MAX}字まで）。お客様の連絡先は 書かないでください`}
          >
            <TextArea value={memo} onChange={setMemo} rows={4} max={PROJECT_MEMO_MAX} label="備考" />
          </Field>
          {!editing && (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={withSteps}
                onChange={(e) => setWithSteps(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#1b2a41]"
              />
              <span>
                <span className="block text-[15px]">人ごとの すすみも つかう</span>
                <span className="c-muted block text-xs leading-relaxed">
                  営業など、同じ手順を 何人にも すすめるとき。
                  {SALES_STEP_NAMES.join("／")} で はじまり、あとで なおせます
                </span>
              </span>
            </label>
          )}
          <button type="submit" className="rpg-button h-12 w-full text-base sm:w-auto">
            ▶ {editing ? "なおす" : "つくる"}
          </button>
        </form>
      </Window>
    </div>
  );
}
