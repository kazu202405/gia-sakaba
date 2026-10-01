// 入会・有料プランの申し込みで見せる「規約へのリンク」と「契約の要点」。
// 入会フォーム・集まりからの入会・会員プラン画面の3か所で同じものを使う（文言を揃えるため）。
//
// ⚠️ リンクは新しいタブで開く。同じタブで開くと、書きかけの入会フォームが消える。
// ⚠️ 要点は申し込みの最後の画面で見せる内容（特商法の最終確認画面の表示）。
//    料金・更新・解約・返金は /terms 第5・6条と /tokushoho と揃える。変えたら3か所とも直す。

const LINKS = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/tokushoho", label: "特定商取引法に基づく表記" },
] as const;

export function LegalLinks({ withTokushoho = false }: { withTokushoho?: boolean }) {
  const links = withTokushoho ? LINKS : LINKS.filter((link) => link.href !== "/tokushoho");
  return <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
    {links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{link.label}</a>)}
  </p>;
}

export const BILLING_POINTS = [
  "プラスプランは月額480円、ビジネスプランは月額880円（どちらも税込）です。",
  "申し込んだ日に初回分を決済し、以降は解約するまで毎月同じ日に自動で更新されます。無料体験はありません。",
  "解約は、マイページの支払い管理からいつでもできます。解約しても、次の更新日の前日までは使えます。",
  "途中で解約しても、支払い済みの料金は返金されません（日割りの返金もありません）。",
  "プランを変えるときの請求額は、変更の確認画面に表示されます。",
] as const;

export function BillingPoints() {
  return <ul className="space-y-1.5 text-sm leading-relaxed">
    {BILLING_POINTS.map((point) => <li key={point} className="flex gap-2"><span aria-hidden="true">▶</span><span className="min-w-0">{point}</span></li>)}
  </ul>;
}
