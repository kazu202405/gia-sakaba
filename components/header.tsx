"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

type NavChild = {
  label: string;
  desc: string;
  href: string;
  highlight?: boolean;
};
type NavItem = { label: string; href: string; children?: NavChild[] };

const navLinkItems: NavItem[] = [
  { label: "ホーム", href: "/" },
  {
    // 2026-08-10 のメニュー整理:
    //   - 右腕AI（/services/ai）と申し込みページ（/start）は提供停止でルートを
    //     閉じたため削除。残すとメニューから404に飛ぶ
    //   - HIROGARUキャンパス（/members）とキャンパスのメンバー（/campus）は
    //     メニューからのみ外した。**ページ自体は生きている**ので、URLを知って
    //     いれば見られるし、既存リンク・検索からの流入もそのまま
    //   - 親ラベルもクリックできるリンクなので、href は外した /members ではなく
    //     先頭の子に合わせる
    label: "サービス",
    href: "/services/construction",
    children: [
      {
        label: "建設業Web運用",
        desc: "施工事例・採用・紹介を毎月整える信用資産運用",
        href: "/services/construction",
      },
      {
        label: "売上導線診断（無料）",
        desc: "20問で売上の伸びしろを見える化",
        href: "/diagnosis",
      },
      {
        label: "会員のご案内",
        desc: "オンライン / リアルの2段",
        // 2026-08-12: /upgrade から /plans に変更。
        // /upgrade はログイン必須で、押すのは「まだ会員でない＝アカウントを
        // 持っていない」人なので、案内を読む前にログイン画面に当たって離脱していた。
        // /plans は公開ページで3段を1枚で説明する。申し込みは /plans の CTA から
        // /join?next=/upgrade へ繋がっているので、決済までの導線は切れない。
        href: "/plans",
      },
    ],
  },
  // 2026-08-10: 以前はコミュニティを サービス ドロップダウン内の
  // 「HIROGARUキャンパス」に集約していたが、その項目自体をメニューから外した。
  // キャンパスへの導線はトップページのバナー（campus-banner）と
  // ログインドロップダウンに残っている。
  { label: "ナレッジ", href: "/behavioral-science" },
  { label: "代表", href: "/founder" },
];

// ヘッダー右側「ログイン」ドロップダウンの中身。
// 認証は Supabase で共通だが、入口を用途別に分けて会員の迷いを減らす。
// 既定の /login はログイン後 /members/app/mypage（テラこや会員ページ）へ着地する。
// 2026-08-12: 2項目を1つに統合した。
// 「ログイン」(/login) と「オンラインコミュニティへのログイン」
// (/login?next=/members/app/mypage) が並んでいたが、/login の既定の着地が
// /members/app/mypage なので**どちらも行き先が同じ**だった。
// 右腕AIのログインは 2026-08-10 のメニュー整理で既に消えており、
// 用途別に分ける理由が無くなっていた。選ばせる必要のないものを選ばせない。
const loginChildren: NavChild[] = [
  { label: "ログイン", desc: "会員マイページにログイン", href: "/login" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={`edl-root edl-header fixed top-0 left-0 right-0 z-50 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? "py-3 px-6 md:px-12 bg-[rgba(248,246,241,0.95)] backdrop-blur-xl"
          : "py-4 md:py-[18px] px-6 md:px-12 bg-[rgba(248,246,241,0.85)] backdrop-blur-xl"
      } border-b border-[var(--edl-line)]`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3.5 no-underline">
        <Image src="/gia-logo.png" alt="GIA" width={36} height={36} />
        <span className="hidden sm:flex flex-col leading-[1.15]">
          <span className="font-[family-name:var(--font-en)] text-[15px] font-semibold text-[var(--edl-navy)] tracking-[0.12em]">
            GIA
          </span>
          <span className="font-[family-name:var(--font-mincho)] text-[10px] text-[var(--edl-muted)] tracking-[0.14em] mt-0.5">
            Global Information Academy
          </span>
        </span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden lg:flex items-center gap-8 font-[family-name:var(--font-en)] text-[13px] tracking-[0.08em]">
        {navLinkItems.map((item) =>
          item.children ? (
            <div key={item.label} className="relative group flex items-center">
              <Link
                href={item.href}
                className="edl-nav-link relative inline-block pb-1.5 text-[var(--edl-body)] hover:text-[var(--edl-navy)] transition-colors no-underline"
              >
                {item.label}
              </Link>
              {/* ホバーで開くドロップダウン。pt-3 がラベル⇄パネル間のホバー橋渡し。 */}
              <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="w-72 rounded-xl border border-[var(--edl-line)] bg-[var(--edl-off-white)] p-2 shadow-[0_12px_40px_-12px_rgba(15,31,51,0.25)]">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`block rounded-lg px-4 py-3 no-underline transition-colors ${
                        c.highlight
                          ? "bg-[var(--edl-navy)] text-white hover:bg-[var(--edl-navy)]/90"
                          : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span
                        className={`block text-[13px] font-medium ${
                          c.highlight ? "text-white" : "text-[var(--edl-navy)]"
                        }`}
                      >
                        {c.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-[11px] tracking-normal ${
                          c.highlight ? "text-white/75" : "text-[var(--edl-muted)]"
                        }`}
                      >
                        {c.desc}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="edl-nav-link relative pb-1.5 text-[var(--edl-body)] hover:text-[var(--edl-navy)] transition-colors no-underline"
            >
              {item.label}
            </Link>
          ),
        )}
        {/* ログイン。2026-08-12 にドロップダウンをやめた。
            中身が2つあったが行き先は同じで、開いても選択肢にならなかった。 */}
        <Link
          href="/login"
          className="edl-nav-link relative inline-block pb-1.5 text-[var(--edl-body)] hover:text-[var(--edl-navy)] transition-colors no-underline"
        >
          ログイン
        </Link>
        <a
          href="https://page.line.me/131liqrt"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--edl-navy)] font-medium border border-[var(--edl-line)] px-4 py-2.5 transition-all duration-300 hover:bg-[var(--edl-navy)] hover:text-white hover:border-[var(--edl-navy)]"
        >
          無料相談
        </a>
      </nav>

      {/* Mobile burger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden p-2 text-[var(--edl-navy)]"
        aria-label={mobileOpen ? "メニューを閉じる" : "メニューを開く"}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden absolute top-full left-0 right-0 bg-[var(--edl-off-white)] border-b border-[var(--edl-line)] overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-[80vh] opacity-100 py-6" : "max-h-0 opacity-0 py-0"
        }`}
      >
        <div className="px-6 space-y-1">
          {navLinkItems.map((item) => (
            <div key={item.label}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block font-[family-name:var(--font-en)] text-sm tracking-[0.1em] text-[var(--edl-body)] py-3 border-b border-[var(--edl-line)] no-underline"
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="pl-4 py-1 space-y-0.5 border-b border-[var(--edl-line)]">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block text-[13px] py-2 no-underline ${
                        c.highlight
                          ? "text-[var(--edl-navy)] font-medium"
                          : "text-[var(--edl-muted)]"
                      }`}
                    >
                      {c.label}
                      <span className="ml-2 text-[11px] text-[var(--edl-muted)]">
                        {c.desc}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="mt-2 border-t border-[var(--edl-line)]">
            {loginChildren.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm tracking-[0.04em] text-[var(--edl-body)] py-3 border-b border-[var(--edl-line)] no-underline"
              >
                {c.label}
                <span className="ml-2 text-[11px] text-[var(--edl-muted)]">
                  {c.desc}
                </span>
              </Link>
            ))}
          </div>
          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="edl-cta-primary mt-5"
          >
            LINEで無料相談
            <span className="arrow" />
          </a>
        </div>
      </div>

      {/* gold underline on hover */}
      <style jsx>{`
        .edl-nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 0;
          height: 1px;
          background: var(--edl-gold);
          transition: width 0.25s ease;
        }
        .edl-nav-link:hover::after {
          width: 100%;
        }
      `}</style>
    </header>
  );
}
