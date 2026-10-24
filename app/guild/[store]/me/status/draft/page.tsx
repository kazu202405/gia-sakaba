import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle, Window } from "@/components/guild/cards";
import { ProfileDraftReview } from "@/components/guild/profile-draft-review";
import { getMyProfileDraft } from "@/lib/guild/server-data";
import { currentStore } from "@/lib/guild/current-store";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await currentStore()).w("status.draftTitle") };
}

export default async function ProfileDraftPage() {
  const store = await currentStore();
  const result = await getMyProfileDraft();
  return <div className="mx-auto max-w-2xl space-y-7">
    <PageTitle title={store.w("status.draftTitle")} lead="あなたの代わりに書かれた下書きを見て、載せるかどうか選べます。" />
    {!result.ok
      ? <Window title="読み込めませんでした"><p className="text-sm leading-relaxed">下書きを読み込めませんでした。時間をおいて、もう一度開いてください。</p></Window>
      : result.draft
        ? <ProfileDraftReview draft={result.draft} />
        : <Window title="届いている下書きはありません">
          <p className="text-sm leading-relaxed">いま届いている下書きはありません。すでに選んだ下書きは、ここには残りません。</p>
          <p className="mt-4"><Link href={store.path("/me/status")} className="underline underline-offset-4">{store.w("status.editButton")}</Link></p>
        </Window>}
  </div>;
}
