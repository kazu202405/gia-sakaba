// /clone/[slug]/projects/[id]/progress ─ 案件進捗タブ。
// project の存在確認 → 同テナント内の進捗ログを occurred_at desc で表示 + 追加。

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
import { ProjectTabs } from "../_components/ProjectTabs";
import { ProgressLogAddDialog } from "./_components/ProgressLogAddDialog";
import { ProgressLogEditDialog } from "./_components/ProgressLogEditDialog";
import { ProgressLogDeleteButton } from "./_components/ProgressLogDeleteButton";

export const dynamic = "force-dynamic";

interface ProgressRow {
  id: string;
  occurred_at: string;
  content: string | null;
  current_state: string | null;
  challenges: string | null;
  next_action: string | null;
  needs_decision: string | null;
}

export default async function ProjectProgressPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();

  const { data: project, error: projectErr } = await supabase
    .from("ai_clone_project")
    .select("id, name, status")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();

  if (projectErr || !project) {
    notFound();
  }

  const { data: logsData, error: logsErr } = await supabase
    .from("ai_clone_project_progress_log")
    .select(
      "id, occurred_at, content, current_state, challenges, next_action, needs_decision",
    )
    .eq("tenant_id", tenant.id)
    .eq("project_id", id)
    .order("occurred_at", { ascending: false });

  const logs = (logsData ?? []) as ProgressRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <Link
        href={`/clone/${slug}/projects`}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-[#1c3550] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        案件一覧に戻る
      </Link>

      <EditorialHeader
        eyebrow="HUB / PROJECTS"
        title={project.name}
        description={
          project.status ? `ステータス: ${project.status}` : undefined
        }
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={logs.length} label="進捗ログ" tone="navy" />
            <ProgressLogAddDialog
              slug={slug}
              tenantId={tenant.id}
              projectId={project.id}
            />
          </div>
        }
      />

      <ProjectTabs
        slug={slug}
        projectId={project.id}
        progressCount={logs.length}
      />

      {logsErr && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            進捗の取得に失敗しました：{logsErr.message}
          </p>
        </EditorialCard>
      )}

      {!logsErr && logs.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ進捗ログがありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「進捗を記録」から、{project.name}
            の動きを残していきます。
            <br />
            日時と進捗内容だけでもOK。詳細は後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!logsErr && logs.length > 0 && (
        <ul className="space-y-3">
          {logs.map((l) => {
            const initial = {
              occurred_at: l.occurred_at
                ? new Date(l.occurred_at).toISOString().slice(0, 16)
                : "",
              content: l.content ?? "",
              current_state: l.current_state ?? "",
              challenges: l.challenges ?? "",
              next_action: l.next_action ?? "",
              needs_decision: l.needs_decision ?? "",
            };
            const label =
              l.content?.slice(0, 30) || formatDateTime(l.occurred_at);
            return (
              <li key={l.id}>
                <EditorialCard variant="row" className="px-5 py-4 group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-[12px] text-gray-700 tabular-nums">
                    {formatDateTime(l.occurred_at)}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ProgressLogEditDialog
                      slug={slug}
                      tenantId={tenant.id}
                      projectId={project.id}
                      logId={l.id}
                      initial={initial}
                    />
                    <ProgressLogDeleteButton
                      slug={slug}
                      tenantId={tenant.id}
                      projectId={project.id}
                      logId={l.id}
                      label={label}
                    />
                  </div>
                </div>

                {l.content && (
                  <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mb-3">
                    {l.content}
                  </p>
                )}

                <div className="space-y-1.5 text-[12px]">
                  {l.current_state && (
                    <div>
                      <span className="text-gray-400 tracking-wider">現在の状態: </span>
                      <span className="text-gray-700 whitespace-pre-wrap">
                        {l.current_state}
                      </span>
                    </div>
                  )}
                  {l.next_action && (
                    <div>
                      <span className="text-gray-400 tracking-wider">次のアクション: </span>
                      <span className="text-gray-700">{l.next_action}</span>
                    </div>
                  )}
                  {l.challenges && (
                    <div>
                      <span className="text-gray-400 tracking-wider">課題: </span>
                      <span className="text-gray-700 whitespace-pre-wrap">
                        {l.challenges}
                      </span>
                    </div>
                  )}
                  {l.needs_decision && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#fbf3e3] text-[#8a5a1c] border border-[#e6d3a3] mr-2">
                        要判断
                      </span>
                      <span className="text-gray-700 whitespace-pre-wrap">
                        {l.needs_decision}
                      </span>
                    </div>
                  )}
                </div>
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
