"use client";

// 鑑定書 PNG 出力（人渡し用）のプレビュー＆ダウンロードダイアログ。
//
// 設計:
//   - 即出力だと「読み仮名／通変星行／エネルギー値」など社内向け情報が
//     残ったまま人に渡してしまうリスクがあるため、ワンクッション挟む。
//   - モーダル内では同じ6パネルを `.print-sheet` ラッパーで描画する。
//     ラッパー内の `.print-hide` 要素は globals.css により display:none。
//   - 「画像でダウンロード」を押した時点で内部 sheet ref を
//     html2canvas-pro で PNG 化してダウンロード。
//
// 注意:
//   - html2canvas-pro は display:none 要素を含めないので、print-hide
//     クラスで隠した要素は PNG にも残らない。

import { useEffect, useRef, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { InyoPanel } from "./InyoPanel";
import { YojoPanel } from "./YojoPanel";
import type { SubjectInput } from "./BirthForm";
import { uiToast } from "@/lib/ui-dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  submitted: SubjectInput;
  inyo: React.ComponentProps<typeof InyoPanel>["inyo"];
  yojo: React.ComponentProps<typeof YojoPanel>["yojo"];
}

export function DivinationExportDialog({
  open, onClose, submitted, inyo, yojo,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // ESC / 背景クリックで閉じる + body スクロール固定
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !exporting) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, exporting, onClose]);

  if (!open) return null;

  const handleExport = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const yyyymmdd =
        `${submitted.year}${String(submitted.month).padStart(2, "0")}${String(submitted.day).padStart(2, "0")}`;
      const safeName = (submitted.name || "untitled").replace(/[\\/:*?"<>|]/g, "_");
      const link = document.createElement("a");
      link.download = `${safeName}_命式図解_${yyyymmdd}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG エクスポート失敗:", err);
      uiToast("画像を作成できませんでした（詳細はコンソール）", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !exporting && onClose()}
        aria-hidden
      />
      <div className="relative bg-white rounded-md shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-[#c08a3e] font-semibold">
              EXPORT / 人渡し用 PNG プレビュー
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1c3550] mt-0.5">
              この内容で画像出力されます
            </h3>
          </div>
          <button
            type="button"
            onClick={() => !exporting && onClose()}
            aria-label="閉じる"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            disabled={exporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 説明バー */}
        <div className="px-5 py-2.5 bg-[#fafbfc] border-b border-gray-200 text-[11px] text-gray-600 leading-relaxed">
          <span className="text-gray-400 mr-1.5">非表示：</span>
          読み仮名・五行属性・通変星・十二運星 ／ 日柱〜年柱カード・天中殺・五行の「欠」 ／ 陽占のエネルギー値・解説一式
          <span className="text-gray-400 ml-2">（5主星の下には 親・目上 / 家庭 / 本質 / 社会 / 目下・子供 のラベルを表示）</span>
        </div>

        {/* プレビュー領域（実際にPNG化される DOM） */}
        <div className="overflow-y-auto flex-1 min-h-0 bg-[#f5f5f3] p-4 sm:p-6">
          <div ref={sheetRef} className="print-sheet space-y-6 bg-white p-4 sm:p-6 rounded-md shadow-sm">
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

            {/* 陰占 / 陽占（人渡し用は一旦この2つだけ。
                 個性心理學・タロット・数秘・カラーは含めない方針） */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InyoPanel inyo={inyo} />
              <YojoPanel yojo={yojo} />
            </div>

            <p className="text-[11px] text-gray-400 text-center pt-2">
              ※ 命式は推定を含みます。詳細な鑑定は専門家にご相談ください。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => !exporting && onClose()}
            disabled={exporting}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 px-2 py-1"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#1c3550] text-white text-sm font-semibold rounded hover:bg-[#142640] disabled:opacity-60 disabled:cursor-wait"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                画像を生成中…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                画像でダウンロード
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
