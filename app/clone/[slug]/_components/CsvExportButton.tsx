"use client";

// 一覧データを CSV でダウンロードする汎用ボタン。
//
// 設計:
//   * サーバーコンポーネントから関数 props は渡せないため、各ページ側で
//     headers（列名）と rows（プレーンな2次元配列）を組み立てて渡す。
//   * 現在のフィルタ結果（=ページが描画している rows）をそのまま出力する。
//   * Excel で日本語が文字化けしないよう UTF-8 BOM + CRLF で書き出す。

import { Download } from "lucide-react";

interface Props {
  /** ダウンロードファイル名の接頭辞（例: "people"）。日付が自動付与される。 */
  filename: string;
  headers: string[];
  rows: (string | number | null)[][];
}

// CSV セル 1 個のエスケープ。", カンマ, 改行 を含む場合は "" で囲む。
function escapeCell(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function CsvExportButton({ filename, headers, rows }: Props) {
  const empty = rows.length === 0;

  const handleExport = () => {
    if (empty) return;
    const lines = [headers, ...rows].map((row) =>
      row.map(escapeCell).join(","),
    );
    // Excel 互換：先頭に UTF-8 BOM (U+FEFF)、行区切りは CRLF
    const csv = String.fromCharCode(0xfeff) + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={empty}
      title={empty ? "エクスポートするデータがありません" : `${rows.length} 件を CSV でダウンロード`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      CSV
    </button>
  );
}
