import Link from "next/link";

interface FooterProps {
  variant?: "default" | "dark";
}

/**
 * Footer — Editorial company-info
 * navy-deep 背景。左：ブランド見出し+LINE CTA、右：会社情報 dl。
 * 代表者名・メアドは公開しない方針（CRM メモ準拠）。
 */
export function Footer({ variant = "default" }: FooterProps) {
  // variantは現状互換のため残すが、editorial では navy-deep 固定
  void variant;

  return (
    <footer className="edl-root bg-[var(--edl-navy-deep)] text-white pt-28 pb-12 px-6 md:px-16">
      <div className="max-w-[1240px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-14 md:gap-20 pb-20 border-b border-[var(--edl-line-dark)]">
          {/* Brand */}
          <div>
            <p
              className="edl-jp-keep font-[family-name:var(--font-mincho)] font-medium text-white tracking-[0.03em] mb-9"
              style={{
                fontSize: "clamp(28px, 2.8vw, 40px)",
                lineHeight: 1.6,
              }}
            >
              まずは、
              <span className="text-[var(--edl-gold-soft)]">
                話を聞かせて
              </span>
              ください。
              <br />
              LINEで無料相談、お受けしています。
            </p>
            <a
              href="https://page.line.me/131liqrt"
              target="_blank"
              rel="noopener noreferrer"
              className="edl-cta-primary line"
            >
              LINEで友だち追加
              <span className="arrow" />
            </a>
          </div>

          {/* Company info */}
          <dl className="text-[14px] leading-[2]">
            <dt className="font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.24em] text-[var(--edl-gold-soft)] uppercase mt-0 mb-1.5">
              Company
            </dt>
            <dd className="text-white/85">
              株式会社 Global Information Academy
            </dd>

            <dt className="font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.24em] text-[var(--edl-gold-soft)] uppercase mt-6 mb-1.5">
              Service
            </dt>
            <dd className="text-white/85">
              業務フロー診断 / AI活用設計 / 業務改善ダッシュボード /<br />
              DX設計ワークショップ / 業務定着プログラム /<br />
              顧客管理・営業支援アプリ制作
            </dd>

            <dt className="font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.24em] text-[var(--edl-gold-soft)] uppercase mt-6 mb-1.5">
              Location
            </dt>
            <dd className="text-white/85">
              〒531-0056
              <br />
              大阪市中央区久太郎町1-7-11
            </dd>

            <dt className="font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.24em] text-[var(--edl-gold-soft)] uppercase mt-6 mb-1.5">
              Contact
            </dt>
            <dd className="text-white/85">
              <a
                href="https://page.line.me/131liqrt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/85 no-underline border-b border-[var(--edl-line-dark)] hover:text-[var(--edl-gold-soft)] hover:border-[var(--edl-gold)] transition-all"
              >
                LINE公式アカウント
              </a>
            </dd>

            <dt className="font-[family-name:var(--font-en)] text-[11px] font-semibold tracking-[0.24em] text-[var(--edl-gold-soft)] uppercase mt-6 mb-1.5">
              Web
            </dt>
            <dd className="text-white/85">
              <a
                href="https://gia2018.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/85 no-underline border-b border-[var(--edl-line-dark)] hover:text-[var(--edl-gold-soft)] hover:border-[var(--edl-gold)] transition-all"
              >
                gia2018.com
              </a>
            </dd>
          </dl>
        </div>

        {/* Resource / Legal links — 既存ルートへの導線を残す */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-[12px]">
          <Link
            href="/behavioral-science"
            className="text-white/55 no-underline hover:text-[var(--edl-gold-soft)] transition-colors"
          >
            ナレッジ
          </Link>
          <Link
            href="/members"
            className="text-white/55 no-underline hover:text-[var(--edl-gold-soft)] transition-colors"
          >
            コミュニティ
          </Link>
          <Link
            href="/diagnostic"
            className="text-white/55 no-underline hover:text-[var(--edl-gold-soft)] transition-colors"
          >
            仕組み化診断
          </Link>
          <Link
            href="/services/space"
            className="text-white/55 no-underline hover:text-[var(--edl-gold-soft)] transition-colors"
          >
            空間・建築デザイン
          </Link>
          <Link
            href="/terms"
            className="text-white/55 no-underline hover:text-[var(--edl-gold-soft)] transition-colors"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="text-white/55 no-underline hover:text-[var(--edl-gold-soft)] transition-colors"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/tokushoho"
            className="text-white/55 no-underline hover:text-[var(--edl-gold-soft)] transition-colors"
          >
            特定商取引法に基づく表記
          </Link>
        </div>

        <div className="mt-10 flex flex-col md:flex-row justify-between font-[family-name:var(--font-en)] text-[11px] tracking-[0.18em] text-white/50 uppercase gap-3">
          <span>© Global Information Academy Inc.</span>
          <span>Designed with intention — 2026</span>
        </div>
      </div>
    </footer>
  );
}
