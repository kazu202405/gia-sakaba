"use client";

import Image from "next/image";

/**
 * Works — Editorial 3列グリッド
 * 6枚の白カード。写真 + 番号 / 業種 / 結果リスト + Notable バッジ。
 * Hover で上端に金線が左→右へ走る。
 */
const works = [
  {
    num: "01 / Real Estate",
    industry: "飲食店専門の不動産会社",
    results: ["見積作成時間 → 0", "顧客情報の一元管理", "KPI管理基盤の整備"],
    image: "/images/works/work1.jpg",
  },
  {
    num: "02 / Consulting",
    industry: "省エネコンサルティング会社",
    results: ["売上UP（営業仕組み化）", "経営数字の可視化", "提案精度の標準化"],
    image: "/images/works/work2.jpg",
  },
  {
    num: "03 / Trading",
    industry: "美容用品商社",
    results: ["外注費 → 0（HP/LP内製化）", "マーケ運用の自走化", "制作スピードの向上"],
    image: "/images/works/work3.jpg",
  },
  {
    num: "04 / Public Subsidy",
    industry: "補助金申請支援会社",
    results: ["業務時間 +2時間/日 創出", "計画書のAI自動生成", "申請成功率の安定化"],
    image: "/images/works/work4.jpg",
  },
  {
    num: "05 / Infrastructure",
    industry: "高圧電気工事会社\n（大阪メトロ等のプロジェクト）",
    results: ["残業 → 0", "役割設計と権限委譲", "現場と本部の情報接続"],
    notable: true,
    image: "/images/works/work5.jpg",
  },
  {
    num: "06 / Public Works",
    industry: "公共工事会社\n（自衛隊関連プロジェクト）",
    results: ["DX基盤の整備", "在宅運用の実現", "セキュアな情報連携"],
    notable: true,
    image: "/images/works/work6.jpg",
  },
];

export function WorksStack() {
  return (
    <section
      id="works"
      className="edl-root bg-[var(--edl-off-white)] border-t border-[var(--edl-line)] py-28 md:py-36 px-6 md:px-16"
    >
      <div className="max-w-[1240px] mx-auto">
        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-20 items-end mb-16 md:mb-20">
          <div>
            <span className="edl-section-num edl-reveal mb-3">
              05 — Works
            </span>
            <h2
              className="edl-headline edl-reveal mt-3"
              data-delay="1"
              style={{ fontSize: "clamp(32px, 3.4vw, 48px)" }}
            >
              導入<span className="accent">実績</span>
              <span className="period">.</span>
            </h2>
          </div>
          <p
            className="edl-reveal text-[15px] text-[var(--edl-muted)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            業種・規模を問わず、現場が &quot;回る&quot; 状態まで伴走しました。
            一例として、これまでお手伝いしたプロジェクトをご紹介します。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.map((w, i) => (
            <article
              key={w.num}
              className="edl-work-item edl-reveal relative flex flex-col bg-white border border-[var(--edl-line)] transition-all duration-500 hover:-translate-y-[3px] hover:shadow-[0_16px_50px_-28px_rgba(11,31,74,0.22)] overflow-hidden"
              data-delay={String((i % 3) + 1)}
            >
              {/* 写真 */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--edl-navy)]">
                <Image
                  src={w.image}
                  alt={w.industry.replace("\n", " ")}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  style={{ filter: "saturate(0.92) contrast(1.04) brightness(0.97)" }}
                />
                {w.notable && (
                  <span className="absolute top-4 right-4 z-10 font-[family-name:var(--font-en)] text-[10px] font-semibold tracking-[0.3em] text-[var(--edl-navy-deep)] uppercase bg-[var(--edl-gold-soft)] px-2.5 py-1">
                    Notable
                  </span>
                )}
              </div>

              {/* 本文 */}
              <div className="flex flex-col flex-1 p-9">
                <span className="block font-[family-name:var(--font-en)] text-[12px] font-semibold tracking-[0.32em] text-[var(--edl-gold)] mb-4">
                  {w.num}
                </span>
                <h3
                  className="edl-jp-keep font-[family-name:var(--font-mincho)] text-[19px] font-semibold text-[var(--edl-navy)] tracking-[0.03em] leading-[1.5] whitespace-pre-line mb-5"
                  style={{ minHeight: "3em" }}
                >
                  {w.industry}
                </h3>

                <ul className="list-none border-t border-[var(--edl-line)] pt-5 mt-auto">
                  {w.results.map((r) => (
                    <li
                      key={r}
                      className="relative pl-5 py-1.5 text-[13.5px] text-[var(--edl-body)] leading-[1.85]"
                    >
                      <span
                        aria-hidden
                        className="absolute top-[14px] left-0 inline-block w-2 h-px bg-[var(--edl-gold)]"
                      />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* hover 時の上端ゴールドライン */}
      <style jsx>{`
        .edl-work-item::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 1px;
          background: var(--edl-gold);
          transition: width 0.5s ease;
        }
        .edl-work-item:hover::before {
          width: 100%;
        }
      `}</style>
    </section>
  );
}
