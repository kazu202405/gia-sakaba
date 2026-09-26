// 入会のつながり（「あなた → Bさん → Aさん → Cさん」）。DBは supabase/migrations/0105_sakaba_invite_path.sql。
// 名前を出さない設定の人は「匿名の会員」、停止中・退会済みの人は「今は在籍していない方」。どちらもリンクにしない。

import Link from "next/link";
import { Fragment } from "react";
import type { InvitePath } from "@/lib/guild/invite-path";
import { Window } from "./cards";

export function InvitePathChain({ path }: { path: InvitePath }) {
  return <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-relaxed">
    {path.nodes.map((node, index) => <Fragment key={index}>
      {index > 0 && <span className="c-label" aria-hidden>→</span>}
      {node.kind === "me" ? <span className="c-label">あなた</span>
        : node.kind === "anonymous" ? <span className="c-muted">匿名の会員</span>
        : node.kind === "former" ? <span className="c-muted">今は在籍していない方</span>
        : <Link href={`/guild/members/${node.id}`} className="underline underline-offset-4">{node.name}さん</Link>}
    </Fragment>)}
  </p>;
}

/** 会員のステータス画面に出す窓。読めなかったときは、空ではなく「読み込めなかった」と出す */
export function InvitePathWindow({ path, isMe, failed = false }: { path: InvitePath | null; isMe: boolean; failed?: boolean }) {
  return <Window title="入会のつながり">
    {failed || !path ? (
      <p role="alert" className="text-sm text-[#c62828]">入会のつながりを読み込めませんでした。</p>
    ) : path.status === "hidden" ? (
      <p className="c-muted text-sm">この方は、入会のつながりを公開していません。</p>
    ) : path.status === "none" || path.nodes.length === 0 ? (
      <p className="c-muted text-sm">入会のつながりは見つかりませんでした。</p>
    ) : (
      <>
        <p className="c-muted mb-3 text-xs leading-relaxed">
          {isMe ? "あなたが、だれの招待で酒場に入ったかのつながりです。" : "酒場は招待制です。あなたとこの方が、招待でどうつながっているかを表しています。"}
        </p>
        <InvitePathChain path={path} />
        {isMe && <p className="c-muted mt-3 text-xs">名前を出さない設定は、マイページで変えられます。</p>}
      </>
    )}
  </Window>;
}
