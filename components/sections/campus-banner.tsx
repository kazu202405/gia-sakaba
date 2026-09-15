// トップページ用の HIROGARUキャンパス 誘導バナー。
// /campus（創設メンバー募集＝メンバー図鑑を兼ねる公開ページ）への小さな導線。
// トップページの既存トーン（paper 背景・Noto Serif JP 見出し・teal/gold アクセント）に合わせる。

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

export function CampusBanner() {
  return (
    <section className="relative py-14 md:py-16 bg-[#f8f7f5] overflow-hidden">
      {/* 上下のアクセントライン（他セクションと同じ意匠） */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-[#2d8a80] to-[#c8a55a]" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
          {/* テキスト */}
          <div className="text-center md:text-left">
            <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] uppercase text-[#c8a55a] mb-2">
              HIROGARU Campus
            </p>
            <p className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-[#0f1f33] leading-snug">
              経営者が、つながり、賢くなる。
            </p>
            <p className="text-sm text-slate-500 mt-2">
              この場を作る経営者たちを見る / 創設メンバー募集中
            </p>
          </div>

          {/* CTA — キャンパスページへ（内部リンク） */}
          <Link
            href="/campus"
            className="group flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 text-[#2d8a80] font-bold text-sm border border-[#2d8a80]/30 rounded-full transition-all duration-300 hover:bg-[#2d8a80]/5 hover:border-[#2d8a80]/60 no-underline"
          >
            <Users className="w-4 h-4" />
            メンバーを見る
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-[#2d8a80] to-[#c8a55a]" />
    </section>
  );
}
