// @ts-nocheck
// GIA Executive AI Clone — Admin Dashboard
// 【無効化中】2026-05-14 機能は /clone/<slug> 側に集約済みのためルートを停止。
// 復活させる場合は下記 notFound() を削除する。旧実装はそのまま保持（参照用）。
// notFound() 以降は unreachable のため @ts-nocheck で型チェック対象外にしている。
//
// 旧用途:
//   ① 営業デモ用（顧客にAI Cloneの動きを見せる）
//   ② 月1の経営レビュー用（数字の累積を眺める）

import { notFound } from "next/navigation";
import { getEveningSnapshot } from "@/lib/ai-clone/briefing";
import {
  detectPipelineColumns,
  fetchRecentNotes,
} from "@/lib/ai-clone/notion-db";
import { fetchExecutiveContextWithStatus } from "@/lib/ai-clone/notion";
import {
  MessageCircle,
  UserPlus,
  Briefcase,
  CheckCircle,
  Calendar as CalendarIcon,
  Lightbulb,
  Target,
  Sunrise,
  AlertTriangle,
  Wallet,
  Users,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExecClonePage() {
  // /admin/ai-clone は /clone/<slug> に集約のため無効化（2026-05-14）。
  // 復活させる場合はこの notFound() を削除する。
  notFound();

  // eslint-disable-next-line @typescript-eslint/no-unreachable
  const [snapshot, recentDecisions, contextStatus, pipelineCols] =
    await Promise.all([
      getEveningSnapshot().catch(() => null),
      fetchRecentNotes(7, ["Decision", "Action"], 8).catch(() => []),
      fetchExecutiveContextWithStatus().catch(() => ({
        context: "",
        pages: [],
        source: "fallback" as const,
      })),
      detectPipelineColumns().catch(() => ({
        available: [] as string[],
      })),
    ]);

  if (!snapshot) {
    return (
      <div className="px-6 py-16 max-w-4xl mx-auto text-center">
        <p className="text-sm text-gray-500">
          スナップショットを取得できませんでした。Notion / Calendar の接続設定を確認してください。
        </p>
      </div>
    );
  }

  const p = snapshot.pipeline;
  const k = snapshot.pipelineKPI;

  const calcPct = (cur: number, tgt: number) =>
    tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0;

  const stats = [
    {
      label: "サロン提案",
      value: p.salonProposal.thisMonth,
      target: k.salonProposal,
      pct: calcPct(p.salonProposal.thisMonth, k.salonProposal),
      icon: MessageCircle,
    },
    {
      label: "サロン参加",
      value: p.salonJoin.thisMonth,
      target: k.salonJoin,
      pct: calcPct(p.salonJoin.thisMonth, k.salonJoin),
      icon: UserPlus,
    },
    {
      label: "アプリ商談",
      value: p.appPitch.thisMonth,
      target: k.appPitch,
      pct: calcPct(p.appPitch.thisMonth, k.appPitch),
      icon: Briefcase,
    },
    {
      label: "アプリ受注",
      value: p.appDeal.thisMonth,
      target: k.appDeal,
      pct: calcPct(p.appDeal.thisMonth, k.appDeal),
      icon: CheckCircle,
    },
  ];

  const revenuePct = snapshot.revenueTarget
    ? Math.min(
        100,
        Math.round((p.monthlyRevenue / snapshot.revenueTarget) * 100)
      )
    : 0;
  const monthlyMan = Math.round(p.monthlyRevenue / 10000);
  const targetMan = Math.round(snapshot.revenueTarget / 10000);

  return (
    <div className="px-5 sm:px-8 py-6 sm:py-10 max-w-6xl mx-auto space-y-6">
      {/* ===== Brand Header ===== */}
      <header className="bg-white border border-gray-200 rounded-xl px-6 py-7 sm:px-8 sm:py-8 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute top-0 left-0 h-1 w-24 bg-[#c08a3e]"
        />
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">
            GIA / EXECUTIVE AI CLONE
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-[28px] font-bold tracking-[0.04em] text-[#1c3550] leading-snug">
          CEO専用 経営知能システム
        </h1>
        <p className="text-[13px] sm:text-sm text-gray-600 mt-3 leading-relaxed max-w-2xl">
          Slack・カレンダー・Notion から経営シグナルを自動抽出し、
          <br className="hidden sm:block" />
          意思決定の精度と速度を最大化する。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/ai-clone/tenants"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1c3550] text-[12px] font-medium text-[#1c3550] hover:bg-[#1c3550] hover:text-white tracking-[0.06em] transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            テナント管理
          </Link>
        </div>
      </header>

      {/* ===== Notion Context 取得診断 ===== */}
      {contextStatus.source !== "notion" && (
        <section className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-[12px]">
              <div className="text-rose-900 font-semibold mb-1">
                経営コンテキストはフォールバックを表示中
              </div>
              <p className="text-rose-800 leading-relaxed">
                Notion から1ページも取得できなかったため、ハードコードされた仮データを表示しています。
                {contextStatus.source === "fallback" &&
                  contextStatus.pages.length > 0 && (
                    <>
                      {" "}個別エラーは下のページ一覧を参照してください。
                    </>
                  )}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===== Pipeline column detection 警告（必要な列がヒットしてない時だけ） ===== */}
      {(() => {
        const stages = [
          { key: "proposal" as const, label: "サロン提案系" },
          { key: "join" as const, label: "サロン参加系" },
          { key: "pitch" as const, label: "アプリ商談系" },
          { key: "deal" as const, label: "アプリ受注系" },
        ];
        const missing = stages.filter(
          (s) => !(pipelineCols as any)[s.key]
        );
        if (missing.length === 0 && (pipelineCols as any).proposal) {
          return null;
        }
        if ((pipelineCols.available || []).length === 0) return null;
        return (
          <section className="bg-amber-50/70 border border-amber-200 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-[12px]">
                <div className="text-amber-900 font-semibold mb-1">
                  ファネル列の検出
                </div>
                <ul className="space-y-0.5 text-amber-900">
                  {stages.map((s) => {
                    const detected = (pipelineCols as any)[s.key];
                    return (
                      <li key={s.key}>
                        {detected ? "✓" : "✗"} {s.label}:{" "}
                        <span className="font-mono">
                          {detected || "未検出"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {missing.length > 0 && (
                  <p className="mt-2 text-amber-800">
                    People DBの利用可能カラム:{" "}
                    <span className="font-mono">
                      {pipelineCols.available?.join(" / ")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ===== Stat Cards ===== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-200 rounded-xl px-5 py-5 relative"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                {s.label}
              </span>
              <s.icon className="w-4 h-4 text-[#c08a3e]" />
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="font-serif text-[34px] sm:text-[40px] font-bold text-[#1c3550] leading-none tabular-nums">
                {s.value}
              </span>
              <span className="text-sm text-gray-400 leading-none">
                / {s.target}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-gray-500 tracking-wide">月次KPI</span>
              <span className="text-[#c08a3e] font-semibold tabular-nums">
                {s.pct}%
              </span>
            </div>
            <div className="relative h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1c3550] to-[#c08a3e] rounded-full"
                style={{ width: `${s.pct}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* ===== KPI Reminder ===== */}
      {snapshot.kpi ? (
        <section className="bg-[#1c3550] text-white rounded-xl px-6 py-6 relative overflow-hidden">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-[#c08a3e] mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.3em] text-[#c08a3e] font-semibold mb-3">
                KPI REMINDER
              </div>
              <div className="text-sm leading-relaxed space-y-1">
                {renderKpiContent(snapshot.kpi)}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-amber-50/70 border border-amber-200 rounded-xl px-6 py-4">
          <div className="flex items-start gap-3">
            <Target className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.3em] text-amber-700 font-semibold mb-1">
                KPI REMINDER · 未抽出
              </div>
              <p className="text-[12px] text-amber-900 leading-relaxed">
                経営コンテキスト（Notion）に「KPI」「目標」「月収」「300万」のいずれかを含む見出し（# / ## / ###）を入れると、ここに表示されます。
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===== Monthly Revenue Progress ===== */}
      <section className="bg-white border border-gray-200 rounded-xl px-6 py-6">
        <div className="flex items-start gap-3">
          <Wallet className="w-5 h-5 text-[#c08a3e] mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em] text-gray-500 font-semibold mb-2">
              MONTHLY REVENUE
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-serif text-[32px] font-bold text-[#1c3550] leading-none">
                ¥{monthlyMan}万
              </span>
              <span className="text-sm text-gray-500">
                / 目標 ¥{targetMan}万
              </span>
              <span className="ml-auto text-[#c08a3e] font-semibold tabular-nums">
                {revenuePct}%
              </span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1c3550] to-[#c08a3e] rounded-full transition-all"
                style={{ width: `${revenuePct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Two Columns: Today / Recent Decisions ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Schedule */}
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <CalendarIcon className="w-4 h-4 text-[#1c3550]" />
            <h2 className="font-serif text-[15px] font-semibold tracking-[0.05em] text-gray-900">
              CEOの今日（{snapshot.date}）
            </h2>
          </div>
          {snapshot.todayEvents.length === 0 ? (
            <p className="text-sm text-gray-400">予定なし</p>
          ) : (
            <ul className="space-y-3">
              {snapshot.todayEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="font-mono text-[12px] text-[#c08a3e] font-semibold pt-[1px] tabular-nums">
                    {formatTimeJST(e.start)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 font-medium leading-snug">
                      {e.summary}
                    </div>
                    {e.location && (
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        📍 {e.location}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Decisions */}
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Lightbulb className="w-4 h-4 text-[#1c3550]" />
            <h2 className="font-serif text-[15px] font-semibold tracking-[0.05em] text-gray-900">
              直近の意思決定（過去7日）
            </h2>
          </div>
          {recentDecisions.length === 0 ? (
            <p className="text-sm text-gray-400">記録なし</p>
          ) : (
            <ul className="space-y-3">
              {recentDecisions.map((d) => (
                <li key={d.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-[10px] tracking-[0.15em] font-semibold flex-shrink-0 ${
                        d.kind === "Decision"
                          ? "text-[#c08a3e]"
                          : "text-gray-400"
                      }`}
                    >
                      {d.kind === "Decision" ? "決定" : d.kind === "Action" ? "アクション" : d.kind}
                    </span>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {d.date.slice(5)}
                    </span>
                  </div>
                  <div className="text-gray-900 leading-snug mt-1">
                    {d.title || d.content.slice(0, 80)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ===== Tomorrow's Agenda with Advice ===== */}
      <section className="bg-white border border-gray-200 rounded-xl px-6 py-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <Sunrise className="w-4 h-4 text-[#1c3550]" />
          <h2 className="font-serif text-[15px] font-semibold tracking-[0.05em] text-gray-900">
            明日の予定とアドバイス
          </h2>
        </div>
        {snapshot.tomorrowItems.length === 0 ? (
          <p className="text-sm text-gray-400">明日の予定なし</p>
        ) : (
          <ul className="space-y-5">
            {snapshot.tomorrowItems.map((it) => (
              <li
                key={it.event.id}
                className="border-l-2 border-[#c08a3e] pl-4"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-[12px] text-[#c08a3e] font-semibold tabular-nums">
                    {formatTimeJST(it.event.start)}
                  </span>
                  <span className="text-gray-900 font-medium text-sm leading-snug">
                    {it.event.summary}
                  </span>
                </div>
                {it.event.location && (
                  <div className="text-[11px] text-gray-500 mb-1.5">
                    📍 {it.event.location}
                  </div>
                )}
                {it.pastContext && (
                  <div className="text-[12px] text-gray-500 mb-1.5 whitespace-pre-line leading-relaxed">
                    {it.pastContext}
                  </div>
                )}
                {it.advice && (
                  <div className="text-[12px] text-[#1c3550] bg-amber-50/60 border-l-2 border-amber-300 px-3 py-2 leading-relaxed mt-2">
                    💡 {it.advice}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== Footer micro ===== */}
      <p className="text-[10px] text-gray-400 text-center tracking-wider">
        Generated {snapshot.generatedAt.slice(0, 19).replace("T", " ")} JST
        {" · "}
        Powered by GIA Executive AI Clone
      </p>
    </div>
  );
}

function formatTimeJST(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// KPI 本文（Notionの整形済みMarkdown）をHTMLに描画する。
// - 連続する `| ... |` 行は HTML テーブル化（区切り行 `| --- | --- |` でヘッダ判定）
// - 空行はスペース、それ以外はテキスト行として描画
function renderKpiContent(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  const isTableLine = (s: string) => /^\s*\|.*\|\s*$/.test(s);
  const isSeparatorRow = (cells: string[]) =>
    cells.length > 0 &&
    cells.every((c) => /^[-:]+$/.test(c.replace(/\s/g, "")));

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map((l) =>
        l.split("|").slice(1, -1).map((c) => c.trim())
      );
      let header: string[] | null = null;
      let body: string[][] = [];
      if (rows.length >= 2 && isSeparatorRow(rows[1])) {
        header = rows[0];
        body = rows.slice(2).filter((r) => !isSeparatorRow(r));
      } else {
        body = rows.filter((r) => !isSeparatorRow(r));
      }
      elements.push(
        <div key={key++} className="overflow-x-auto -mx-1 my-2">
          <table className="w-full text-[12px] border-collapse">
            {header && (
              <thead>
                <tr>
                  {header.map((cell, idx) => (
                    <th
                      key={idx}
                      className="text-left px-2 py-1.5 text-[10px] tracking-[0.15em] uppercase text-[#c08a3e] font-semibold border-b border-white/20 align-bottom"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-white/10 last:border-b-0"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-2 py-1.5 align-top text-white/90"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={key++} className="text-[13px] leading-relaxed">
        {line}
      </p>
    );
    i++;
  }

  return elements;
}
