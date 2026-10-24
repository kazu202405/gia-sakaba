// ボタン・リンク・見出し・箇条書きの頭に付ける目印（▶ ◀）。サーバー側でもブラウザ側でも使える。
// 店の見た目で出し分ける：酒場の見た目（tavern）はドットの三角、落ち着いた見た目（plain）は普通の矢印か、何も出さない。
// 切り替えは guild-theme.css の [data-theme] が受け持つ。画面に ▶ ◀ を直接書かず、これを使う（go-mark.test.ts が見張る）。

type GoKind = "next" | "after" | "back" | "bullet";

const MARKS: Record<GoKind, { tavern: string; plain: string }> = {
  /** 文字の前：「▶ 確認する」→ plain では何も出さない */
  next: { tavern: "▶ ", plain: "" },
  /** 文字の後：「すべて見る ▶」→ plain は「すべて見る ›」 */
  after: { tavern: " ▶", plain: " ›" },
  /** 戻る：「◀ なおす」→ plain は「‹ 修正する」 */
  back: { tavern: "◀ ", plain: "‹ " },
  /** 箇条書きの頭 → plain は「・」 */
  bullet: { tavern: "▶ ", plain: "・" },
};

export function Go({ after = false, back = false, bullet = false }: { after?: boolean; back?: boolean; bullet?: boolean }) {
  const mark = MARKS[after ? "after" : back ? "back" : bullet ? "bullet" : "next"];
  return (
    <span className="guild-go" aria-hidden="true">
      <span className="guild-go-tavern">{mark.tavern}</span>
      {mark.plain && <span className="guild-go-plain">{mark.plain}</span>}
    </span>
  );
}
