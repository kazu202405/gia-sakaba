import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Window } from "@/components/guild/cards";
import { GuildSceneArt } from "@/components/guild/guild-scene-art";
import { GUILD_ROOT, outsideStorePath } from "@/lib/guild/store-path";
import "@/components/guild/guild-theme.css";
import { Go } from "./go-mark";

// ログインはしているが、この店の会員ではない人に出す画面。
// 入る道（招待リンク）と、ほかの店の会員なら /guild（入っている店へ移る入口）への戻り道を必ず出す。
export function NotMemberNotice({ storeName, showEntryLink = true, tavern = true }: { storeName: string; showEntryLink?: boolean; tavern?: boolean }) {
  return (
    <main className={tavern ? "guild-theme guild-scene min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12" : "guild-theme min-h-screen px-4 py-8 pb-16 sm:px-6 sm:py-12"}>
      {tavern && <GuildSceneArt art="tavern" dim />}
      <div className="relative z-10 mx-auto max-w-2xl space-y-9">
        <header className="flex items-center justify-between gap-4 border-2 border-guild-scene-text/70 px-4 py-3 text-sm">
          <span className="guild-px tracking-widest">{storeName}</span>
          <LogoutButton redirectTo={outsideStorePath("login")} />
        </header>
        <Window title={showEntryLink ? "この酒場の会員ではありません" : "まだ酒場に入っていません"}>
          <div className="space-y-3 text-[15px] leading-loose">
            <p>{showEntryLink ? `いまのアカウントは、${storeName}の会員ではありません。` : "いまのアカウントは、どの酒場にも入っていません。"}</p>
            <p>入るには、招待してくれた人から届いた招待リンクを開いてください。</p>
            {showEntryLink && <p>ほかの酒場の会員の方は、下のリンクから入っている酒場に移れます。</p>}
          </div>
          {showEntryLink && <div className="mt-6">
            <Link href={GUILD_ROOT} className="c-button-sub inline-flex min-h-12 items-center px-5"><Go />入っている酒場へ</Link>
          </div>}
        </Window>
      </div>
    </main>
  );
}
