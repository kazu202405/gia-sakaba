// 紹介設計サマリーカード（マイページ表示用）。
// 役割: マイページから紹介設計（/members/app/worksheet）への入口。
//   - 全体の記入率
//   - 3シートそれぞれの記入率（小さく）
//   - 「設計を始める／編集する」CTA
//   - chat への動線も併設（書いたら相談、の循環を促す）
//
// データソース（Phase B）:
//   referral_worksheets テーブルから親 (mypage page.tsx Server Component) が SSR で
//   loadWorksheet() して、ここに data を props で渡す。
//   再描画はマイページ遷移時のサーバ再 render に依存（編集→戻る で最新が反映）。

import Link from "next/link";
import {
  ClipboardList,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  WORKSHEETS,
  calcProgress,
  calcSheetProgress,
  type WorksheetData,
} from "@/lib/coach/worksheet-schema";

interface Props {
  data: WorksheetData;
  /** サロン本会員（tier='paid'）か。false の場合は紹介コーチ動線を出さない。 */
  isPaid: boolean;
}

export function ReferralDesignCard({ data, isPaid }: Props) {
  const progress = calcProgress(data);
  const isEmpty = progress === 0;
  const isComplete = progress === 1;
  const filledTotal = WORKSHEETS.reduce(
    (acc, ws) => acc + calcSheetProgress(ws.id, data).filled,
    0,
  );
  const grandTotal = WORKSHEETS.reduce((acc, ws) => acc + ws.fields.length, 0);

  return (
    <article className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden">
      {/* 上端の gold アクセント（紹介系であることを示す） */}
      <div className="h-px bg-gradient-to-r from-[var(--gia-gold)]/0 via-[var(--gia-gold)]/45 to-[var(--gia-gold)]/0" />

      <div className="p-6 sm:p-7">
        {/* ─── 上段: 見出し + 記入率バッジ ─────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-[var(--gia-gold)]" aria-hidden />
              <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] uppercase">
                Referral Design
              </p>
            </div>
            <h3
              className="text-[var(--gia-navy)] tracking-[0.02em] leading-snug"
              style={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: "clamp(17px, 2.1vw, 19px)",
                fontWeight: 500,
              }}
            >
              {isEmpty
                ? "あなたの紹介設計を、書きはじめる"
                : isComplete
                  ? "紹介設計、ひととおり書けました"
                  : "あなたの紹介設計"}
            </h3>
          </div>

          {!isEmpty && (
            <div className="flex-shrink-0 text-right">
              <div className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.22em] text-gray-400 uppercase mb-0.5">
                Progress
              </div>
              <div className="text-[var(--gia-navy)] font-bold tabular-nums leading-none">
                <span className="text-[20px]">{Math.round(progress * 100)}</span>
                <span className="text-[12px] ml-0.5">%</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── 説明文 ─────────────────────────────────────── */}
        <p className="text-[13px] text-gray-600 leading-[1.95] mb-5">
          {isEmpty
            ? "見せ方／価値／仕組み化の 3 視点で、自社の紹介設計を 22 項目に書き出します。書いた内容は紹介コーチが読み、あなたの状況に合わせた助言を返します。"
            : isComplete
              ? "見直しはいつでもできます。状況が変われば書き直すと、紹介コーチの助言もそれに合わせて変わります。"
              : "書いた分だけ、紹介コーチの応答が個別化されます。"}
        </p>

        {/* ─── 進捗（既に書きはじめている場合のみ） ─────── */}
        {!isEmpty && (
          <>
            <div className="mb-4">
              <div className="h-1.5 bg-[var(--gia-navy)]/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--gia-teal)] to-[var(--gia-gold)] transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500 tabular-nums">
                {filledTotal} / {grandTotal} 項目
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {WORKSHEETS.map((ws) => {
                const { filled, total } = calcSheetProgress(ws.id, data);
                const done = filled === total;
                return (
                  <div
                    key={ws.id}
                    className="border border-[var(--gia-navy)]/10 rounded-xl p-3 bg-[var(--gia-warm-gray)]/40"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-[family-name:var(--font-en)] text-[9.5px] tracking-[0.18em] text-[var(--gia-gold)] uppercase font-bold">
                        WS{ws.number}
                      </span>
                      {done && (
                        <CheckCircle2
                          className="w-3 h-3 text-[var(--gia-teal)]"
                          aria-label="完了"
                        />
                      )}
                    </div>
                    <p className="text-[11.5px] text-[var(--gia-navy)] font-medium leading-tight mb-1.5">
                      {ws.title}
                    </p>
                    <p className="text-[10.5px] text-gray-500 tabular-nums">
                      {filled} / {total}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ─── CTA ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/members/app/worksheet"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--gia-navy)] text-white text-[13px] font-medium hover:bg-[var(--gia-navy)]/90 transition-colors shadow-sm"
          >
            {isEmpty ? "紹介設計を始める" : "設計を編集する"}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
          {!isEmpty && isPaid && (
            <Link
              href="/members/app/coach"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[var(--gia-navy)]/15 text-[var(--gia-navy)] text-[13px] font-medium hover:border-[var(--gia-navy)]/30 hover:bg-white/70 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--gia-gold)]" aria-hidden />
              紹介コーチに相談する
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
