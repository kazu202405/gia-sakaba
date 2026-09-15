"use client";

// プロフィールプレビュー（共通カード）
//
// 使い場所：
//   - /members/app/mypage         自分のプロフィール表示（Server Component から呼び出し）
//   - /members/app/mypage/edit    編集中のリアルタイムプレビュー（Client Component から呼び出し）
//
// 表示方針：
//   - 空項目は描画しない（埋めるほどカードが充実していく）
//   - 全項目が空のときは emptyHint を中央に表示
//
// 型と整形関数は "use client" を付けない別ファイル ./profileData に分離してある
// （Server Component から関数として呼べるようにするため）。

import React from "react";
import { PROFILE_PREVIEW_KEYS, type ProfilePreviewData } from "./profileData";

// ─── コンポーネント本体 ──────────────────────────────────────────

interface ProfilePreviewProps {
  data: ProfilePreviewData;
  /** 全項目が空のときに表示する文言（改行は \n で） */
  emptyHint?: string;
}

export function ProfilePreview({ data, emptyHint }: ProfilePreviewProps) {
  const has = (...keys: (keyof ProfilePreviewData)[]) =>
    keys.some((k) => data[k].trim().length > 0);

  const anyFilled = PROFILE_PREVIEW_KEYS.some(
    (k) => data[k].trim().length > 0,
  );

  const initial = (data.name.trim() || data.nickname.trim() || "?").charAt(0);

  return (
    <article
      aria-label="プロフィールプレビュー"
      className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden"
    >
      {/* 上端の極細tealアクセント（カード共通の格式付け） */}
      <div className="h-px bg-gradient-to-r from-[var(--gia-teal)]/0 via-[var(--gia-teal)]/40 to-[var(--gia-teal)]/0" />

      {!anyFilled ? (
        <div className="px-6 py-16 text-center">
          <p
            className="text-[13px] text-gray-500 leading-[1.95] whitespace-pre-line"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {emptyHint ?? "まだ何も入力されていません。"}
          </p>
        </div>
      ) : (
        <>
          {/* ─── 上部: アバター/名前 | 仕事 を横並び ─────────────── */}
          {/*    md以上で2カラム化。仕事が空なら1カラムフル幅で名前のみ。      */}
          {(() => {
            const hasJob = has(
              "role_title",
              "job_title",
              "headline",
              "services_summary",
            );
            return (
              <div className="px-6 pt-6 pb-5">
                <div
                  className={
                    hasJob
                      ? "md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:items-start"
                      : ""
                  }
                >
                  {/* 左: アバター + 名前 + 一言 をひとつのブロックに */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3.5">
                      {data.photo_url.trim() ? (
                        /* 登録済みプロフィール写真。無ければ頭文字円にフォールバック。 */
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={data.photo_url}
                          alt={`${data.name.trim() || data.nickname.trim() || "あなた"} のプロフィール写真`}
                          className="w-14 h-14 rounded-full object-cover border border-[var(--gia-teal)]/20 flex-shrink-0 bg-[var(--gia-teal)]/[0.04]"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--gia-teal)]/15 to-[var(--gia-teal)]/5 border border-[var(--gia-teal)]/20 flex items-center justify-center text-xl font-semibold text-[var(--gia-teal)] flex-shrink-0">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-[17px] text-[var(--gia-navy)] truncate tracking-[0.02em]"
                          style={{
                            fontFamily: "'Noto Serif JP', serif",
                            fontWeight: 500,
                          }}
                        >
                          {data.name.trim() || (
                            <span className="text-gray-300">名前未入力</span>
                          )}
                        </div>
                        {data.name_furigana.trim() && (
                          <div className="text-[11px] text-gray-400 truncate mt-0.5 tracking-[0.04em]">
                            {data.name_furigana}
                          </div>
                        )}
                        {data.nickname.trim() && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            “{data.nickname}”
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 一言（status_message）は左ブロック内、名前の下に */}
                    {data.status_message.trim() && (
                      <div
                        className="mt-3.5 text-[13px] text-gray-700 leading-[1.9] border-l-2 border-[var(--gia-teal)]/50 pl-3"
                        style={{ fontFamily: "'Noto Serif JP', serif" }}
                      >
                        {data.status_message}
                      </div>
                    )}
                  </div>

                  {/* 縦区切り線（md+のみ） */}
                  {hasJob && (
                    <div
                      aria-hidden
                      className="hidden md:block w-px self-stretch bg-[var(--gia-navy)]/10"
                    />
                  )}

                  {/* 右: 仕事（md+ では下揃えにして余白を均す） */}
                  {hasJob && (
                    <div className="mt-5 md:mt-0 pt-5 md:pt-0 border-t md:border-t-0 border-[var(--gia-navy)]/8 min-w-0 md:self-end">
                      {has("role_title", "job_title") && (
                        <div className="text-sm text-gray-900 font-medium">
                          {[data.role_title, data.job_title]
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .join(" / ")}
                        </div>
                      )}
                      {data.headline.trim() && (
                        <div className="text-xs text-gray-700 leading-relaxed mt-1.5">
                          {data.headline}
                        </div>
                      )}
                      {data.services_summary.trim() && (
                        <div className="text-xs text-gray-500 leading-relaxed mt-2 whitespace-pre-wrap">
                          {data.services_summary}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ストーリー */}
          {has(
            "story_origin",
            "story_turning_point",
            "story_now",
            "story_future",
          ) && (
            <PreviewSection label="ストーリー">
              {data.story_origin.trim() && (
                <PreviewQA q="始めたきっかけ" a={data.story_origin} />
              )}
              {data.story_turning_point.trim() && (
                <PreviewQA q="転機" a={data.story_turning_point} />
              )}
              {data.story_now.trim() && (
                <PreviewQA q="いまの想い" a={data.story_now} />
              )}
              {data.story_future.trim() && (
                <PreviewQA q="これから" a={data.story_future} />
              )}
            </PreviewSection>
          )}

          {/* ─── つながり | 人柄 を横並び ───────────────────────── */}
          {(() => {
            const hasConnect = data.want_to_connect_with.trim().length > 0;
            const hasPersonality = has(
              "favorites",
              "current_hobby",
              "school_days_self",
              "personal_values",
            );
            if (!hasConnect && !hasPersonality) return null;

            const both = hasConnect && hasPersonality;
            return (
              <section className="px-6 py-4 relative before:absolute before:inset-x-6 before:top-0 before:border-t before:border-[var(--gia-navy)]/8">
                <div
                  className={
                    both
                      ? "md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:items-start"
                      : ""
                  }
                >
                  {/* 左: 人柄 */}
                  {hasPersonality && (
                    <div className="min-w-0">
                      <h3 className="font-[family-name:var(--font-en)] text-[10px] font-semibold text-[var(--gia-teal)] tracking-[0.28em] uppercase mb-2.5">
                        人柄
                      </h3>
                      {data.favorites.trim() && (
                        <PreviewKV k="好きなもの" v={data.favorites} />
                      )}
                      {data.current_hobby.trim() && (
                        <PreviewKV k="最近ハマってる" v={data.current_hobby} />
                      )}
                      {data.school_days_self.trim() && (
                        <PreviewKV k="学生時代" v={data.school_days_self} />
                      )}
                      {data.personal_values.trim() && (
                        <PreviewKV k="大切にしてる" v={data.personal_values} />
                      )}
                    </div>
                  )}

                  {/* 縦区切り線（md+のみ） */}
                  {both && (
                    <div
                      aria-hidden
                      className="hidden md:block w-px self-stretch bg-[var(--gia-navy)]/10"
                    />
                  )}

                  {/* 右: つながり */}
                  {hasConnect && (
                    <div
                      className={
                        hasPersonality
                          ? "mt-5 md:mt-0 pt-5 md:pt-0 border-t md:border-t-0 border-[var(--gia-navy)]/8 min-w-0"
                          : "min-w-0"
                      }
                    >
                      <h3 className="font-[family-name:var(--font-en)] text-[10px] font-semibold text-[var(--gia-teal)] tracking-[0.28em] uppercase mb-2.5">
                        どんな人と繋がりたいか
                      </h3>
                      <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {data.want_to_connect_with}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* 連絡先 */}
          {has("contact_line", "contact_instagram", "contact_website") && (
            <PreviewSection label="連絡先">
              {data.contact_line.trim() && (
                <PreviewKV k="LINE" v={data.contact_line} />
              )}
              {data.contact_instagram.trim() && (
                <PreviewKV k="Instagram" v={data.contact_instagram} />
              )}
              {data.contact_website.trim() && (
                <PreviewKV k="Web" v={data.contact_website} />
              )}
            </PreviewSection>
          )}
        </>
      )}
    </article>
  );
}

// ─── 内部コンポーネント ────────────────────────────────────────

function PreviewSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  // 区切り線は左右に余白を残した擬似要素で描く（端まで届かないので圧迫感が出ない）
  return (
    <section className="px-6 py-4 relative before:absolute before:inset-x-6 before:top-0 before:border-t before:border-[var(--gia-navy)]/8">
      <h3 className="font-[family-name:var(--font-en)] text-[10px] font-semibold text-[var(--gia-teal)] tracking-[0.28em] uppercase mb-2.5">
        {label}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function PreviewQA({ q, a }: { q: string; a: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-[11px] font-semibold text-gray-500 mb-1">{q}</div>
      <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
        {a}
      </div>
    </div>
  );
}

function PreviewKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-3 mb-1.5 last:mb-0 text-xs">
      <span className="text-gray-400 flex-shrink-0 w-20">{k}</span>
      <span className="text-gray-700 leading-relaxed break-words min-w-0">
        {v}
      </span>
    </div>
  );
}
