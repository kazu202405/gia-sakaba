"use client";

// admin「アンケート」タブ（ログの隣）。
// 売上導線診断（公開ツール /diagnosis）の回答一覧をテーブルで表示する。
// diagnosis_submissions を anon キー＋管理者セッションで読む（RLS: is_admin() で SELECT 許可）。

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard } from "./EditorialChrome";
import { formatDateTime } from "./EditorialFormat";
import { DIMENSIONS } from "@/lib/diagnosis/questions";

interface SurveyRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string | null;
  industry: string | null;
  revenue_range: string | null;
  profit_range: string | null;
  budget_range: string | null;
  total: number;
  grade: string | null;
  bottleneck_key: string | null;
  supply_gate: boolean;
  worry: string | null;
}

const DIM_LABEL: Record<string, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d.title])
);

function gradeChipClass(grade: string | null): string {
  if (grade === "S" || grade === "A")
    return "bg-[#e9efe9] border-[#c5d3c8] text-[#3d6651]";
  if (grade === "B") return "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]";
  return "bg-[#f3e9e6] border-[#d8c4be] text-[#8a4538]";
}

export function SurveysTab() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("diagnosis_submissions")
        .select(
          "id, created_at, name, email, company, industry, revenue_range, profit_range, budget_range, total, grade, bottleneck_key, supply_gate, worry"
        )
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data as SurveyRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-[#8a4538] py-8">
        読み込みに失敗しました：{error}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-10 text-center">
        まだ診断アンケートの回答はありません。
      </p>
    );
  }

  const th = "px-3 py-2.5 text-left font-semibold whitespace-nowrap";
  const td = "px-3 py-2.5 align-top";

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{rows.length}件の回答</p>
      <EditorialCard variant="panel" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-[#1c3550]">
            <thead>
              <tr className="text-[11px] text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className={th}>日時</th>
                <th className={th}>名前</th>
                <th className={th}>会社名</th>
                <th className={th}>メール</th>
                <th className={th}>業種</th>
                <th className={th}>予算</th>
                <th className={th}>総合</th>
                <th className={th}>最大の伸びしろ</th>
                <th className={th}>ひとこと</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 hover:bg-gray-50/70"
                >
                  <td className={`${td} whitespace-nowrap text-gray-500`}>
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className={`${td} font-semibold whitespace-nowrap`}>
                    {r.name}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {r.company || "—"}
                  </td>
                  <td className={`${td} text-gray-600 whitespace-nowrap`}>
                    {r.email}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {r.industry || "—"}
                  </td>
                  <td className={`${td} whitespace-nowrap text-gray-600`}>
                    {r.budget_range || "—"}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${gradeChipClass(
                        r.grade
                      )}`}
                    >
                      {r.grade ?? "—"}・{r.total}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {r.bottleneck_key
                      ? (DIM_LABEL[r.bottleneck_key] ?? r.bottleneck_key)
                      : "—"}
                    {r.supply_gate && (
                      <span className="ml-1 text-[11px] text-[#8a4538]">
                        （供給）
                      </span>
                    )}
                  </td>
                  <td
                    className={`${td} text-gray-600 max-w-[16rem] truncate`}
                    title={r.worry ?? ""}
                  >
                    {r.worry || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EditorialCard>
    </div>
  );
}
