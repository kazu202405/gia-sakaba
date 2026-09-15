"use client";

// マイページの「公開ページ」カード。
//
// 社長インタビュー公開ページ（/members/<自分のid>・ログイン不要）の
// 公開 ON/OFF と 実名公開 ON/OFF を本人が切り替える最小 UI。
// 公開URLのコピーもここで行う（紹介・採用で配る用）。
//
// 保存経路: /api/profile/save（boolean whitelist に profile_published /
//   name_public を追加済み・migration 0075）。楽観的更新＋失敗時ロールバック。
//
// デフォルトは両方 OFF（非公開・実名非公開）。本人が公開を選んで初めて外に出る。

import { useState } from "react";
import {
  Loader2,
  Copy,
  Check,
  Globe,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface Props {
  userId: string;
  initialPublished: boolean;
  initialNamePublic: boolean;
  /** プレビュー用（表示名の出し分け確認）。保存はしない。 */
  name: string;
  nickname: string;
}

async function saveFlag(
  field: "profile_published" | "name_public",
  value: boolean,
): Promise<string | null> {
  try {
    const res = await fetch("/api/profile/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      return data?.error ?? `保存に失敗しました（${res.status}）`;
    }
    return null;
  } catch (e) {
    return `保存に失敗しました：${e instanceof Error ? e.message : "通信エラー"}`;
  }
}

export function PublishSettingsCard({
  userId,
  initialPublished,
  initialNamePublic,
  name,
  nickname,
}: Props) {
  const [published, setPublished] = useState(initialPublished);
  const [namePublic, setNamePublic] = useState(initialNamePublic);
  const [savingField, setSavingField] = useState<
    "profile_published" | "name_public" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/members/${userId}`
      : `/members/${userId}`;

  // 公開ページに出る「表向きの名前」のプレビュー
  const previewName = namePublic
    ? name.trim() || nickname.trim() || "GIAメンバー"
    : nickname.trim() || "GIAメンバー";
  const nameFallbackWarning = !namePublic && nickname.trim().length === 0;

  const handleToggle = async (
    field: "profile_published" | "name_public",
    next: boolean,
  ) => {
    setError(null);
    // 楽観的更新
    if (field === "profile_published") setPublished(next);
    else setNamePublic(next);
    setSavingField(field);

    const err = await saveFlag(field, next);
    setSavingField(null);
    if (err) {
      // ロールバック
      if (field === "profile_published") setPublished(!next);
      else setNamePublic(!next);
      setError(err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // クリップボード不可環境は無視
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--gia-navy)]/10 bg-white/85 backdrop-blur-sm shadow-[0_1px_2px_rgba(28,53,80,0.04)] overflow-hidden">
      <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-[var(--gia-navy)]/10">
        <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
          Public Page
        </p>
        <h3 className="font-[family-name:var(--font-mincho)] text-[17px] sm:text-[19px] text-[var(--gia-navy)] mt-1 tracking-[0.02em]">
          あなたの公開ページ
        </h3>
        <p className="text-[12.5px] text-gray-600 mt-1.5 leading-[1.85]">
          ログイン不要で誰でも読めるインタビュー形式の公開ページ。紹介や採用で
          1本の URL として配れます。プロフィールの内容がそのまま記事になります。
        </p>
      </div>

      {error && (
        <div className="mx-5 sm:mx-7 mt-4 flex items-start gap-2 px-3.5 py-2.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-4">
        {/* トグル：公開する */}
        <ToggleRow
          icon={<Globe className="w-4 h-4" />}
          title="このページを公開する"
          desc={
            published
              ? "現在このページは公開中です。"
              : "オフの間は誰にも表示されません（404）。"
          }
          checked={published}
          saving={savingField === "profile_published"}
          onChange={(v) => handleToggle("profile_published", v)}
        />

        {/* トグル：実名を公開する */}
        <ToggleRow
          icon={
            namePublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />
          }
          title="実名を公開する"
          desc={
            namePublic
              ? `実名「${name.trim() || "（未設定）"}」を表示します。`
              : "オフのときはニックネームで表示されます（実名は出ません）。"
          }
          checked={namePublic}
          saving={savingField === "name_public"}
          onChange={(v) => handleToggle("name_public", v)}
        />

        {/* 表示名プレビュー */}
        <div className="rounded-lg bg-[var(--gia-navy)]/[0.03] border border-[var(--gia-navy)]/8 px-4 py-3">
          <p className="text-[11px] text-gray-500 mb-0.5">
            公開ページでの表示名
          </p>
          <p className="text-sm font-semibold text-[var(--gia-navy)] font-[family-name:var(--font-mincho)]">
            {previewName}
          </p>
          {nameFallbackWarning && (
            <p className="text-[11px] text-amber-700 mt-1.5 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              ニックネームが未設定です。実名を公開しない場合はニックネームを設定してください。
            </p>
          )}
        </div>

        {/* 公開URL コピー */}
        <div>
          <p className="text-[11px] text-gray-500 mb-1.5">公開URL（配布用）</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate font-mono text-xs text-[var(--gia-navy)] bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              {publicUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium text-gray-500 hover:text-[var(--gia-navy)] hover:bg-gray-100 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--gia-teal)]" />
                  <span className="text-[var(--gia-teal)]">コピー済</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  コピー
                </>
              )}
            </button>
            {published && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium text-gray-500 hover:text-[var(--gia-navy)] hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                表示
              </a>
            )}
          </div>
          {!published && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              公開をオンにすると、この URL でアクセスできるようになります。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── トグル行 ───────────────────────────
function ToggleRow({
  icon,
  title,
  desc,
  checked,
  saving,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  saving: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span
          className={`mt-0.5 flex-shrink-0 ${
            checked ? "text-[var(--gia-teal)]" : "text-gray-400"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--gia-navy)]">{title}</p>
          <p className="text-[12px] text-gray-500 leading-[1.75] mt-0.5">
            {desc}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={saving}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${
          checked ? "bg-[var(--gia-teal)]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        >
          {saving && (
            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          )}
        </span>
      </button>
    </div>
  );
}
