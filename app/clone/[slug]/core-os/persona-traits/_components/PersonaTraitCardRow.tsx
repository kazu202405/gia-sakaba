"use client";

// persona_trait 1件のカード行。
// カード全体クリックで編集ダイアログを開く。候補（candidate）の場合は
// 「採択 / 却下」ボタンを右上に出して 1 クリックで進められるようにする。

import { useState, useTransition } from "react";
import {
  X, Loader2, AlertCircle, Trash2, Check, AlertTriangle, ThumbsDown,
} from "lucide-react";
import { EditorialCard } from "@/app/admin/_components/EditorialChrome";
import { PERSONA_TRAIT_CATEGORIES } from "@/lib/ai-clone/supabase-db";
import {
  updatePersonaTrait,
  updatePersonaTraitStatus,
  deletePersonaTrait,
  type PersonaTraitStatus,
} from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  traitId: string;
  category: string;
  trait: string;
  detail: string | null;
  status: PersonaTraitStatus;
  sourceJournalDate: string | null;
  adoptedAt: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  価値観:       { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" },
  判断軸:       { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]" },
  学びクセ:     { bg: "bg-[#e9f1ee]", border: "border-[#c5d9d0]", text: "text-[#3d6651]" },
  好み:         { bg: "bg-[#f4eef7]", border: "border-[#dccde5]", text: "text-[#5b3d8a]" },
  息抜き:       { bg: "bg-[#eef5f8]", border: "border-[#c8dde5]", text: "text-[#356b85]" },
  心理パターン: { bg: "bg-[#f8eef0]", border: "border-[#e5c8d0]", text: "text-[#8a3550]" },
  仕事スタイル: { bg: "bg-[#f1f1f4]", border: "border-[#d4d4dc]", text: "text-[#4a4a5a]" },
  関係性パターン: { bg: "bg-[#fdf2e9]", border: "border-[#e6cba3]", text: "text-[#8a6b1c]" },
};

function CategoryChip({ category }: { category: string }) {
  const s = CATEGORY_COLORS[category]
    ?? { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${s.bg} ${s.border} ${s.text}`}
    >
      {category}
    </span>
  );
}

export function PersonaTraitCardRow({
  slug, tenantId, traitId,
  category, trait, detail, status, sourceJournalDate, adoptedAt,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formCategory, setFormCategory] = useState(category);
  const [formTrait, setFormTrait] = useState(trait);
  const [formDetail, setFormDetail] = useState(detail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dimmed = status === "dismissed";

  const reset = () => {
    setFormCategory(category);
    setFormTrait(trait);
    setFormDetail(detail ?? "");
    setError(null);
    setConfirmDelete(false);
  };

  const close = () => {
    if (pending) return;
    reset();
    setEditOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updatePersonaTrait(slug, tenantId, traitId, {
        category: formCategory,
        trait: formTrait,
        detail: formDetail || null,
      });
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setEditOpen(false);
    });
  };

  const handleStatusChange = (
    e: React.MouseEvent,
    next: PersonaTraitStatus,
  ) => {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const res = await updatePersonaTraitStatus(slug, tenantId, traitId, next);
      if (!res.ok) setError(res.error ?? "更新に失敗しました");
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deletePersonaTrait(slug, tenantId, traitId);
      if (!res.ok) {
        setError(res.error ?? "削除に失敗しました");
        return;
      }
      setConfirmDelete(false);
      setEditOpen(false);
    });
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditOpen(true);
          }
        }}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3550]/40 rounded-md"
      >
        <EditorialCard
          variant="row"
          className={`px-5 py-4 group hover:border-[#1c3550]/30 hover:bg-gray-50/40 transition-colors ${dimmed ? "opacity-60" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <CategoryChip category={category} />
                {status === "adopted" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e9efe9] border border-[#c5d3c8] text-[#3d6651]">
                    <Check className="w-2.5 h-2.5" /> 採択済み
                  </span>
                )}
                {status === "dismissed" && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 border border-gray-200 text-gray-500">
                    却下
                  </span>
                )}
              </div>
              <p className="text-sm text-[#1c3550] leading-relaxed whitespace-pre-wrap font-medium">
                {trait}
              </p>
              {detail && (
                <p className="text-[12px] text-gray-600 leading-relaxed mt-1 whitespace-pre-wrap">
                  {detail}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                {sourceJournalDate && (
                  <span>元: {sourceJournalDate} の日記</span>
                )}
                {adoptedAt && (
                  <span>採択: {adoptedAt.slice(0, 10)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {status === "candidate" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleStatusChange(e, "adopted")}
                    disabled={pending}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-[#1c3550] text-white hover:bg-[#0f2238] disabled:opacity-40 transition-colors"
                  >
                    <Check className="w-3 h-3" /> 採択
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStatusChange(e, "dismissed")}
                    disabled={pending}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ThumbsDown className="w-3 h-3" /> 却下
                  </button>
                </>
              )}
              {status === "adopted" && (
                <button
                  type="button"
                  onClick={(e) => handleStatusChange(e, "candidate")}
                  disabled={pending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  title="採択を取り消す（候補に戻す）"
                >
                  採択取消
                </button>
              )}
              {status === "dismissed" && (
                <button
                  type="button"
                  onClick={(e) => handleStatusChange(e, "candidate")}
                  disabled={pending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  title="却下を取り消す（候補に戻す）"
                >
                  却下取消
                </button>
              )}
            </div>
          </div>
        </EditorialCard>
      </div>

      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span aria-hidden className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm" />
                <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                  傾向を編集
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-5 py-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  カテゴリ <span className="text-[#c0524a]">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10"
                >
                  {PERSONA_TRAIT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  傾向（1 行で言い切る） <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formTrait}
                  onChange={(e) => setFormTrait(e.target.value)}
                  placeholder="例：数字より関係性を優先する"
                  className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  補足
                </label>
                <textarea
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  rows={3}
                  placeholder="（任意）具体例・出典の文脈など"
                  className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10 resize-y"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#8a4538] hover:bg-[#f3e9e6] disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  削除
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={pending || formTrait.trim().length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    保存する
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => !pending && setConfirmDelete(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-md shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 flex items-center gap-3">
              <span aria-hidden className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f3e9e6]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#8a4538]" />
              </span>
              <h2 className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]">
                削除の確認
              </h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-bold text-[#1c3550]">{trait}</span> を削除します。
              </p>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                元に戻すことはできません。AI が再度同趣旨を抽出する可能性はあります。
              </p>
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                  className="px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#8a4538] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#6f372d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
