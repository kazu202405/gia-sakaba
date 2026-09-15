// /clone/[slug]/people/[id]/notes ─ 人物メモタブ。
// person の存在確認 → 同テナント内のメモを occurred_at desc で表示 + 追加。

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { PersonTabs } from "../_components/PersonTabs";
import { PersonNoteAddDialog } from "./_components/PersonNoteAddDialog";
import { PersonNoteEditDialog } from "./_components/PersonNoteEditDialog";
import { PersonNoteDeleteButton } from "./_components/PersonNoteDeleteButton";

export const dynamic = "force-dynamic";

interface NoteRow {
  id: string;
  occurred_at: string;
  content: string | null;
  challenges: string | null;
  temperature: string | null;
  caveats: string | null;
  next_touch_date: string | null;
  interests: string[] | null;
}

function formatDateOnly(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function PersonNotesPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();

  // person の存在確認 + 名前取得（タイトル表示用）
  const { data: person, error: personErr } = await supabase
    .from("ai_clone_person")
    .select("id, name, company_name, position")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();

  if (personErr || !person) {
    notFound();
  }

  // メモ一覧
  const { data: notesData, error: notesErr } = await supabase
    .from("ai_clone_person_note")
    .select(
      "id, occurred_at, content, challenges, temperature, caveats, next_touch_date, interests",
    )
    .eq("tenant_id", tenant.id)
    .eq("person_id", id)
    .order("occurred_at", { ascending: false });

  const notes = (notesData ?? []) as NoteRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <Link
        href={`/clone/${slug}/people`}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-[#1c3550] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        人物一覧に戻る
      </Link>

      <EditorialHeader
        eyebrow="HUB / PEOPLE"
        title={person.name}
        description={
          [person.company_name, person.position].filter(Boolean).join(" / ") ||
          undefined
        }
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={notes.length} label="メモ" tone="navy" />
            <PersonNoteAddDialog
              slug={slug}
              tenantId={tenant.id}
              personId={person.id}
            />
          </div>
        }
      />

      <PersonTabs slug={slug} personId={person.id} noteCount={notes.length} />

      {notesErr && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            メモの取得に失敗しました：{notesErr.message}
          </p>
        </EditorialCard>
      )}

      {!notesErr && notes.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだメモがありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「メモを追加」から、{person.name}
            さんとのやり取り・気づきを残していきます。
            <br />
            日時と内容だけでもOK。温度感・課題・注意点は後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!notesErr && notes.length > 0 && (
        <ul className="space-y-3">
          {notes.map((n) => {
            const initial = {
              occurred_at: n.occurred_at
                ? new Date(n.occurred_at).toISOString().slice(0, 16)
                : "",
              content: n.content ?? "",
              challenges: n.challenges ?? "",
              temperature: n.temperature ?? "",
              caveats: n.caveats ?? "",
              next_touch_date: n.next_touch_date ?? "",
              interests: n.interests ? n.interests.join(", ") : "",
            };
            const label =
              n.content?.slice(0, 30) || formatDateTime(n.occurred_at);
            return (
              <li key={n.id}>
                <EditorialCard variant="row" className="px-5 py-4 group">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="text-[12px] text-gray-700 tabular-nums">
                    {formatDateTime(n.occurred_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    {n.next_touch_date && (
                      <div className="text-[11px] text-[#8a5a1c] tabular-nums">
                        次の接点：{formatDateOnly(n.next_touch_date)}
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PersonNoteEditDialog
                        slug={slug}
                        tenantId={tenant.id}
                        personId={person.id}
                        noteId={n.id}
                        initial={initial}
                      />
                      <PersonNoteDeleteButton
                        slug={slug}
                        tenantId={tenant.id}
                        personId={person.id}
                        noteId={n.id}
                        label={label}
                      />
                    </div>
                  </div>
                </div>

                {n.content && (
                  <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mb-3">
                    {n.content}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-[12px]">
                  {n.temperature && (
                    <div>
                      <span className="text-gray-400 tracking-wider">温度感: </span>
                      <span className="text-gray-700">{n.temperature}</span>
                    </div>
                  )}
                  {n.challenges && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 tracking-wider">課題: </span>
                      <span className="text-gray-700">{n.challenges}</span>
                    </div>
                  )}
                  {n.caveats && (
                    <div className="sm:col-span-3">
                      <span className="text-gray-400 tracking-wider">注意点: </span>
                      <span className="text-gray-700">{n.caveats}</span>
                    </div>
                  )}
                </div>

                {n.interests && n.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                    {n.interests.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-500 bg-gray-50 border border-gray-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
