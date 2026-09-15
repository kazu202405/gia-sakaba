"use client";

// 新規テナント作成フォーム。
// 入力: 表示名 / slug / オーナーの email / プラン
// 成功時: トースト的に成功メッセージ + 「設定ページを開く」リンクを表示
//
// admin 権限チェックは Server Action 側で実施。

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { createTenantWithOwner } from "../_actions";

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10 disabled:bg-gray-50 disabled:text-gray-500";
const helperClass = "text-[11px] text-gray-500 mt-1.5 leading-relaxed";
const errorBox =
  "flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]";

const PLANS = [
  { value: "assistant", label: "Assistant（4,980 円 / 月）" },
  { value: "partner", label: "Partner（7,980 円 / 月）" },
  { value: "team", label: "Team（29,800 円〜）" },
  { value: "custom", label: "Custom（150,000 円〜）" },
];

export function TenantCreateForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [plan, setPlan] = useState("partner");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string } | null>(null);

  const normalizedSlug = slug.trim().toLowerCase();
  const slugFormatOk =
    normalizedSlug.length === 0 || /^[a-z0-9-]{3,20}$/.test(normalizedSlug);
  const canSubmit =
    name.trim().length > 0 &&
    normalizedSlug.length > 0 &&
    slugFormatOk &&
    ownerEmail.includes("@") &&
    !pending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await createTenantWithOwner({
        name: name.trim(),
        slug: normalizedSlug,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        plan,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess({ slug: res.slug });
      // 入力をクリア（連続作成を支援）
      setName("");
      setSlug("");
      setOwnerEmail("");
    });
  };

  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6 space-y-4">
      <header>
        <h3 className="font-serif text-base font-semibold text-[#1c3550] tracking-[0.06em]">
          新規テナント作成
        </h3>
        <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
          クライアント企業1社につき1テナント。owner はクライアント側担当者（その人が
          Slack 連携などを自分で設定する想定）。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="tenant-create-name">
              表示名
            </label>
            <input
              id="tenant-create-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              disabled={pending}
              maxLength={50}
              placeholder="株式会社○○"
              className={inputClass}
            />
            <p className={helperClass}>
              ヘッダーに表示される。最大50文字。
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="tenant-create-slug">
              slug（URL の一部）
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-gray-400 select-none whitespace-nowrap font-mono">
                /clone/
              </span>
              <input
                id="tenant-create-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setError(null);
                }}
                disabled={pending}
                maxLength={20}
                autoComplete="off"
                spellCheck={false}
                placeholder="example-corp"
                className={inputClass + " font-mono"}
              />
            </div>
            <p className={helperClass}>
              英小文字 / 数字 / ハイフン、3〜20文字。後から変更可。
            </p>
            {normalizedSlug.length > 0 && !slugFormatOk && (
              <p className="text-[11px] text-[#8a4538] mt-1.5">
                形式が不正です
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="tenant-create-owner">
              オーナーの email
            </label>
            <input
              id="tenant-create-owner"
              type="email"
              value={ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                setError(null);
              }}
              disabled={pending}
              placeholder="owner@example.com"
              className={inputClass}
            />
            <p className={helperClass}>
              Supabase Auth に既に登録されている email を指定。未登録ならまず
              Auth に登録してから戻ってきてください。
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="tenant-create-plan">
              プラン
            </label>
            <select
              id="tenant-create-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              disabled={pending}
              className={inputClass}
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className={helperClass}>
              請求はこの値とは独立（Stripe 側で別管理）。表示用ラベル。
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-2 px-3 py-3 rounded-md border border-[#c5d3c8] bg-[#e9efe9] text-[12px] text-[#3d6651]"
          >
            <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">テナントを作成しました</p>
              <p className="mt-1">
                オーナーの方に下記 URL を共有してください。Slack 連携などはここから設定できます。
              </p>
              <Link
                href={`/clone/${success.slug}/settings`}
                target="_blank"
                className="inline-flex items-center gap-1 mt-2 text-[12px] font-mono underline hover:no-underline"
              >
                /clone/{success.slug}/settings
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            テナントを作成する
          </button>
        </div>
      </form>
    </section>
  );
}
