// 役職「その他」で参加を申請した人・見送られた人に出す画面（0126）。酒場の中（ナビ・名鑑・クエストなど）は一切出さない。
// 文言は lib/guild/approval.ts の APPROVAL_COPY（五島さん確定）。「承認待ち」という言葉は本人向けには出さない。

import { LogoutButton } from "@/components/auth/LogoutButton";
import { Window } from "@/components/guild/cards";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { APPROVAL_COPY } from "@/lib/guild/approval";
import "@/components/guild/guild-theme.css";

export function ApprovalGate({ state }: { state: "pending" | "declined" }) {
  const copy = state === "pending" ? APPROVAL_COPY.pending : APPROVAL_COPY.declined;
  return (
    <main className="guild-theme guild-scene min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12">
      <GuildSceneArt art="tavern" dim />
      <div className="relative z-10 mx-auto max-w-2xl space-y-9">
        <header className="flex items-center justify-between gap-4 border-2 border-[#efe6cf]/70 px-4 py-3 text-sm">
          <span className="guild-px tracking-widest">GIAの酒場</span>
          <LogoutButton redirectTo="/guild/login" />
        </header>
        <Window title={copy.title}>
          <div data-testid={`approval-gate-${state}`} className="space-y-2 text-[15px] leading-loose">
            {copy.lines.map((line) => <p key={line}>{line}</p>)}
          </div>
        </Window>
      </div>
    </main>
  );
}
