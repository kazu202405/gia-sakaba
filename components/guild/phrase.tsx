// 日本語を、文の区切り（| の位置）でだけ折り返す。
// 親に PHRASE_WRAP を付けると、| 以外では折り返さない（iOS Safari でも効く：keep-all と <wbr>）。
// 1かたまりが幅に収まらないときだけ、どこででも折り返す（はみ出させない）。
// keep：かたまりの中の「・」「、」でも折り返さない（Chrome は keep-all でも記号の後ろで折り返すため）。かたまりは幅より短く書く。

import { Fragment } from "react";

export const PHRASE_WRAP = "break-keep [overflow-wrap:anywhere]";

export function Ph({ text, keep = false }: { text: string; keep?: boolean }) {
  if (keep) return <>{text.split("|").map((part, index) => <span key={index} className="inline-block max-w-full">{part}</span>)}</>;
  return <>{text.split("|").map((part, index) => <Fragment key={index}>{index > 0 && <wbr />}{part}</Fragment>)}</>;
}
