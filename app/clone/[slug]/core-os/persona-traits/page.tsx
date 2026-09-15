// /clone/[slug]/core-os/persona-traits ─ 09_観察された傾向（クセ）の一覧。
//
// 表示:
//   ?status=candidate | adopted | dismissed のタブで切替（既定は candidate）。
//   各カードは PersonaTraitCardRow（クリックで編集、採択/却下/取消ボタン）。
//
// データ供給元:
//   * Slack で振り返り送信時、AI が抽出した候補が自動で status='candidate' で入る
//     （handleReflection 内で createPersonaTraitCandidate）
//   * このページの「傾向を追加」ボタンで手動入力（即 status='adopted'）

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { PersonaTraitCardRow } from "./_components/PersonaTraitCardRow";
import { PersonaTraitAddDialog } from "./_components/PersonaTraitAddDialog";
import type { PersonaTraitStatus } from "./_actions";

export const dynamic = "force-dynamic";

interface PersonaTraitRow {
  id: string;
  category: string;
  trait: string;
  detail: string | null;
  status: PersonaTraitStatus;
  source_journal_id: string | null;
  adopted_at: string | null;
  created_at: string | null;
}

interface JournalDateRow {
  id: string;
  entry_date: string;
}

const TABS: { value: PersonaTraitStatus; label: string }[] = [
  { value: "candidate", label: "候補" },
  { value: "adopted", label: "採択" },
  { value: "dismissed", label: "却下" },
];

export default async function PersonaTraitsPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { tenant } = await loadTenantOr404(slug);

  const statusRaw = (sp.status ?? "candidate").toString();
  const status: PersonaTraitStatus =
    statusRaw === "adopted" || statusRaw === "dismissed"
      ? statusRaw
      : "candidate";

  const supabase = await createClient();

  // メイン：選択中ステータスのレコード
  const { data: mainData, error } = await supabase
    .from("ai_clone_persona_trait")
    .select(
      "id, category, trait, detail, status, source_journal_id, adopted_at, created_at",
    )
    .eq("tenant_id", tenant.id)
    .eq("status", status)
    .order("created_at", { ascending: false });

  // タブごとの件数バッジ
  const { data: countData } = await supabase
    .from("ai_clone_persona_trait")
    .select("status")
    .eq("tenant_id", tenant.id);
  const tabCounts: Record<PersonaTraitStatus, number> = {
    candidate: 0, adopted: 0, dismissed: 0,
  };
  for (const r of (countData ?? []) as { status: PersonaTraitStatus }[]) {
    if (r.status in tabCounts) tabCounts[r.status]++;
  }

  const rows = (mainData ?? []) as PersonaTraitRow[];

  // source_journal_id → entry_date を一括解決（表示用）
  const journalIds = Array.from(
    new Set(rows.map((r) => r.source_journal_id).filter((v): v is string => !!v)),
  );
  let journalDateById = new Map<string, string>();
  if (journalIds.length > 0) {
    const { data: journalRows } = await supabase
      .from("ai_clone_journal")
      .select("id, entry_date")
      .eq("tenant_id", tenant.id)
      .in("id", journalIds);
    journalDateById = new Map(
      ((journalRows ?? []) as JournalDateRow[]).map((j) => [j.id, j.entry_date]),
    );
  }

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="観察された傾向"
        description="振り返りから滲み出る「あなたはこういう人」を AI が拾い、採択されたものが 右腕AI の応答トーンに反映される。"
        right={
          <div className="flex items-center gap-2">
            {tabCounts.candidate > 0 && (
              <MetricChip count={tabCounts.candidate} label="候補" tone="gold" />
            )}
            <MetricChip count={tabCounts.adopted} label="採択" tone="navy" />
            <PersonaTraitAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <CoreOsNav slug={slug} />

      <nav className="flex items-center gap-2 text-[12px]">
        {TABS.map((t) => {
          const active = status === t.value;
          const count = tabCounts[t.value];
          return (
            <a
              key={t.value}
              href={`/clone/${slug}/core-os/persona-traits?status=${t.value}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border transition-colors ${
                active
                  ? "bg-[#1c3550] border-[#1c3550] text-white font-bold"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`tabular-nums text-[10px] ${
                  active ? "text-white/80" : "text-gray-400"
                }`}
              >
                {count}
              </span>
            </a>
          );
        })}
      </nav>

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && rows.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            {status === "candidate" && "まだ候補がありません"}
            {status === "adopted" && "まだ採択された傾向がありません"}
            {status === "dismissed" && "却下された傾向はありません"}
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            {status === "candidate" && (
              <>
                Slack で「振り返り: ...」と送ると、AI が「あなたはこういう人かも」を最大 2 件抽出して候補として並べます。
                <br />
                右上の「傾向を追加」から自分で書くこともできます（即採択扱い）。
              </>
            )}
            {status === "adopted" && (
              <>
                候補タブで「採択」を押すと、ここに移ります。
                <br />
                採択された傾向は 右腕AI のシステムプロンプトに毎回注入され、応答のトーン・判断のクセに反映されます。
              </>
            )}
            {status === "dismissed" && (
              <>
                候補タブで「却下」を押した傾向がここに溜まります。
                <br />
                却下取消で候補に戻せます。
              </>
            )}
          </p>
        </EditorialCard>
      )}

      {!error && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <PersonaTraitCardRow
                slug={slug}
                tenantId={tenant.id}
                traitId={r.id}
                category={r.category}
                trait={r.trait}
                detail={r.detail}
                status={r.status}
                sourceJournalDate={
                  r.source_journal_id
                    ? journalDateById.get(r.source_journal_id) ?? null
                    : null
                }
                adoptedAt={r.adopted_at}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
