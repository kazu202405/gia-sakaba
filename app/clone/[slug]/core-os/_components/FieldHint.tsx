"use client";

// フォーム/ダイアログの各項目のラベル直下に置く「💡 ヒントと例」トグル。
// 開くとその項目の書き方ヒントと良い例文をその場に表示する（入力欄の真横で完結＝往復しない）。

import { useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import { getFieldGuide, type SectionKey } from "./sectionGuides";

interface Props {
  section: SectionKey;
  /** DBフィールド名（sectionGuides の fields のキー） */
  field: string;
}

export function FieldHint({ section, field }: Props) {
  const guide = getFieldGuide(section, field);
  const [open, setOpen] = useState(false);

  if (!guide) return null;

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#a9772b] transition-colors hover:text-[#7a5618]"
      >
        <Lightbulb className="h-3 w-3" />
        ヒントと例
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-1 rounded-md border border-[#ecdcb4] bg-[#fbf7ee] px-2.5 py-2 text-[11.5px] leading-relaxed">
          <p className="text-gray-600">{guide.hint}</p>
          <p className="text-gray-800">
            <span className="mr-1 inline-block rounded bg-[#1c3550] px-1 py-0.5 text-[9px] font-bold tracking-wider text-white">
              例
            </span>
            {guide.example}
          </p>
        </div>
      )}
    </div>
  );
}
