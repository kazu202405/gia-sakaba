"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuildProject } from "@/lib/guild/server-data";
import { createClient } from "@/lib/supabase/client";
import { CheckBox, DateInput, Field, TextArea, TextInput } from "./form-parts";

function todayInJapan() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function LiveProjectForm({ project, canCreate = true }: { project?: GuildProject; canCreate?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(project?.title ?? "");
  const [goal, setGoal] = useState(project?.goal ?? "");
  const [memo, setMemo] = useState(project?.memo ?? "");
  const [startDate, setStartDate] = useState(project?.start_date ?? todayInJapan());
  const [dueDate, setDueDate] = useState(project?.due_date ?? "");
  const [withSteps, setWithSteps] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !canCreate || createdId) return;
    if (!title.trim() || !startDate || (dueDate && dueDate < startDate)) {
      setError("タイトルと日付を確認してください。");
      return;
    }
    setSaving(true);
    setError("");
    const fields = { p_title: title.trim(), p_goal: goal.trim(), p_memo: memo.trim(), p_start_date: startDate, p_due_date: dueDate || null };
    if (project) {
      const { error: rpcError } = await createClient().rpc("sakaba_update_project", { p_project_id: project.id, ...fields });
      if (rpcError) { setError("保存できませんでした。再度お試しください。"); setSaving(false); return; }
      router.push(`/guild/projects/${project.id}`);
    } else {
      const { data, error: rpcError } = await createClient().rpc("sakaba_create_project", { p_guild_slug: "gia", ...fields });
      if (rpcError || typeof data !== "string") { setError("作成できませんでした。入力内容や作成枠を確認してください。"); setSaving(false); return; }
      if (withSteps) {
        const { error: stepsError } = await createClient().rpc("sakaba_enable_project_steps", { p_project_id: data });
        if (stepsError) {
          setCreatedId(data);
          setError("プロジェクトは作成されましたが、あいてごとの じょうきょうを記録できませんでした。詳細画面からもう一度お試しください。");
          setSaving(false);
          return;
        }
      }
      router.push(`/guild/projects/${data}`);
    }
    router.refresh();
  }

  return <div className="mx-auto max-w-2xl">
    <Link href={project ? `/guild/projects/${project.id}` : "/guild/projects"} className="c-muted mb-8 inline-block text-sm">◀ プロジェクトへ戻る</Link>
    <form onSubmit={submit} className="c-window space-y-5 p-5 pt-10 sm:p-7 sm:pt-11">
      <span className="c-window-title">{project ? "プロジェクトをなおす" : "プロジェクトをつくる"}</span>
      {!canCreate && <p className="text-sm text-[#c62828]">無料プランではプロジェクトは2件までです。</p>}
      <Field label="タイトル" required><TextInput value={title} onChange={setTitle} max={40} label="タイトル" /></Field>
      <Field label="ゴール" hint="何ができたら終わりか"><TextArea value={goal} onChange={setGoal} max={200} rows={3} label="ゴール" /></Field>
      <Field label="メモ"><TextArea value={memo} onChange={setMemo} max={500} rows={4} label="メモ" /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="開始日" required><DateInput value={startDate} onChange={setStartDate} label="開始日" /></Field>
        <Field label="期限（任意）"><DateInput value={dueDate} onChange={setDueDate} label="期限" min={startDate} /></Field>
      </div>
      {!project && <CheckBox checked={withSteps} onChange={setWithSteps}>
        <span className="block text-[15px]">あいてごとの じょうきょうを きろくする</span>
        <span className="c-muted block text-xs leading-relaxed">営業など、同じ手順を何人にも進めるとき。初回アポ／興味付け／提案／契約から始められます。</span>
      </CheckBox>}
      <p className="c-muted text-xs">作成したプロジェクトは、いまは自分だけに表示されます。</p>
      {error && <p role="alert" className="text-sm text-[#c62828]">{error}{createdId && <Link href={`/guild/projects/${createdId}`} className="ml-2 underline">詳細へ進む</Link>}</p>}
      <button type="submit" disabled={saving || !canCreate || !!createdId} aria-busy={saving} className="rpg-button w-full px-6 py-3 disabled:opacity-50 sm:w-auto">{saving ? project ? "保存中…" : "作成中…" : project ? "▶ 保存する" : "▶ 作成する"}</button>
    </form>
  </div>;
}
