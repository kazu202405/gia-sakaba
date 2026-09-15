"use client";

// 鑑定フォームの入力を /clone/<slug>/people に保存するためのダイアログ。
//
// マルチテナント対応:
//   ログインユーザーが member の全テナントを列挙し、保存先をドロップダウンで選ぶ。
//   既定は "goshima"（五島さんの主用途。なければ先頭テナント）。
//   テナントを切り替えると検索結果は当該テナント内で再取得し、選択は解除される。
//
// 同名重複の扱い:
//   入力名で部分一致検索 → ヒットを選んで「この人を更新」（name も上書き）。
//   何も選ばずに「新規作成」を押せば、同名がいても別レコードを作る。

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Loader2, Search, CheckCircle2, AlertCircle, UserPlus, RefreshCw, Building2 } from "lucide-react";
import {
  searchPeopleForDivination,
  savePersonFromDivination,
  listAccessibleDivinationTenants,
} from "../_actions";
import {
  DEFAULT_DIVINATION_TENANT_SLUG,
  type PersonSearchHit,
  type DivinationSavePayload,
  type AccessibleTenant,
} from "../_save-shared";
import type { SubjectInput } from "./BirthForm";

interface Props {
  open: boolean;
  onClose: () => void;
  subject: SubjectInput;
  /** 保存成功時に親に通知（トースト表示用） */
  onSaved?: (msg: string) => void;
}

export function DivinationSaveDialog({ open, onClose, subject, onSaved }: Props) {
  const [tenants, setTenants] = useState<AccessibleTenant[] | null>(null);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string>(DEFAULT_DIVINATION_TENANT_SLUG);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PersonSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 開いたタイミングで初期化（フォーム名前を検索クエリに、テナント一覧を取得）
  useEffect(() => {
    if (!open) return;
    setQuery(subject.name.trim());
    setSelectedId(null);
    setError(null);
    setTenantsError(null);

    // テナント一覧を取得（毎回。所属変更を取りこぼさないため）
    void (async () => {
      const res = await listAccessibleDivinationTenants();
      if (!res.ok) {
        setTenants([]);
        setTenantsError(res.error);
        return;
      }
      setTenants(res.tenants);
      // 既定は goshima、なければ先頭。直前の選択が一覧に残っていればそれを維持。
      setTenantSlug((current) => {
        if (res.tenants.some((t) => t.slug === current)) return current;
        const goshima = res.tenants.find((t) => t.slug === DEFAULT_DIVINATION_TENANT_SLUG);
        return goshima?.slug ?? res.tenants[0]?.slug ?? DEFAULT_DIVINATION_TENANT_SLUG;
      });
    })();
  }, [open, subject.name]);

  // クエリ／テナント変更で 250ms debounce 検索
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length === 0) {
      setHits([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchPeopleForDivination(tenantSlug, q);
      if (res.ok) {
        setHits(res.hits);
      } else {
        setHits([]);
        setError(res.error);
      }
      setSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tenantSlug, open]);

  // ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  const nameTrimmed = subject.name.trim();
  const canSave = nameTrimmed.length > 0 && tenants !== null && tenants.length > 0;

  const payload: DivinationSavePayload = {
    name: nameTrimmed,
    gender: subject.gender,
    year: subject.year,
    month: subject.month,
    day: subject.day,
    hour: subject.hour,
    minute: subject.minute,
    birthplace: subject.birthplace,
  };

  const submit = (personId: string | null) => {
    if (!canSave) {
      setError("お名前と保存先テナントを確認してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await savePersonFromDivination(tenantSlug, personId, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const verb = res.mode === "update" ? "更新しました" : "新規登録しました";
      onSaved?.(`${nameTrimmed} を /clone/${res.tenantSlug}/people に${verb}`);
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !pending && onClose()}
        aria-hidden
      />
      <div className="relative bg-white rounded-md shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-[#c08a3e] font-semibold">
              SAVE TO PEOPLE
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1c3550] mt-0.5">
              人物に保存
            </h3>
          </div>
          <button
            type="button"
            onClick={() => !pending && onClose()}
            aria-label="閉じる"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            disabled={pending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 保存内容プレビュー */}
        <div className="px-5 py-3 bg-[#fafbfc] border-b border-gray-200 text-[12px] text-gray-700">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <span className="text-gray-500">お名前：</span>
              <span className="font-semibold text-[#1c3550]">{nameTrimmed || "（未入力）"}</span>
            </div>
            <div>
              <span className="text-gray-500">性別：</span>
              {subject.gender}
            </div>
            <div>
              <span className="text-gray-500">生年月日：</span>
              {subject.year}/{subject.month}/{subject.day}
            </div>
            <div>
              <span className="text-gray-500">出生時刻：</span>
              {subject.hour !== null
                ? `${String(subject.hour).padStart(2, "0")}:${String(subject.minute ?? 0).padStart(2, "0")}`
                : "未指定"}
            </div>
            {subject.birthplace && (
              <div className="col-span-2">
                <span className="text-gray-500">出生地：</span>
                {subject.birthplace}
              </div>
            )}
          </div>
        </div>

        {/* テナント選択 + 検索 */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {/* 保存先テナント */}
          <div>
            <label className="block text-[10px] tracking-[0.25em] text-gray-500 font-semibold mb-1.5">
              TARGET TENANT / 保存先テナント
            </label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={tenantSlug}
                onChange={(e) => {
                  setTenantSlug(e.target.value);
                  setSelectedId(null);
                  setError(null);
                }}
                disabled={tenants === null || tenants.length === 0 || pending}
                className="w-full border border-gray-300 rounded pl-8 pr-2.5 py-1.5 text-sm bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                {tenants === null && <option>読み込み中…</option>}
                {tenants !== null && tenants.length === 0 && (
                  <option>所属テナントがありません</option>
                )}
                {tenants?.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}（/clone/{t.slug}）
                  </option>
                ))}
              </select>
            </div>
            {tenantsError && (
              <p className="text-[11px] text-[#8a4538] mt-1">{tenantsError}</p>
            )}
          </div>

          {/* 既存の人物検索 */}
          <div>
            <label className="block text-[10px] tracking-[0.25em] text-gray-500 font-semibold mb-1.5">
              EXISTING / 既存の人物を検索
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedId(null);
                }}
                placeholder="名前で検索（部分一致）"
                className="w-full border border-gray-300 rounded pl-8 pr-2.5 py-1.5 text-sm focus:border-[#1c3550] focus:outline-none"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              選んだ人物を更新する場合、<span className="font-semibold">名前もフォームの値で上書き</span>されます（フルネーム化に使える）。
            </p>
          </div>

          {/* 検索結果 */}
          {query.trim().length > 0 && (
            <div className="border border-gray-200 rounded">
              {hits.length === 0 && !searching && (
                <div className="px-3 py-4 text-[12px] text-gray-500 text-center">
                  該当なし。下の「新規作成」で別レコードを作れます。
                </div>
              )}
              {hits.length > 0 && (
                <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {hits.map((h) => {
                    const active = selectedId === h.id;
                    return (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(active ? null : h.id)}
                          className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                            active
                              ? "bg-[#1c3550]/5 border-l-2 border-[#1c3550]"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {active && (
                              <CheckCircle2 className="w-4 h-4 text-[#1c3550] flex-shrink-0" />
                            )}
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
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-[#f3e9e6] border border-[#d8c4be] rounded text-[12px] text-[#8a4538]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => !pending && onClose()}
            disabled={pending}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 px-2 py-1"
          >
            キャンセル
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit(null)}
              disabled={pending || !canSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#1c3550] text-[#1c3550] text-sm font-semibold rounded hover:bg-[#1c3550]/5 disabled:opacity-50"
            >
              {pending && selectedId === null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              新規作成
            </button>
            <button
              type="button"
              onClick={() => selectedId && submit(selectedId)}
              disabled={pending || !canSave || !selectedId}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1c3550] text-white text-sm font-semibold rounded hover:bg-[#142640] disabled:opacity-50"
            >
              {pending && selectedId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              この人を更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
