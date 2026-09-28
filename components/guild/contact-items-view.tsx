// 人ごとの連絡先を並べる（メンバーのステータス・つながり申請）。
// 「承認した人だけ」でまだ見られないものは、種類だけを鍵つきで出す（値はDBから渡ってこない）。

import { contactItemLabel, safeContactHref, type ViewContactItem } from "@/lib/guild/contact-items";

export function ContactItemsView({ items, className }: { items: ViewContactItem[]; className?: string }) {
  if (items.length === 0) return null;
  return <ul className={`space-y-1.5 text-[15px] ${className ?? ""}`}>
    {items.map((item, index) => {
      const label = contactItemLabel(item);
      const href = item.locked ? null : safeContactHref(item);
      return <li key={`${item.kind}-${index}`} className="flex min-w-0 flex-wrap items-baseline gap-x-3">
        <span className="c-label shrink-0 text-xs">{label}</span>
        {item.locked
          ? <span className="c-muted text-xs">🔒 つながった人にだけ表示</span>
          : href
            ? <a href={href} target={item.kind === "email" ? undefined : "_blank"} rel="noopener noreferrer" className="min-w-0 break-all underline underline-offset-2">{item.kind === "email" ? item.value : "開く ↗"}</a>
            : <span className="min-w-0 break-all">{item.value}</span>}
      </li>;
    })}
  </ul>;
}
