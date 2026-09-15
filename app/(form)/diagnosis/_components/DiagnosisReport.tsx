"use client";

import { useRef, useState } from "react";
import {
  Download,
  Printer,
  RotateCcw,
  Loader2,
  Sparkles,
  MessageCircle,
  AlertTriangle,
  Target,
  CheckCircle2,
  User,
  Users,
  UserPlus,
  MessagesSquare,
  Handshake,
  Repeat,
  Lightbulb,
  Star,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { budgetTactics } from "@/lib/diagnosis/budget";
import type {
  Answers,
  DiagnosisResult,
  DiagnosisReportContent,
  Rank,
} from "@/lib/diagnosis/score";
import type { DimensionKey } from "@/lib/diagnosis/questions";
import { HOST_LINE_URL } from "@/lib/referral-template";
import { RadarChart } from "./RadarChart";

const RANK_RING: Record<Rank, string> = {
  S: "border-emerald-400 text-emerald-600",
  A: "border-emerald-400 text-emerald-600",
  B: "border-[#c08a3e] text-[#c08a3e]",
  C: "border-rose-400 text-rose-600",
};
const RANK_STARS: Record<Rank, number> = { S: 3, A: 3, B: 2, C: 1 };

const RADAR_SHORT: Record<string, string> = {
  awareness: "認知集客",
  capture: "見込み客化",
  meeting: "商談化",
  closing: "成約",
  retention: "継続紹介",
};

const DIM_ICON: Record<DimensionKey, LucideIcon> = {
  awareness: Users,
  capture: UserPlus,
  meeting: MessagesSquare,
  closing: Handshake,
  retention: Repeat,
};

function barColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

// 円形アイコンバッジ
function Badge({ Icon, size = 36 }: { Icon: LucideIcon; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-[#1e3f8f] text-white flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}

function SectionHeader({ Icon, title }: { Icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <Badge Icon={Icon} size={34} />
      <h3 className="font-serif text-lg font-bold text-[#1e3f8f] tracking-[0.03em]">
        {title}
      </h3>
    </div>
  );
}

export function DiagnosisReport({
  result,
  answers,
  name,
  industry,
  budget,
  worry,
  submissionId,
  onRestart,
}: {
  result: DiagnosisResult;
  answers: Answers;
  name: string;
  industry: string;
  budget: string;
  worry: string;
  submissionId: string | null;
  onRestart: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [content, setContent] = useState<DiagnosisReportContent | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await fetch("/api/diagnosis/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: submissionId,
          industry,
          budget,
          worry,
          answers,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.content) setContent(data.content as DiagnosisReportContent);
      }
    } catch {
      /* 失敗時はボタン再表示 */
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = "売上導線診断レポート.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const ring = RANK_RING[result.rank];
  const stars = RANK_STARS[result.rank];
  const strongest = [...result.dimensions].sort(
    (a, b) => b.score - a.score || a.no - b.no
  )[0];
  const budgetPlan = budgetTactics(budget);

  return (
    <div className="[word-break:auto-phrase]">
      {/* ═══ レポート本体（ダウンロード対象・A4想定） ═══ */}
      <div
        ref={sheetRef}
        className="bg-white rounded-2xl border border-gray-200 shadow-[0_2px_16px_rgba(28,53,80,0.06)] p-6 sm:p-9 space-y-7 print:shadow-none print:border-0 print:p-0"
      >
        {/* タイトル */}
        <div className="flex items-center gap-4">
          <span className="w-1.5 h-11 rounded bg-[#1e3f8f]" />
          <div>
            <h2 className="font-serif text-2xl sm:text-[30px] font-bold text-[#1e3f8f] tracking-[0.03em] leading-tight">
              売上導線診断レポート
            </h2>
            <p className="text-[11px] sm:text-[13px] text-gray-500 mt-1">
              {name && (
                <>
                  <span className="font-semibold text-[#1e3f8f]">
                    {name} さま
                  </span>
                  <span className="mx-1.5 text-gray-300">｜</span>
                </>
              )}
              集客・商談・成約・紹介の流れを可視化したレポート
              {industry && <span className="ml-1.5">｜業種：{industry}</span>}
            </p>
          </div>
        </div>

        {/* スコア＋ランク＋サマリー */}
        <div className="rounded-2xl border border-gray-200 bg-[#fafbfc] px-6 py-6 sm:px-8 sm:py-7 break-inside-avoid">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* スコア＋ランク */}
            <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0">
              <div className="flex items-end gap-1">
                <span className="font-serif text-[60px] sm:text-7xl font-bold text-[#1e3f8f] leading-none">
                  {result.total}
                </span>
                <span className="text-sm text-gray-500 mb-2">
                  点<span className="text-gray-400">/100</span>
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 mb-1 tracking-[0.2em]">
                  RANK
                </span>
                <div
                  className={`w-[68px] h-[68px] rounded-full border-[3px] bg-white flex items-center justify-center ${ring}`}
                >
                  <span className="font-serif text-[34px] font-bold leading-none">
                    {result.rank}
                  </span>
                </div>
                <div className="flex gap-0.5 mt-1.5">
                  {[0, 1, 2].map((i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < stars
                          ? "fill-[#c08a3e] text-[#c08a3e]"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* サマリー（判定＋最弱／最強） */}
            <div className="flex-1 w-full border-t border-gray-200 pt-4 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-7">
              <p className="text-[15px] font-bold text-[#1e3f8f] leading-relaxed mb-3">
                {result.rankState}。
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
                  <p className="text-[10px] text-rose-500 font-semibold tracking-wide mb-0.5">
                    最大の伸びしろ
                  </p>
                  <p className="text-[13px] font-bold text-[#1e3f8f]">
                    {result.bottleneck.title}
                    <span className="text-gray-400 font-normal ml-1">
                      {result.bottleneck.score}点
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                  <p className="text-[10px] text-emerald-600 font-semibold tracking-wide mb-0.5">
                    いちばんの強み
                  </p>
                  <p className="text-[13px] font-bold text-[#1e3f8f]">
                    {strongest.title}
                    <span className="text-gray-400 font-normal ml-1">
                      {strongest.score}点
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 項目別スコア（広） ＋ 診断タイプ（狭） */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 p-6 break-inside-avoid">
            <SectionHeader Icon={Target} title="項目別スコア" />
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                {result.dimensions.map((d) => {
                  const isBn = d.key === result.bottleneck.key;
                  return (
                    <div key={d.key} className="flex items-center gap-2.5">
                      <Badge Icon={DIM_ICON[d.key]} size={28} />
                      <span
                        className={`text-[12.5px] w-[5.5rem] flex-shrink-0 ${
                          isBn
                            ? "text-[#c08a3e] font-bold"
                            : "text-[#1e3f8f]"
                        }`}
                      >
                        {d.title}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor(d.score)}`}
                          style={{ width: `${d.score}%` }}
                        />
                      </div>
                      <span className="text-[15px] font-bold text-[#1e3f8f] w-9 text-right">
                        {d.score}
                      </span>
                    </div>
                  );
                })}
              </div>
              <RadarChart
                axes={result.dimensions.map((d) => ({
                  label: RADAR_SHORT[d.key] ?? d.title,
                  score: d.score,
                }))}
                size={300}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 break-inside-avoid">
            <SectionHeader Icon={User} title="診断タイプ" />
            {content ? (
              <>
                <p className="font-serif text-lg font-bold text-[#1e3f8f] leading-snug text-balance mb-2 [word-break:auto-phrase]">
                  {content.type.name}
                </p>
                {content.type.description && (
                  <p className="text-[13px] text-gray-700 leading-relaxed">
                    {content.type.description}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-gray-400 leading-relaxed">
                下の「AIで詳しいレポートを生成」を押すと、あなたの診断タイプが表示されます。
              </p>
            )}
          </div>
        </div>

        {/* 前提フラグ */}
        {(result.pricing.active || result.supply.active) && (
          <div className="space-y-2">
            {result.supply.active && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-gray-700 leading-relaxed">
                  {result.supply.message}
                </p>
              </div>
            )}
            {result.pricing.active && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-gray-700 leading-relaxed">
                  {result.pricing.message}
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI生成セクション or 生成ボタン */}
        {content ? (
          <>
            {/* いま伸ばせるポイント */}
            {content.issues.length > 0 && (
              <div>
                <SectionHeader Icon={TrendingUp} title="いま伸ばせるポイント" />
                <div
                  className={`grid gap-4 ${
                    content.issues.length >= 3
                      ? "md:grid-cols-3"
                      : content.issues.length === 2
                        ? "md:grid-cols-2"
                        : "md:grid-cols-1"
                  }`}
                >
                  {content.issues.map((it, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 p-4 break-inside-avoid">
                      <div className="flex items-start gap-2.5 mb-2">
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1e3f8f] text-white text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <p className="text-[13.5px] font-bold text-[#1e3f8f] leading-snug">
                          {it.title}
                        </p>
                      </div>
                      {it.detail && (
                        <p className="text-[12.5px] text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5">
                          {it.detail}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 優先して取り組むべきこと */}
            {content.steps.length > 0 && (
              <div>
                <SectionHeader Icon={CheckCircle2} title="優先して取り組むべきこと" />
                <div
                  className={`grid gap-4 ${
                    content.steps.length >= 3
                      ? "md:grid-cols-3"
                      : content.steps.length === 2
                        ? "md:grid-cols-2"
                        : "md:grid-cols-1"
                  }`}
                >
                  {content.steps.map((it, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-200 p-4 bg-[#fafbfc] break-inside-avoid"
                    >
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#1e3f8f] text-white text-[10px] font-bold tracking-wider mb-2">
                        STEP{i + 1}
                      </span>
                      <p className="text-[13.5px] font-bold text-[#1e3f8f] leading-snug">
                        {it.title}
                      </p>
                      {it.detail && (
                        <p className="text-[12.5px] text-gray-600 leading-relaxed mt-1.5">
                          {it.detail}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#c08a3e]/50 bg-[#c08a3e]/[0.05] px-5 py-7 text-center">
            <p className="text-sm text-gray-700 mb-3">
              診断タイプ・課題の詳細・改善ステップを、AIがあなた専用に作成します。
            </p>
            <button
              onClick={generate}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3f8f] text-white text-sm font-semibold py-3 px-6 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中…（10秒ほど）
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AIで詳しいレポートを生成
                </>
              )}
            </button>
          </div>
        )}

        {/* おすすめ施策 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-[#c08a3e]" />
            <h3 className="text-[13px] font-bold text-[#1e3f8f]">おすすめ施策</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.recommendedServices.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border border-gray-300 text-[#1e3f8f] bg-white"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c08a3e]" />
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* この予算でできること（予算入力時のみ） */}
        {budgetPlan && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[#c08a3e]" />
              <h3 className="text-[13px] font-bold text-[#1e3f8f]">
                この予算でできること
              </h3>
            </div>
            <p className="text-[12px] text-gray-500 mb-2">{budgetPlan.heading}</p>
            <ul className="space-y-1.5">
              {budgetPlan.items.map((it) => (
                <li
                  key={it}
                  className="flex items-start gap-2 text-[13px] text-[#1e3f8f]"
                >
                  <span aria-hidden className="text-[#c08a3e] mt-0.5 text-[11px]">
                    ◆
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            {budgetPlan.note && (
              <p className="text-[11px] text-gray-400 mt-2">{budgetPlan.note}</p>
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-gray-400 pt-1 leading-relaxed">
          ※ ざっくり推定です。精度より「次の一手を1つに絞る」ための地図として。　GIA／紹介設計研究所
        </p>
      </div>

      {/* ═══ 操作（出力に含めない） ═══ */}
      <div className="print:hidden flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3f8f] text-white text-sm font-semibold py-3.5 px-5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          画像で保存
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#1e3f8f]/20 text-[#1e3f8f] text-sm font-semibold py-3.5 px-5 hover:bg-[#1e3f8f]/[0.04] transition-colors"
        >
          <Printer className="w-4 h-4" />
          印刷 / PDF保存
        </button>
        <button
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-xl text-gray-500 text-sm font-medium py-3.5 px-5 hover:text-[#1e3f8f] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          もう一度
        </button>
      </div>

      {/* 柔らかい紹介導線（レポート外・売り込まない） */}
      <div className="print:hidden mt-5 rounded-2xl border border-[#c08a3e]/30 bg-[#c08a3e]/[0.06] px-5 py-5 text-center">
        <p className="text-sm text-gray-700 leading-relaxed">
          結果は保存しておいてください。もし
          <span className="font-semibold text-[#1e3f8f]">
            「{result.bottleneck.title}」
          </span>
          を伸ばしていきたくなったら、信頼できる専門家や
          <span className="font-semibold text-[#1e3f8f]">
            紹介設計研究所のメンバー
          </span>
          をご紹介します。お気軽にご連絡ください。
        </p>
        <a
          href={HOST_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 mt-4 rounded-xl border border-[#1e3f8f]/20 text-[#1e3f8f] text-sm font-semibold py-3 px-6 hover:bg-[#1e3f8f]/[0.04] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          LINEで相談する
        </a>
      </div>
    </div>
  );
}
