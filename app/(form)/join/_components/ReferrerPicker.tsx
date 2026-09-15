"use client";

// 登録フォームの「紹介者（任意）」セクション。
// 2通りで紹介者を指定できる:
//   ① 紹介コードを手入力（invitations.code）
//   ② 既存メンバーを名前で検索して選択
// 選択結果は onChange で親に渡し、親が signUp 成功後に set_my_referrer RPC を呼ぶ。
// referrer_id は保護列なのでここでは DB に書かない（候補選択のみ）。

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, Check, UserPlus, ChevronDown } from "lucide-react";

export interface ReferrerSelection {
  code: string; // 手入力の紹介コード
  memberId: string | null; // 選択した既存メンバー
  memberName: string | null;
}

interface MemberHit {
  id: string;
  name: string;
  nickname: string | null;
}

export function ReferrerPicker({
  initialCode = "",
  onChange,
}: {
  initialCode?: string;
  onChange: (sel: ReferrerSelection) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<MemberHit | null>(null);
  // 任意項目なので既定は閉じておく（フォームの見た目の長さ・威圧感を下げる）
  const [expanded, setExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 親へ通知（code / picked が変わるたび）
  useEffect(() => {
    onChange({
      code: code.trim(),
      memberId: picked?.id ?? null,
      memberName: picked?.name ?? null,
    });
    // onChange は親の都度生成関数なので依存に入れない（無限ループ回避）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, picked]);

  // メンバー名検索（デバウンス）
  useEffect(() => {
    if (picked) return; // 選択済みなら検索しない
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/members/referrer-search?q=${encodeURIComponent(q)}`,
        );
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; members?: MemberHit[] }
          | null;
        setHits(data?.members ?? []);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, picked]);

  const labelCls = "block text-[13px] font-semibold text-gray-700 mb-1.5";
  const inputCls =
    "block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[var(--gia-navy)] focus:ring-1 focus:ring-[var(--gia-navy)]/10";

  // 閉じている時に「設定済み」だと分かるよう、選択中の紹介者名（or コード入力済み）を出す
  const summary = picked
    ? `${picked.name}${picked.nickname ? `（${picked.nickname}）` : ""}`
    : code.trim()
      ? "コードを入力済み"
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3.5">
      {/* ヘッダー（トグル）。任意項目なので既定は閉じておく */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <UserPlus className="w-4 h-4 text-[var(--gia-gold)] flex-shrink-0" />
          <span className="text-[13px] font-semibold text-[var(--gia-navy)] flex-shrink-0">
            紹介者がいる方（任意）
          </span>
          {!expanded && summary && (
            <span className="inline-flex items-center gap-1 text-[12px] text-[var(--gia-teal)] font-medium min-w-0">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{summary}</span>
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="space-y-4 pt-4">
          <p className="text-[12px] text-gray-500 -mt-1">
            紹介してくれた方がいれば、コードを入力するか名前で選んでください。
          </p>

      {/* ① 紹介コード手入力 */}
      <div>
        <label className={labelCls}>紹介コード</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="例: a3k9x2p1"
          autoCapitalize="none"
          autoCorrect="off"
          className={inputCls + " font-mono"}
        />
      </div>

      {/* ② メンバーを名前で検索して選択 */}
      <div>
        <label className={labelCls}>または、名前で探す</label>
        {picked ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--gia-navy)]/20 bg-white px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--gia-navy)] font-medium min-w-0">
              <Check className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
              <span className="truncate">
                {picked.name}
                {picked.nickname ? `（${picked.nickname}）` : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setQuery("");
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0"
              aria-label="選び直す"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="紹介者の名前を2文字以上"
              className={inputCls + " pl-9"}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
            {query.trim().length >= 2 && !searching && hits.length === 0 && (
              <p className="mt-1.5 text-[12px] text-gray-400">
                該当する会員が見つかりません。コードでの入力もできます。
              </p>
            )}
            {hits.length > 0 && (
              <ul className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                {hits.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(m);
                        setHits([]);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {m.name}
                      {m.nickname ? (
                        <span className="text-gray-400 ml-1.5 text-[12px]">
                          {m.nickname}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
