"use client";

import { ArrowUpRight } from "lucide-react";

const serviceGroups = [
  {
    phase: "見える",
    label: "Observe",
    note: "業務の現在地",
    services: [
      {
        nameParts: ["業務フロー診断"],
        meta: "可視化",
        desc: "誰が・何を・どの順で動くかを整理し、詰まりを可視化します。",
      },
      {
        nameParts: ["業務改善", "ダッシュボード"],
        meta: "計測",
        desc: "KPIと日々の業務をつなぎ、改善を同じ数字で追える状態にします。",
      },
    ],
  },
  {
    phase: "決める",
    label: "Design",
    note: "人とAIの役割",
    services: [
      {
        nameParts: ["AI活用設計"],
        meta: "役割設計",
        desc: "AIが効く場所を判定し、人が担う仕事との境界を設計します。",
      },
      {
        nameParts: ["DX設計", "ワークショップ"],
        meta: "共創設計",
        desc: "経営と現場が同じ地図を持ち、自社で動かせるDX計画を描きます。",
      },
    ],
  },
  {
    phase: "回す",
    label: "Embed",
    note: "日常の運用",
    services: [
      {
        nameParts: ["業務定着", "プログラム"],
        meta: "習慣化",
        desc: "オンボーディングから習慣化まで、使われ続ける運用を整えます。",
      },
      {
        nameParts: ["顧客管理・営業支援", "アプリ"],
        meta: "実装",
        desc: "顧客管理・見積・営業フローを、日々開かれるアプリに実装します。",
      },
    ],
  },
];

function OperatingMap() {
  return (
    <div className="service-map relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden bg-[var(--edl-navy-deep)] text-white shadow-[0_32px_80px_-48px_rgba(5,14,38,0.72)] lg:mx-0">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgba(184,153,104,.16), transparent 34%), linear-gradient(145deg, transparent 40%, rgba(11,31,74,.55))",
        }}
      />

      <div className="absolute left-6 right-6 top-6 z-[2] flex items-center justify-between border-b border-white/15 pb-4 md:left-8 md:right-8 md:top-8">
        <span className="font-[family-name:var(--font-en)] text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--edl-gold-soft)]">
          GIA Operating Map
        </span>
        <span className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.2em] text-white/40">
          3 Phases / 6 Fields
        </span>
      </div>

      <svg
        aria-hidden
        viewBox="0 0 360 440"
        className="absolute inset-[13%_8%_8%] h-[79%] w-[84%]"
        fill="none"
      >
        <defs>
          <marker
            id="service-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8Z" fill="#B89968" />
          </marker>
        </defs>
        <path
          d="M180 42C274 50 322 124 299 214"
          stroke="rgba(255,255,255,.24)"
          strokeWidth="1.2"
          markerEnd="url(#service-arrow)"
        />
        <path
          d="M290 246C258 340 154 376 76 310"
          stroke="rgba(255,255,255,.24)"
          strokeWidth="1.2"
          markerEnd="url(#service-arrow)"
        />
        <path
          d="M57 279C12 187 51 82 145 48"
          stroke="rgba(255,255,255,.24)"
          strokeWidth="1.2"
          markerEnd="url(#service-arrow)"
        />
      </svg>

      <div className="absolute left-1/2 top-[47%] z-[2] flex size-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--edl-gold)]/55 bg-[rgba(5,14,38,.76)] text-center md:size-44">
        <span aria-hidden className="service-map-ring absolute inset-2 rounded-full border border-dashed border-white/20" />
        <div className="relative">
          <span className="block font-[family-name:var(--font-en)] text-[9px] uppercase tracking-[0.28em] text-[var(--edl-gold-soft)]">
            At the center
          </span>
          <strong className="mt-2 block font-[family-name:var(--font-mincho)] text-[24px] font-medium leading-snug md:text-[29px]">
            現場で
            <br />
            回る
          </strong>
        </div>
      </div>

      {[
        { phase: "見える", label: "Observe", position: "left-1/2 top-[17%] -translate-x-1/2" },
        { phase: "決める", label: "Design", position: "right-[7%] top-[66%]" },
        { phase: "回す", label: "Embed", position: "left-[7%] top-[66%]" },
      ].map((item) => (
        <div key={item.label} className={`absolute z-[3] ${item.position}`}>
          <div className="min-w-24 border border-white/20 bg-[rgba(5,14,38,.88)] px-4 py-3 text-center backdrop-blur-sm">
            <span className="block font-[family-name:var(--font-en)] text-[8px] uppercase tracking-[0.24em] text-[var(--edl-gold-soft)]">
              {item.label}
            </span>
            <strong className="mt-1 block font-[family-name:var(--font-mincho)] text-[15px] font-medium md:text-[17px]">
              {item.phase}
            </strong>
          </div>
        </div>
      ))}

      <span className="absolute bottom-6 left-6 z-[2] font-[family-name:var(--font-en)] text-[8px] uppercase tracking-[0.24em] text-white/35 md:bottom-8 md:left-8">
        Diagnose / Design / Build / Embed
      </span>
    </div>
  );
}

export function BehavioralServices() {
  return (
    <section
      id="services"
      className="edl-root overflow-hidden bg-[var(--edl-off-white)] px-6 py-24 md:px-16 md:py-32"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-14 grid grid-cols-1 items-end gap-8 md:mb-20 md:grid-cols-[1fr_1.4fr] md:gap-20">
          <div>
            <span className="edl-section-num edl-reveal mb-3">03 — Service</span>
            <h2
              className="edl-headline edl-reveal mt-3"
              data-delay="1"
              style={{ fontSize: "clamp(32px, 3.4vw, 48px)" }}
            >
              対応<span className="accent">領域</span>
              <span className="period">.</span>
            </h2>
          </div>
          <div className="edl-reveal" data-delay="2">
            <p className="font-[family-name:var(--font-mincho)] text-[20px] font-semibold leading-[1.7] text-[var(--edl-navy)] md:text-[24px]">
              <span className="inline-block">6つのメニューではなく、</span>
              <span className="inline-block">仕組みが回るための3つの循環。</span>
            </p>
            <p className="mt-4 max-w-[52ch] text-[14px] text-[var(--edl-muted)]" style={{ lineHeight: 1.9 }}>
              見える状態をつくり、役割を決め、日常の運用に根づかせる。必要な領域だけを組み合わせて支援します。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)] lg:gap-16 xl:gap-20">
          <div className="edl-reveal w-full self-center" data-delay="1">
            <OperatingMap />
          </div>

          <div className="edl-reveal border-t border-[var(--edl-line)]" data-delay="2">
            {serviceGroups.map((group) => (
              <section
                key={group.label}
                className="grid grid-cols-1 border-b border-[var(--edl-line)] py-9 md:grid-cols-[128px_1fr] md:gap-8 md:py-11"
              >
                <div className="mb-7 md:mb-0">
                  <span className="font-[family-name:var(--font-en)] text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--edl-gold)]">
                    {group.label}
                  </span>
                  <h3 className="mt-2 font-[family-name:var(--font-mincho)] text-[25px] font-semibold text-[var(--edl-navy)]">
                    {group.phase}
                  </h3>
                  <span className="mt-2 block text-[11px] text-[var(--edl-muted)]">
                    {group.note}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-0">
                  {group.services.map((service, index) => (
                    <a
                      key={service.nameParts.join("")}
                      href="#contact"
                      className={`group/item relative block text-inherit no-underline sm:px-6 ${
                        index === 0
                          ? "sm:border-r sm:border-[var(--edl-line)] sm:pl-0"
                          : "sm:pr-0"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-[family-name:var(--font-en)] text-[9px] uppercase tracking-[0.22em] text-[var(--edl-muted)]">
                            {service.meta}
                          </span>
                          <h4 className="mt-2 font-[family-name:var(--font-mincho)] text-[18px] font-semibold leading-[1.55] text-[var(--edl-navy)] transition-colors group-hover/item:text-[var(--edl-gold)] md:text-[20px]">
                            {service.nameParts.map((part) => (
                              <span key={part} className="inline-block">
                                {part}
                              </span>
                            ))}
                          </h4>
                        </div>
                        <ArrowUpRight className="mt-1 size-4 shrink-0 text-[var(--edl-muted)] transition-all duration-300 group-hover/item:-translate-y-1 group-hover/item:translate-x-1 group-hover/item:text-[var(--edl-gold)]" strokeWidth={1.5} />
                      </div>
                      <p className="mt-4 text-[13.5px] text-[var(--edl-muted)]" style={{ lineHeight: 1.9 }}>
                        {service.desc}
                      </p>
                      <span className="mt-6 block h-px w-0 bg-[var(--edl-gold)] transition-all duration-500 group-hover/item:w-full" />
                    </a>
                  ))}
                </div>
              </section>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-5 pt-8">
              <span className="text-[12px] text-[var(--edl-muted)]">相談内容に合わせて、組み合わせをご提案します。</span>
              <a href="#contact" className="edl-cta-secondary">
                対応領域を相談する
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .service-map-ring {
          animation: service-map-spin 18s linear infinite;
        }

        @keyframes service-map-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .service-map-ring {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
