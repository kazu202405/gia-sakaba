"use client";

// ダッシュボードタブ。
// 経営判断軸ノート上の数字（売上に近い順）に紐付く形で、
// 申込→承認→参加の漏斗と、紹介経路の Top を可視化する。
//
// 実装方針:
//   - グラフは SVG / div 自前で（recharts 等の依存追加はしない）
//   - 集計は client 側 in-memory（mock first 段階で十分）
//   - 月次は過去6ヶ月。日次は本日のみ簡易表示。

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard } from "./EditorialChrome";
import { formatDate } from "./EditorialFormat";

interface AggregateData {
  totalApplications: number;
  pending: number;
  approved: number;
  rejected: number;
  todayApplications: number;
  todayApprovals: number;
  monthlyApplications: { ym: string; count: number }[]; // 過去6ヶ月（ym = "YYYY-MM"）
  perSeminar: {
    id: string;
    title: string;
    date: string;
    applied: number;
    approved: number;
    rejected: number;
  }[];
  topReferrers: { name: string; count: number }[];
}

export function DashboardTab() {
  const supabase = useMemo(() => createClient(), []);

  const [data, setData] = useState<AggregateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const { data: rows, error: e1 } = await supabase
        .from("event_attendees")
        .select(
          `
          id, status, applied_at, approved_at, rejected_at,
          seminar:seminars(id, title, date),
          applicant:applicants!inner(referrer_name)
        `
        );

      if (cancelled) return;

      if (e1) {
        setError(e1.message);
        setLoading(false);
        return;
      }

      const list = (rows ?? []).map((r: unknown) => {
        const row = r as Record<string, unknown>;
        const seminar = Array.isArray(row.seminar)
          ? (row.seminar[0] ?? null)
          : (row.seminar ?? null);
        const applicant = Array.isArray(row.applicant)
          ? (row.applicant[0] ?? null)
          : (row.applicant ?? null);
        return {
          status: row.status as string,
          applied_at: row.applied_at as string,
          approved_at: (row.approved_at as string | null) ?? null,
          rejected_at: (row.rejected_at as string | null) ?? null,
          seminar: seminar as { id: string; title: string; date: string } | null,
          referrer_name:
            (applicant as { referrer_name: string | null } | null)
              ?.referrer_name ?? null,
        };
      });

      const today = new Date().toISOString().slice(0, 10);
      const totalApplications = list.length;
      const pending = list.filter((r) => r.status === "pending").length;
      const approved = list.filter((r) => r.status === "approved").length;
      const rejected = list.filter((r) => r.status === "rejected").length;
      const todayApplications = list.filter((r) =>
        (r.applied_at ?? "").startsWith(today)
      ).length;
      const todayApprovals = list.filter((r) =>
        (r.approved_at ?? "").startsWith(today)
      ).length;

      // 月次集計
      const monthMap = new Map<string, number>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, 0);
      }
      list.forEach((r) => {
        if (!r.applied_at) return;
        const ym = r.applied_at.slice(0, 7);
        if (monthMap.has(ym)) {
          monthMap.set(ym, (monthMap.get(ym) ?? 0) + 1);
        }
      });
      const monthlyApplications = Array.from(monthMap.entries()).map(
        ([ym, count]) => ({ ym, count })
      );

      // セミナー別
      const semMap = new Map<
        string,
        {
          id: string;
          title: string;
          date: string;
          applied: number;
          approved: number;
          rejected: number;
        }
      >();
      list.forEach((r) => {
        if (!r.seminar) return;
        const key = r.seminar.id;
        const cur = semMap.get(key) ?? {
          id: r.seminar.id,
          title: r.seminar.title,
          date: r.seminar.date,
          applied: 0,
          approved: 0,
          rejected: 0,
        };
        cur.applied += 1;
        if (r.status === "approved") cur.approved += 1;
        if (r.status === "rejected") cur.rejected += 1;
        semMap.set(key, cur);
      });
      const perSeminar = Array.from(semMap.values()).sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      );

      // 紹介者 Top 5（referrer_name の自由入力ベース）
      const refMap = new Map<string, number>();
      list.forEach((r) => {
        if (!r.referrer_name || r.referrer_name.trim().length === 0) return;
        const key = r.referrer_name.trim();
        refMap.set(key, (refMap.get(key) ?? 0) + 1);
      });
      const topReferrers = Array.from(refMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setData({
        totalApplications,
        pending,
        approved,
        rejected,
        todayApplications,
        todayApprovals,
        monthlyApplications,
        perSeminar,
        topReferrers,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (loading) {
    return (
      <EditorialCard className="text-center py-16">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-400">集計中...</p>
      </EditorialCard>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold">集計エラー</p>
          <p className="mt-0.5 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const monthlyMax = Math.max(1, ...data.monthlyApplications.map((m) => m.count));
  const refMax = Math.max(1, ...data.topReferrers.map((r) => r.count));

  return (
    <div className="space-y-6">
      {/* スナップショット */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "全申込", count: data.totalApplications },
          { label: "本日の申込", count: data.todayApplications },
          { label: "本日の承認", count: data.todayApprovals },
          { label: "審査中", count: data.pending },
        ].map((s) => (
          <EditorialCard key={s.label} className="p-4">
            <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase block mb-1">
              {s.label}
            </span>
            <p className="font-serif text-3xl font-bold text-[#1c3550] tracking-tight">
              {s.count}
            </p>
          </EditorialCard>
        ))}
      </div>

      {/* 月次推移 */}
      <EditorialCard className="p-5 sm:p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-serif text-base font-bold text-[#1c3550] tracking-[0.04em]">
            月次申込推移（過去6ヶ月）
          </h3>
          <span className="text-[10px] tracking-[0.25em] text-gray-400 uppercase">
            Monthly Applications
          </span>
        </div>
        <div className="flex items-end gap-3 sm:gap-4 h-40">
          {data.monthlyApplications.map((m) => {
            const heightPct = (m.count / monthlyMax) * 100;
            const month = m.ym.slice(5);
            return (
              <div key={m.ym} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-semibold text-[#1c3550]">
                  {m.count}
                </div>
                <div className="w-full bg-gray-50 rounded-sm relative" style={{ height: "100%" }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#1c3550] rounded-sm transition-all"
                    style={{ height: `${heightPct}%`, minHeight: m.count > 0 ? "2px" : "0" }}
                  />
                </div>
                <div className="text-[10px] text-gray-500">{month}月</div>
              </div>
            );
          })}
        </div>
      </EditorialCard>

      {/* セミナー別 + 紹介者 Top 5 を 2カラム */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* セミナー別 */}
        <EditorialCard className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-base font-bold text-[#1c3550] tracking-[0.04em]">
              セミナー別 申込状況
            </h3>
            <span className="text-[10px] tracking-[0.25em] text-gray-400 uppercase">
              Per Seminar
            </span>
          </div>
          <div className="space-y-3">
            {data.perSeminar.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                まだ申込のあるセミナーがありません
              </p>
            )}
            {data.perSeminar.map((s) => {
              const total = s.applied;
              const apprPct = total > 0 ? (s.approved / total) * 100 : 0;
              const rejPct = total > 0 ? (s.rejected / total) * 100 : 0;
              const pendPct = 100 - apprPct - rejPct;
              return (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm text-[#1c3550] font-semibold truncate flex-1 min-w-0">
                      {formatDate(s.date)}　{s.title}
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0">
                      <span className="text-[#3d6651] font-bold">{s.approved}</span>
                      <span className="mx-1 text-gray-300">/</span>
                      <span>{s.applied}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#3d6651]"
                      style={{ width: `${apprPct}%` }}
                    />
                    <div
                      className="bg-[#c08a3e]"
                      style={{ width: `${pendPct}%` }}
                    />
                    <div
                      className="bg-[#8a4538]"
                      style={{ width: `${rejPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {data.perSeminar.length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#3d6651]" />
                承認
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#c08a3e]" />
                審査中
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#8a4538]" />
                却下
              </span>
            </div>
          )}
        </EditorialCard>

        {/* 紹介者 Top 5 */}
        <EditorialCard className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-base font-bold text-[#1c3550] tracking-[0.04em]">
              紹介者 Top 5
            </h3>
            <span className="text-[10px] tracking-[0.25em] text-gray-400 uppercase">
              Top Referrers
            </span>
          </div>
          <div className="space-y-3">
            {data.topReferrers.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                まだ紹介経路の集計データがありません
              </p>
            )}
            {data.topReferrers.map((r, i) => {
              const widthPct = (r.count / refMax) * 100;
              return (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-serif text-sm font-bold text-[#c08a3e] tracking-tight w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm text-[#1c3550] truncate">
                        {r.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {r.count}件
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="bg-[#c08a3e] h-full rounded-full"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </EditorialCard>
      </div>
    </div>
  );
}
