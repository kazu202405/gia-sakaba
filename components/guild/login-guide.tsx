import Link from "next/link";

// 登録したあと「次からどこから入るのか」を伝える案内。入会フォームの上と、確認メール待ちの画面で使う。
export function LoginGuide({ tone = "notice" }: { tone?: "notice" | "success" }) {
  return <div role="status" className={`c-card px-4 py-3 text-sm leading-relaxed ${tone === "success" ? "border-2 border-[#2e7d32]/50" : ""}`}>
    <p className="tracking-wider">次からのログイン先</p>
    <p className="mt-1 break-all"><Link href="/guild/login" className="underline">guild.gia2018.com/guild/login</Link></p>
    <p className="c-muted mt-1 text-xs">登録したメールアドレスとパスワードで入れます。ブックマークかホーム画面に追加しておくと迷いません。</p>
  </div>;
}
