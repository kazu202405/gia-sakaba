"use client";

// マイページの「紹介リンク」カード。paid 会員のみ表示。
//
// メンバーが自分の知人を GIA に紹介するための専用リンクを発行・管理する UI。
// 仕様:
//   - 自分が作った invitations のみ SELECT/INSERT/UPDATE できる（migration 0016 の RLS）
//   - seminar_id は触れない（汎用紹介リンクのみ。セミナー指定は admin 専用）
//   - 踏んでくれた人の applicants.referrer_id に自分の user_id が自動で入る（DB トリガ）
//
// 操作:
//   - 新規発行（メモのみ。admin の発行UI のような上限・期限・セミナーは出さない）
//   - URL コピー
//   - 取消／復活

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Plus,
  Copy,
  Check,
  Ban,
  RotateCcw,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MyInvitationRow {
  id: string;
  code: string;
  notes: string | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

// 8文字 base36 のコード生成（invitations.code UNIQUE 制約）
function generateCode(): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function MyReferralLinks({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<MyInvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 初期ロード
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: e1 } = await supabase
        .from("invitations")
        .select("id, code, notes, used_count, is_active, created_at")
        .eq("created_by", userId)
        .is("seminar_id", null)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (e1) {
        setError(e1.message);
        setLoading(false);
        return;
      }
      setRows((data ?? []) as MyInvitationRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);

    let lastErr: { code?: string; message: string } | null = null;
    let inserted: MyInvitationRow | null = null;

    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      const code = generateCode();
      const { data, error: e1 } = await supabase
        .from("invitations")
        .insert({
          code,
          created_by: userId,
          notes: draftNotes.trim() || null,
          // seminar_id / max_uses / expires_at は触らない（RLS で member は seminar_id NULL のみ）
        })
        .select("id, code, notes, used_count, is_active, created_at")
        .single();

      if (e1) {
        lastErr = { code: e1.code, message: e1.message };
        if (e1.code === "23505") continue; // unique 衝突 → 再生成
        break;
      }
      inserted = data as MyInvitationRow;
    }

    if (!inserted) {
      setCreateError(
        lastErr?.message ?? "紹介リンクの発行に失敗しました（不明なエラー）",
      );
      setCreating(false);
      return;
    }

    setRows((prev) => [inserted!, ...prev]);
    setCreateOpen(false);
    setCreating(false);
    setDraftNotes("");

    // activity_log: 監査ログ（0019 の member 自身 INSERT 許可ポリシーで通る）
    // fire-and-forget
    void supabase.from("activity_log").insert({
      actor_id: userId,
      subject_type: "invitation",
      subject_id: inserted.id,
      action: "invitation_create",
      details: {
        code: inserted.code,
        issued_by: "member",
      },
    });
  };

  const handleToggleActive = async (row: MyInvitationRow) => {
    setBusyId(row.id);
    const next = !row.is_active;
    // 楽観的更新
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)),
    );
    const { error: e1 } = await supabase
      .from("invitations")
      .update({ is_active: next })
      .eq("id", row.id);
    if (!e1) {
      // activity_log: 取消/復活の監査ログ。fire-and-forget
      void supabase.from("activity_log").insert({
        actor_id: userId,
        subject_type: "invitation",
        subject_id: row.id,
        action: next ? "invitation_restore" : "invitation_revoke",
        details: {
          code: row.code,
          issued_by: "member",
        },
      });
    }
    if (e1) {
      // ロールバック
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, is_active: row.is_active } : r,
        ),
      );
      setError(`更新に失敗しました：${e1.message}`);
    }
    setBusyId(null);
  };

  const handleCopy = async (code: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join?invite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // クリップボードAPI 使えない環境は無視
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--gia-navy)]/10 bg-white/85 backdrop-blur-sm shadow-[0_1px_2px_rgba(28,53,80,0.04)] overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 sm:px-7 py-5 sm:py-6 border-b border-[var(--gia-navy)]/10">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
            For Referral
          </p>
          <h3 className="font-[family-name:var(--font-mincho)] text-[17px] sm:text-[19px] text-[var(--gia-navy)] mt-1 tracking-[0.02em]">
            紹介リンク
          </h3>
          <p className="text-[12.5px] text-gray-600 mt-1.5 leading-[1.85]">
            知人を GIA に紹介するための専用リンク。踏んでくれた人があなたの紹介として登録されます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--gia-navy)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          新規発行
        </button>
      </div>

      {error && (
        <div className="mx-5 sm:mx-7 mt-4 flex items-start gap-2 px-3.5 py-2.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="px-5 sm:px-7 py-5 sm:py-6">
        {loading ? (
          <div className="py-6 flex items-center justify-center text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            読み込み中...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            まだ紹介リンクを発行していません。
            <br />
            <span className="text-xs text-gray-400">
              「新規発行」から、最初のリンクを作りましょう。
            </span>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row) => {
              const isCopied = copiedCode === row.code;
              const inactive = !row.is_active;
              return (
                <li
                  key={row.id}
                  className={`rounded-md border ${
                    inactive
                      ? "border-gray-200 bg-gray-50/60"
                      : "border-[var(--gia-navy)]/10 bg-white"
                  } px-4 py-3 flex flex-wrap items-center gap-3`}
                >
                  <code
                    className={`font-mono text-sm font-bold ${
                      inactive ? "text-gray-400 line-through" : "text-[var(--gia-navy)]"
                    } break-all`}
                  >
                    {row.code}
                  </code>
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">
                    <Users className="w-3 h-3" />
                    {row.used_count}人が登録
                  </span>
                  {inactive && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">
                      取消済み
                    </span>
                  )}
                  {row.notes && (
                    <span className="text-xs text-gray-500 truncate min-w-0">
                      {row.notes}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(row.code)}
                      disabled={inactive}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-[var(--gia-navy)] hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-[var(--gia-teal)]" />
                          <span className="text-[var(--gia-teal)]">
                            コピー済
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          URL
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleToggleActive(row)}
                      disabled={busyId === row.id}
                      title={row.is_active ? "取消" : "復活"}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-gray-100 disabled:opacity-40"
                    >
                      {busyId === row.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : row.is_active ? (
                        <>
                          <Ban className="w-3 h-3" />
                          取消
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          復活
                        </>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 新規発行モーダル */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!creating) setCreateOpen(false);
          }}
        >
          <div
            className="bg-white rounded-md shadow-xl border border-gray-200 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <p className="text-[10px] tracking-[0.3em] text-[var(--gia-gold)] font-semibold">
                NEW REFERRAL
              </p>
              <h3 className="font-[family-name:var(--font-mincho)] text-base font-bold text-[var(--gia-navy)] mt-0.5">
                紹介リンクを発行
              </h3>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">
                  メモ（任意・自分用）
                </label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="例：高校時代の友人 / 〇〇イベントで知り合った〇〇さん"
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gia-navy)] focus:border-transparent resize-y"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  誰に出したか・どこで出したかのメモ。あなたにしか見えません。
                </p>
              </div>

              {createError && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="px-3.5 py-2 text-xs text-gray-600 hover:text-[var(--gia-navy)] disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--gia-navy)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    発行中...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    発行する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
