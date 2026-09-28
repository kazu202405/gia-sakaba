// 日本語を、文の区切り（| の位置）でだけ折り返す。
// 親に PHRASE_WRAP を付けると、| 以外では折り返さない（iOS Safari でも効く：keep-all と <wbr>）。
// 1かたまりが幅に収まらないときだけ、どこででも折り返す（はみ出させない）。

import { Fragment } from "react";

export const PHRASE_WRAP = "break-keep [overflow-wrap:anywhere]";

export function Ph({ text }: { text: string }) {
  return <>{text.split("|").map((part, index) => <Fragment key={index}>{index > 0 && <wbr />}{part}</Fragment>)}</>;
}
