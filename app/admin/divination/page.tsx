"use client";

// /admin/divination — 命式図解（社内鑑定ツール）。
// 五島さん専用。みやこ／アズクリエイトメンバーの陰陽・五行・人体星図を
// その場で確認するための内部ツール。AI Clone のテナント側には出さない。
//
// Phase 1a：データが正しく出るところまで（高尾義政系・3柱まで）。
// Phase 1b：A4 縦の鑑定書レイアウトに整え、html2canvas-pro で PNG 出力できるようにする。
// Phase 2 ：位相法／大運／年運。Phase 3：八門法／数理法。
//
// 認証ガードは proxy.ts → lib/supabase/middleware.ts 側で /admin/* を保護済み。

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImageDown, BookOpen } from "lucide-react";
import { EditorialHeader } from "../_components/EditorialChrome";
import { KanshiSearch } from "./_components/KanshiSearch";
import { BirthForm, type SubjectInput } from "./_components/BirthForm";
import { InyoPanel } from "./_components/InyoPanel";
import { YojoPanel } from "./_components/YojoPanel";
import { KoseishinPanel } from "./_components/KoseishinPanel";
import { TarotPanel, NumerologyPanel, ColorPanel } from "./_components/OtherPanels";
import { DivinationExportDialog } from "./_components/DivinationExportDialog";
import { calculateInyo } from "@/lib/divination/sanmei/inyo";
import { calculateYojo } from "@/lib/divination/sanmei/yojo";
import { calculateKoseishin } from "@/lib/divination/animal/koseishin";
import { calculateTarotBirthday } from "@/lib/divination/tarot/birthday";
import { calculateNumerology } from "@/lib/divination/numerology/birthday";
import { calculateBirthdayColor } from "@/lib/divination/color/birthday";

export default function DivinationPage() {
  // 入力フォーム（手入力のみ）。バリデーションは最低限。
  const [subject, setSubject] = useState<SubjectInput>({
    name: "",
    gender: "未指定",
    year: 1984,
    month: 3,
    day: 29,
    hour: null,
    minute: null,
    birthplace: "",
  });

  // 鑑定済みフラグ。「鑑定する」を押すまでは結果を出さない設計。
  const [submitted, setSubmitted] = useState<SubjectInput | null>(null);

  // PNG出力モーダル（人渡し用にプレビュー → 出力のワンクッション）
  const [exportOpen, setExportOpen] = useState(false);

  // 鑑定結果を入力から導出。
  const result = useMemo(() => {
    if (!submitted) return null;
    const inyo = calculateInyo({
      year: submitted.year,
      month: submitted.month,
      day: submitted.day,
      hour: submitted.hour ?? undefined,
      minute: submitted.minute ?? undefined,
    });
    const yojo = calculateYojo(submitted.year, submitted.month, submitted.day);
    // 個性心理學 5 キャラ。本質=日柱、意思決定=月柱、表面=年柱、隠れ・希望は本質からのオフセット。
    const dayPillar = inyo.pillars.find((p) => p.label === "日柱")!;
    const monthPillar = inyo.pillars.find((p) => p.label === "月柱")!;
    const yearPillar = inyo.pillars.find((p) => p.label === "年柱")!;
    const koseishin = calculateKoseishin(
      dayPillar.kan, dayPillar.shi,
      monthPillar.kan, monthPillar.shi,
      yearPillar.kan, yearPillar.shi,
    );
    const tarot = calculateTarotBirthday({
      year: submitted.year, month: submitted.month, day: submitted.day,
    });
    const num = calculateNumerology({
      year: submitted.year, month: submitted.month, day: submitted.day,
    });
    const color = calculateBirthdayColor({
      year: submitted.year, month: submitted.month, day: submitted.day,
    });
    return { inyo, yojo, koseishin, tarot, num, color };
  }, [submitted]);

  return (
    <div className="px-5 sm:px-8 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
      <EditorialHeader
        eyebrow="GIA / DIVINATION"
        title="命式図解"
        description="社内鑑定用。生年月日から算命学・タロット・数秘・カラーを総合表示。Phase 1a：基本データのみ。"
        right={
          <Link
            href="/admin/divination/glossary"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1c3550]/30 bg-white text-[12px] font-semibold text-[#1c3550] hover:bg-[#1c3550]/5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#c08a3e]" />
            用語解説
          </Link>
        }
      />

      {/* 暦検索（任意の日付の干支＋五行運勢を見る。生年月日があれば個別運勢も出す） */}
      <KanshiSearch
        onPick={({ year, month, day }) =>
          setSubject((s) => ({ ...s, year, month, day }))
        }
        subject={{
          year: subject.year,
          month: subject.month,
          day: subject.day,
          name: subject.name || undefined,
        }}
      />

      {/* 入力フォーム */}
      <BirthForm
        value={subject}
        onChange={setSubject}
        onSubmit={() => setSubmitted({ ...subject })}
      />

      {/* 鑑定結果 */}
      {result && submitted && (
        <>
          {/* エクスポートツールバー — 押すと PNG プレビューモーダルが開く */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#1c3550] text-[#1c3550] text-sm font-semibold rounded hover:bg-[#1c3550]/5"
            >
              <ImageDown className="w-4 h-4" />
              画像化（人渡し用）
            </button>
          </div>

          {/* 通常表示用の鑑定書（読み仮名・通変星行・エネルギー値も全部見える） */}
          <div className="space-y-6 bg-white">
          {/* 鑑定書ヘッダー */}
          <header className="bg-[#1c3550] text-white rounded-md px-6 py-5">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wide">
                {submitted.year}年{submitted.month}月{submitted.day}日生まれ
                {submitted.gender !== "未指定" && (
                  <span className="ml-2 text-[#e8c98a]">（{submitted.gender}）</span>
                )}
                <span className="ml-3 text-base font-normal">命式図解</span>
              </h1>
              <div className="text-[12px] text-[#e8c98a]/80 ml-auto">
                {submitted.name && <span className="mr-3">対象：{submitted.name}</span>}
                {submitted.birthplace && <span>出生地：{submitted.birthplace}</span>}
              </div>
            </div>
          </header>

          {/* 左：陰占 / 右：陽占 の2カラム */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InyoPanel inyo={result.inyo} />
            <YojoPanel yojo={result.yojo} />
          </div>

          {/* 個性心理學（動物占い 5キャラ） */}
          {result.koseishin && <KoseishinPanel characters={result.koseishin} />}

          {/* 補助：タロット / 数秘 / カラー */}
          <TarotPanel tarot={result.tarot} />
          <NumerologyPanel num={result.num} />
          <ColorPanel color={result.color} />

          {/* フッター注釈 */}
          <p className="text-[11px] text-gray-400 text-center pt-2">
            ※ 命式は推定を含みます。詳細な鑑定は専門家にご相談ください。
          </p>
          </div>

          {/* PNG 出力プレビューモーダル — 一旦 陰占＋陽占 のみ */}
          <DivinationExportDialog
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            submitted={submitted}
            inyo={result.inyo}
            yojo={result.yojo}
          />
        </>
      )}

      {!result && (
        <div className="text-center py-12 text-gray-500 text-sm">
          上のフォームに生年月日を入力して「鑑定する」を押してください。
        </div>
      )}
    </div>
  );
}
