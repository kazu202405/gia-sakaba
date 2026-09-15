"use client";

/**
 * TrustStrip — Editorial 4列ストリップ
 * Industries / Notable / Approach / Method を金線つきラベルで並べる。
 */
const items = [
  { label: "Industries", value: "6業種で導入実績" },
  { label: "Notable", value: "大阪メトロ・自衛隊関連" },
  { label: "Approach", value: "設計から定着まで一気通貫" },
  { label: "Method", value: "行動心理学 × AI" },
];

export function TrustStrip() {
  return (
    <section className="edl-root bg-white border-t border-b border-[var(--edl-line)] py-10 md:py-12">
      <div className="max-w-[1240px] mx-auto px-6 md:px-16">
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 list-none">
          {items.map((item, i) => (
            <li
              key={item.label}
              className={`edl-reveal relative pl-7 ${
                i < items.length - 1
                  ? "lg:border-r lg:border-[var(--edl-line)] lg:pr-6"
                  : ""
              }`}
              data-delay={String(i + 1)}
            >
              <span className="absolute top-[6px] left-0 inline-block w-3.5 h-px bg-[var(--edl-gold)]" />
              <span className="block font-[family-name:var(--font-en)] text-[10px] font-semibold tracking-[0.32em] text-[var(--edl-muted)] uppercase mb-2">
                {item.label}
              </span>
              <span className="block font-[family-name:var(--font-mincho)] text-base font-semibold text-[var(--edl-navy)] tracking-[0.02em] leading-snug">
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
