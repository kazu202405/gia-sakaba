"use client";

// 紹介元の「検索 + 自由入力」を1つの入力欄でこなすコンポーネント。
//
// 挙動:
//   - input にタイプ → dropdown に候補表示（debounce 250ms）
//   - 候補クリック → "✓ 登録済み" バッジ付きで FK 保存
//   - 何も選ばずに blur or Enter → 自由テキストとして保存
//   - 入力をクリアすると FK / text の両方が null になる
//
// データ:
//   保存ロジックは「リンク済みなら FK のみ、未リンクなら text のみ」の
//   どちらか一方。両方には書き込まない（混乱を避ける）。

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, CheckCircle2 } from "lucide-react";
import {
  searchPeopleInTenant,
  type PersonPickerHit,
} from "../_actions";

interface Props {
  tenantId: string;
  excludeId?: string;
  /** 初期: リンク済みなら person、テキストのみなら text */
  initialLinked: PersonPickerHit | null;
  initialText: string;
  /** 変更通知。リンク確定なら personId、テキストモードなら text */
  onChange: (next: { personId: string | null; text: string }) => void;
  placeholder?: string;
}

export function PersonReferrerInput({
  tenantId, excludeId, initialLinked, initialText, onChange, placeholder,
}: Props) {
  // 表示中の input 値。リンク済みなら person.name、それ以外は text。
  const [value, setValue] = useState(initialLinked?.name ?? initialText);
  const [linked, setLinked] = useState<PersonPickerHit | null>(initialLinked);
  const [hits, setHits] = useState<PersonPickerHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで dropdown を閉じる
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        // 閉じる時点で何も選んでないなら text モードで確定通知
        if (!linked) {
          onChange({ personId: null, text: value.trim() });
        }
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
    // onChange / linked / value は最新の参照を使う（依存に入れると再 bind 多発）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // input 値が変わったら検索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchPeopleInTenant(tenantId, q, excludeId);
      if (res.ok) {
        setHits(res.hits);
        setError(null);
      } else {
        setHits([]);
        setError(res.error);
      }
      setSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, tenantId, excludeId]);

  // 候補選択
  const pickHit = (hit: PersonPickerHit) => {
    setLinked(hit);
    setValue(hit.name);
    setOpen(false);
    onChange({ personId: hit.id, text: "" });
  };

  // input 編集 → リンク済みなら名前と乖離した瞬間リンク解除
  const handleInputChange = (next: string) => {
    setValue(next);
    setOpen(true);
    if (linked && next !== linked.name) {
      setLinked(null);
    }
  };

  // クリア
  const clear = () => {
    setLinked(null);
    setValue("");
    setOpen(false);
    onChange({ personId: null, text: "" });
  };

  // Enter で確定（リンク済みは何もしない、未リンクなら text 確定）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setOpen(false);
      if (!linked) {
        onChange({ personId: null, text: value.trim() });
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const handleBlur = () => {
    // dropdown 内クリックでの blur は外側クリック処理に任せる
    // ここでは何もしない（onClick 検出側で onChange 通知）
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {linked ? (
          <CheckCircle2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3d6651] pointer-events-none" />
        ) : (
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "紹介者の名前（登録済みなら候補から選択）"}
          className={`w-full border rounded pl-8 pr-16 py-2 text-sm bg-white focus:outline-none hover:border-gray-300 transition-colors ${
            linked
              ? "border-[#3d6651]/40 focus:border-[#3d6651]"
              : "border-gray-200 focus:border-[#1c3550]"
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {linked && (
            <span className="text-[10px] tracking-wider text-[#3d6651] font-semibold">
              登録済
            </span>
          )}
          {value.length > 0 && (
            <button
              type="button"
              onClick={clear}
              aria-label="クリア"
              className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {searching && !linked && (
            <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      {open && !linked && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto">
          {hits.length === 0 && !searching && (
            <div className="px-3 py-3 text-[12px] text-gray-500 text-center">
              {value.trim().length === 0
                ? "候補なし"
                : `「${value.trim()}」は未登録 → そのまま Enter / 確定でテキスト保存`}
            </div>
          )}
          {hits.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => pickHit(h)}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1c3550]">{h.name}</span>
                      {h.companyName && (
                        <span className="text-gray-500 text-[12px]">／{h.companyName}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <div className="px-3 py-2 text-[11px] text-[#8a4538] border-t border-gray-100">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
