"use client";

// 関心ごとタグの chip 入力コンポーネント。
// 既存タグを × 付きの chip で表示、下の input で Enter（または「、」）
// 押下で配列に追加。Backspace 空入力で末尾削除。
//
// 用途:
//   PersonEditDialog / PersonAddDialog の関心ごと欄。
//   AI Clone Tool calling 経由で蓄積されたタグも UI から触れるようにする。

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function InterestsInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (t.length === 0) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter / 「、」/ Tab で確定
    if (e.key === "Enter" || e.key === "Tab" || e.key === "、" || e.key === ",") {
      if (draft.trim().length > 0) {
        e.preventDefault();
        addTag(draft);
      }
    }
    // 空入力での Backspace で末尾を削除
    if (e.key === "Backspace" && draft.length === 0 && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    }
  };

  const handleBlur = () => {
    // フォーカス外でも未確定文字列を救う
    if (draft.trim().length > 0) addTag(draft);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border border-gray-200 rounded px-2 py-1.5 bg-white focus-within:border-[#1c3550] focus-within:ring-1 focus-within:ring-[#1c3550]/10 transition-colors">
      {value.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1c3550]/5 border border-[#1c3550]/20 rounded text-[12px] text-[#1c3550]"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(idx)}
            aria-label={`${tag} を削除`}
            className="p-0.5 -mr-0.5 rounded hover:bg-[#1c3550]/10 text-gray-500 hover:text-[#1c3550]"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? (placeholder ?? "Enter で追加") : ""}
        className="flex-1 min-w-[8rem] py-0.5 text-sm bg-transparent border-0 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}
