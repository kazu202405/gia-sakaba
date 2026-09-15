"use client";

// /admin/divination 鑑定対象フォームの「お名前」入力。
// テナント内（goshima 既定）の人物を検索し、選択するとフォーム全体を
// autofill する。何も選ばずに入力した場合はそのまま新規鑑定として扱う。
//
// 挙動:
//   - 入力 → 250ms debounce で検索
//   - 候補クリック → onPick(person) で親の subject を全部上書き
//   - 候補を選んだあとに名前を編集 → 「✓ 登録済み」バッジは消える（FK 解除扱い）
//   - × クリックで名前クリア
//
// データ:
//   検索ヒットは生年月日・性別・出生時刻・出生地まで返ってくる前提
//   （migration 0027 で追加済）。

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, CheckCircle2 } from "lucide-react";
import {
  searchPeopleForDivination,
} from "../_actions";
import {
  DEFAULT_DIVINATION_TENANT_SLUG,
  type PersonSearchHit,
} from "../_save-shared";

interface Props {
  /** 親が持つ名前文字列。input の controlled value。 */
  name: string;
  /** 名前テキスト変更時。FK 紐付けはしない単純更新。 */
  onNameChange: (next: string) => void;
  /** 候補から選択された時。親はこれで gender/year/... を一括上書きする。 */
  onPick: (person: PersonSearchHit) => void;
  /** 既に親で選択済みの人物 ID（一致なら「✓ 登録済み」バッジ表示） */
  linkedPersonId?: string | null;
  /** 検索するテナント。デフォルト goshima。 */
  tenantSlug?: string;
  placeholder?: string;
}

export function SubjectPicker({
  name, onNameChange, onPick, linkedPersonId, tenantSlug, placeholder,
}: Props) {
  const slug = tenantSlug ?? DEFAULT_DIVINATION_TENANT_SLUG;
  const [hits, setHits] = useState<PersonSearchHit[]>([]);
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
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // クエリ変更で検索（空入力なら全件 20 まで）。
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchPeopleForDivination(slug, name);
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
  }, [name, slug]);

  const pick = (hit: PersonSearchHit) => {
    onPick(hit);
    setOpen(false);
  };

  const clear = () => {
    onNameChange("");
    setOpen(false);
  };

  const linked = Boolean(linkedPersonId);

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
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={placeholder ?? "クリックで候補表示 / 入力で絞り込み"}
          className={`w-full border rounded pl-8 pr-16 py-1.5 text-sm bg-white focus:outline-none hover:border-gray-300 transition-colors ${
            linked
              ? "border-[#3d6651]/40 focus:border-[#3d6651]"
              : "border-gray-300 focus:border-[#1c3550]"
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {linked && (
            <span className="text-[10px] tracking-wider text-[#3d6651] font-semibold">
              登録済
            </span>
          )}
          {name.length > 0 && (
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
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto">
          {hits.length === 0 && !searching && (
            <div className="px-3 py-3 text-[12px] text-gray-500 text-center">
              {name.trim().length === 0
                ? "候補なし（テナント内に人物が登録されていません）"
                : `「${name.trim()}」に一致する人物はいません。そのまま新規入力でOK`}
            </div>
          )}
          {hits.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => pick(h)}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1c3550]">{h.name}</span>
                      {h.companyName && (
                        <span className="text-gray-500 text-[12px]">／{h.companyName}</span>
                      )}
                      {h.birthday && (
                        <span className="ml-auto text-[11px] text-gray-500 font-mono">
                          {h.birthday}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p className="text-[11px] text-[#8a4538] mt-1">{error}</p>
      )}
    </div>
  );
}
