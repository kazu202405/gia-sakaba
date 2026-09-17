"use client";

// プロジェクトを つくる画面。はじめは本人だけのプロジェクトになる。
// パーティで進めるものは、クエストで参加する人が決まったときに作る（見本ではまだ作れない）。

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TODAY } from "@/lib/guild/mock-data";
import { createProject } from "@/lib/guild/project-store";
import { uiToast } from "@/lib/ui-dialog";
import { BackLink, PageTitle, Window } from "./cards";
import { Field, TextArea, TextInput, scrollToFirstError } from "./form-parts";

const TITLE_MAX = 40;
const GOAL_MAX = 200;

export function ProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [due, setDue] = useState("");
  const [errors, setErrors] = useState<{ title?: string; due?: string }>({});

  const submit = () => {
    const next: typeof errors = {};
    if (title.trim() === "") next.title = "なまえを 入れてください";
    if (due !== "" && due < TODAY) next.due = "きょうより前の日は えらべません";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      scrollToFirstError();
      return;
    }
    const id = createProject({ title: title.trim(), goal: goal.trim(), due_date: due || null });
    uiToast("プロジェクトを つくりました（見本のため保存はされません）");
    router.push(`/guild/projects/${id}`);
  };

  return (
    <div className="space-y-9">
      <BackLink href="/guild/projects" label="プロジェクト" />
      <PageTitle
        title="プロジェクトを つくる"
        lead="自分が すすめたいことを ひとつ決めて、やることを タスクに分けます。ここに書いたことは あなたにしか見えません。"
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
          <Field label="なにができたら おわりか" hint="あとで なおせます。空でも大丈夫です">
            <TextArea
              value={goal}
              onChange={setGoal}
              rows={3}
              max={GOAL_MAX}
              label="なにができたら おわりか"
              placeholder="例：トップと サービスのページを 公開しなおす"
            />
          </Field>
          <Field label="いつまでに" hint="決まっていなければ 空のままで" error={errors.due ?? ""}>
            <TextInput type="date" value={due} onChange={setDue} max={10} label="いつまでに" />
          </Field>
          <button type="submit" className="rpg-button h-12 w-full text-base sm:w-auto">
            ▶ つくる
          </button>
        </form>
      </Window>
    </div>
  );
}
