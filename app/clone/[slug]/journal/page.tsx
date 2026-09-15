// /clone/[slug]/journal — 振り返り＝日記の月次タイムライン。
//
// 入力導線:
//   * Slack/LINE/Web に「振り返り: ...」と送ると ai_clone_journal に UPSERT される。
//   * 当面、Web からの直接入力 UI は提供しない（Slack 主導の運用）。
//
// 表示:
//   * 月見出し（YYYY年M月）ごとに日付の新しい順でカード。
//   * summary が AI で抽出されていれば見出し下に小さく出す。
//   * 本文（content）は時刻区切り（"--- HH:MM"）が含まれることがある（同日複数回投稿の追記）。
//
// 設計判断:
//   * 件数フィルタや検索は Phase 1 では入れない。月選択は URL ?ym=2026-05 で行う（未指定なら全件）。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { JournalEntryCard } from "./_components/JournalEntryCard";

export const dynamic = "force-dynamic";

interface JournalRow {
  id: string;
  entry_date: string;
  content: string;
  summary: string | null;
  updated_at: string | null;
}

export default async function JournalPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  // ?ym=YYYY-MM で月絞り込み。未指定なら全件（テナントごと、新しい日順）。
  const ymRaw = (sp.ym ?? "").toString();
  const ymMatch = /^(\d{4})-(\d{2})$/.exec(ymRaw);

  let query = supabase
    .from("ai_clone_journal")
    .select("id, entry_date, content, summary, updated_at")
    .eq("tenant_id", tenant.id)
    .order("entry_date", { ascending: false });

  if (ymMatch) {
    const y = Number(ymMatch[1]);
    const m = Number(ymMatch[2]);
    const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    const monthEnd = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
    query = query.gte("entry_date", monthStart).lt("entry_date", monthEnd);
  }

  const { data, error } = await query;
  const rows = (data ?? []) as JournalRow[];

  // 月ごとにグルーピング（新しい日順は維持）
  const monthGroups: { ym: string; label: string; entries: JournalRow[] }[] = [];
  const monthIndex = new Map<string, number>();
  for (const r of rows) {
    const ym = r.entry_date.slice(0, 7);
    let idx = monthIndex.get(ym);
    if (idx === undefined) {
      idx = monthGroups.length;
      monthIndex.set(ym, idx);
      const [y, m] = ym.split("-");
      monthGroups.push({
        ym,
        label: `${y}年${Number(m)}月`,
        entries: [],
      });
    }
    monthGroups[idx].entries.push(r);
  }

  // 上部の「全期間 / 月選択」セレクト用に、全件から月リストも作る
  // （?ym 指定中も他月が出ていないと切り替えできないので、独立クエリで取る）
  const { data: allMonthsData } = await supabase
    .from("ai_clone_journal")
    .select("entry_date")
    .eq("tenant_id", tenant.id)
    .order("entry_date", { ascending: false });
  const allMonthSet = new Set<string>();
  for (const r of (allMonthsData ?? []) as { entry_date: string }[]) {
    allMonthSet.add(r.entry_date.slice(0, 7));
  }
  const allMonths = Array.from(allMonthSet);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="JOURNAL / 日記"
        title="振り返り日記"
        description="Slack/LINE で「振り返り: ...」と送ると、ここに日付ごとの日記として残ります。同じ日に複数回送ると、その日のエントリに時刻区切りで追記されます。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={rows.length} label="日分" tone="navy" />
          </div>
        }
      />

      {allMonths.length > 0 && (
        <nav className="flex flex-wrap items-center gap-2 text-[12px]">
          <a
            href={`/clone/${slug}/journal`}
            className={`px-2.5 py-1 rounded border transition-colors ${
              !ymMatch
                ? "bg-[#1c3550] border-[#1c3550] text-white font-bold"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            全期間
          </a>
          {allMonths.map((ym) => {
            const [y, m] = ym.split("-");
            const active = ymMatch && `${ymMatch[1]}-${ymMatch[2]}` === ym;
            return (
              <a
                key={ym}
                href={`/clone/${slug}/journal?ym=${ym}`}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  active
                    ? "bg-[#1c3550] border-[#1c3550] text-white font-bold"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {y}年{Number(m)}月
              </a>
            );
          })}
        </nav>
      )}

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            日記の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && rows.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ日記がありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            Slack/LINE で「振り返り: 今日は…」と送ると、ここに日付ごとに残っていきます。
            <br />
            同じ日に複数回送れば、そのエントリに時刻付きで追記されます。
          </p>
        </EditorialCard>
      )}

      {!error && monthGroups.map((group) => (
        <section key={group.ym} className="space-y-3">
          <h2 className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold border-b border-gray-200 pb-2">
            {group.label}
          </h2>
          <ul className="space-y-3">
            {group.entries.map((r) => (
              <li key={r.id}>
                <JournalEntryCard
                  slug={slug}
                  tenantId={tenant.id}
                  entryId={r.id}
                  entryDate={r.entry_date}
                  initialContent={r.content}
                  initialSummary={r.summary}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
