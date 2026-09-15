"use client";

// Core OS 棚卸し（健康診断）。AIの監査結果を表示し、その場で書き直し適用／引退削除できる。
// 書き直し＝該当フィールドを編集→「適用」で保存。引退＝行削除（確認つき）。
// 自動では変更せず、必ず本人の「適用/引退」操作で確定する。

import { useState } from "react";
import {
  Loader2,
  Sparkles,
  Stethoscope,
  Check,
  Trash2,
  Copy,
} from "lucide-react";
import { EditorialCard } from "@/app/admin/_components/EditorialChrome";
import { uiConfirm } from "@/lib/ui-dialog";

interface Finding {
  table: string;
  id: string;
  field: string;
  type: string;
  action: string;
  title: string;
  detail: string;
  suggestion: string;
  sectionLabel: string;
  fieldLabel: string;
  current: string;
  editable: "rewrite" | "retire" | null;
}

const TYPE_LABEL: Record<string, string> = {
  duplicate: "重複",
  contradiction: "矛盾",
  stale: "陳腐化",
  too_abstract: "抽象的すぎ",
  bloat: "肥大",
};
const TYPE_CLASS: Record<string, string> = {
  duplicate: "bg-[#f1f4f7] border-[#d6dde5] text-[#1c3550]",
  contradiction: "bg-[#f3e9e6] border-[#d8c4be] text-[#8a4538]",
  stale: "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]",
  too_abstract: "bg-[#f1f4f7] border-[#d6dde5] text-[#1c3550]",
  bloat: "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]",
};

type RowStatus = "idle" | "saving" | "applied" | "retired" | "error";

export function AuditClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [overall, setOverall] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 各指摘ごとの編集テキスト・状態
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<Record<number, RowStatus>>({});
  const [rowErr, setRowErr] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  const copyCurrent = async (i: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((c) => ({ ...c, [i]: true }));
      setTimeout(() => setCopied((c) => ({ ...c, [i]: false })), 1500);
    } catch {
      /* クリップボード不可環境は無視 */
    }
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    setEdits({});
    setStatus({});
    setRowErr({});
    try {
      const r = await fetch("/api/clone/coreos-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "棚卸しに失敗しました");
      } else {
        setOverall(data.overall ?? "");
        const fs = (data.findings ?? []) as Finding[];
        setFindings(fs);
        const init: Record<number, string> = {};
        fs.forEach((f, i) => {
          if (f.editable === "rewrite") init[i] = f.suggestion || f.current;
        });
        setEdits(init);
      }
    } catch {
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const apply = async (i: number, f: Finding) => {
    setStatus((s) => ({ ...s, [i]: "saving" }));
    setRowErr((e) => ({ ...e, [i]: "" }));
    try {
      const r = await fetch("/api/clone/coreos-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          action: "rewrite",
          table: f.table,
          id: f.id,
          field: f.field,
          value: edits[i] ?? "",
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setStatus((s) => ({ ...s, [i]: "error" }));
        setRowErr((e) => ({ ...e, [i]: data.error ?? "保存に失敗しました" }));
      } else {
        setStatus((s) => ({ ...s, [i]: "applied" }));
      }
    } catch {
      setStatus((s) => ({ ...s, [i]: "error" }));
      setRowErr((e) => ({ ...e, [i]: "通信に失敗しました" }));
    }
  };

  const retire = async (i: number, f: Finding) => {
    const ok = await uiConfirm({
      title: "この項目を削除します",
      message: `元に戻せません。\n\n[${f.sectionLabel}] ${f.title || f.current}`,
      okLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    setStatus((s) => ({ ...s, [i]: "saving" }));
    setRowErr((e) => ({ ...e, [i]: "" }));
    try {
      const r = await fetch("/api/clone/coreos-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: "retire", table: f.table, id: f.id }),
      });
      const data = await r.json();
      if (!r.ok) {
        setStatus((s) => ({ ...s, [i]: "error" }));
        setRowErr((e) => ({ ...e, [i]: data.error ?? "削除に失敗しました" }));
      } else {
        setStatus((s) => ({ ...s, [i]: "retired" }));
      }
    } catch {
      setStatus((s) => ({ ...s, [i]: "error" }));
      setRowErr((e) => ({ ...e, [i]: "通信に失敗しました" }));
    }
  };

  return (
    <div className="space-y-5">
      <EditorialCard className="px-6 py-6">
        <p className="text-[13px] text-gray-600 leading-relaxed mb-4 max-w-2xl [word-break:auto-phrase]">
          AIが今の Core OS を点検し、
          <strong className="text-[#1c3550]">
            重複・矛盾・陳腐化・抽象的すぎ・肥大
          </strong>
          を指摘して直し方を提案します。提案はこの画面でそのまま
          <strong className="text-[#1c3550]">書き直し適用／引退</strong>
          できます（自動では変更しません）。Core OS は小さく鋭く保つほど右腕AIが
          シャープになります。数ヶ月に一度どうぞ。
        </p>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1c3550] text-white text-sm font-semibold py-2.5 px-5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              点検中…（10〜20秒）
            </>
          ) : (
            <>
              <Stethoscope className="w-4 h-4" />
              棚卸しする
            </>
          )}
        </button>
      </EditorialCard>

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">{error}</p>
        </EditorialCard>
      )}

      {overall !== null && (
        <>
          <EditorialCard className="px-6 py-5">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#1c3550] mb-2">
              <Sparkles className="w-4 h-4 text-[#c08a3e]" />
              総評
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{overall}</p>
          </EditorialCard>

          {findings && findings.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                気になる点 {findings.length}件
              </p>
              {findings.map((f, i) => {
                const st = status[i] ?? "idle";
                const done = st === "applied" || st === "retired";
                return (
                  <EditorialCard key={i} variant="row" className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                          TYPE_CLASS[f.type] ??
                          "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                      >
                        {TYPE_LABEL[f.type] ?? f.type}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {f.sectionLabel}
                        {f.fieldLabel ? `／${f.fieldLabel}` : ""}
                      </span>
                      {done && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[#3d6651]">
                          <Check className="w-3.5 h-3.5" />
                          {st === "applied" ? "適用しました" : "削除しました"}
                        </span>
                      )}
                    </div>

                    {f.title && (
                      <p className="text-[13.5px] font-bold text-[#1c3550]">
                        {f.title}
                      </p>
                    )}
                    {f.detail && (
                      <p className="text-[13px] text-gray-600 leading-relaxed mt-1">
                        {f.detail}
                      </p>
                    )}

                    {/* 書き直し（インライン編集→適用） */}
                    {f.editable === "rewrite" && !done && (
                      <div className="mt-3 space-y-2">
                        {f.current && (
                          <div className="text-[12px]">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-gray-400">現状</p>
                              <button
                                type="button"
                                onClick={() => copyCurrent(i, f.current)}
                                className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#1c3550] transition-colors"
                              >
                                {copied[i] ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    コピーしました
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    コピー
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="whitespace-pre-wrap text-gray-600 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                              {f.current}
                            </p>
                          </div>
                        )}
                        <p className="text-[11px] text-gray-400">
                          ↓ 書き直し案（編集して適用できます）
                        </p>
                        <textarea
                          value={edits[i] ?? ""}
                          onChange={(e) =>
                            setEdits((m) => ({ ...m, [i]: e.target.value }))
                          }
                          rows={3}
                          className="w-full rounded-lg border border-[#d6dde5] px-3 py-2 text-[13px] text-[#1c3550] focus:outline-none focus:border-[#1c3550]/50 resize-y"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => apply(i, f)}
                            disabled={st === "saving"}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#1c3550] text-white text-[12px] font-semibold py-1.5 px-3.5 hover:opacity-90 transition-opacity disabled:opacity-60"
                          >
                            {st === "saving" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            この内容で適用
                          </button>
                          {rowErr[i] && (
                            <span className="text-[11px] text-[#8a4538]">
                              {rowErr[i]}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 引退（削除） */}
                    {f.editable === "retire" && !done && (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => retire(i, f)}
                          disabled={st === "saving"}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#d8c4be] text-[#8a4538] text-[12px] font-semibold py-1.5 px-3.5 hover:bg-[#f3e9e6] transition-colors disabled:opacity-60"
                        >
                          {st === "saving" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          この項目を削除
                        </button>
                        {f.suggestion && (
                          <span className="text-[12px] text-gray-500">
                            {f.suggestion}
                          </span>
                        )}
                        {rowErr[i] && (
                          <span className="text-[11px] text-[#8a4538]">
                            {rowErr[i]}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 統合など、インライン適用できない提案は文章だけ */}
                    {!f.editable && f.suggestion && (
                      <p className="text-[13px] text-[#1c3550] leading-relaxed mt-2 bg-[#fafbfc] border border-gray-100 rounded-lg px-3 py-2">
                        💡 {f.suggestion}（この種類は画面では自動適用せず、手動でどうぞ）
                      </p>
                    )}
                  </EditorialCard>
                );
              })}
            </div>
          ) : (
            <EditorialCard className="px-6 py-8 text-center">
              <p className="text-sm text-[#1c3550]">
                大きな問題は見つかりませんでした。今の Core OS は良好です。
              </p>
            </EditorialCard>
          )}
        </>
      )}
    </div>
  );
}
