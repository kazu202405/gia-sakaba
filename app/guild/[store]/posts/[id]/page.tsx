import { MapPin, Package, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { ConstructionField, ConstructionFields } from "@/components/guild/construction/fields";
import { ConstructionForm } from "@/components/guild/construction/forms";
import { replyToConstructionPost, withdrawConstructionPost } from "@/lib/guild/construction-actions";
import { constructionId, type ConstructionPost, type ConstructionReply } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { ANSWER_LABEL, areaText, categoryLabel, visibilityLabel } from "@/lib/guild/look/sns-mock";
import { listGuildMembers } from "@/lib/guild/server-data";

export default async function ConstructionPostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = constructionId.safeParse((await params).id);
  if (!id.success) notFound();
  const { userId } = await constructionContext();
  const [post] = await constructionRows<ConstructionPost>("sakaba_construction_list_posts", { p_post_id: id.data, p_limit: 1 });
  if (!post) notFound();
  const [replies, people] = await Promise.all([
    constructionRows<ConstructionReply>("sakaba_construction_list_replies", { p_post_id: id.data }),
    listGuildMembers(),
  ]);
  const names = new Map(people.map((person) => [person.id, person.display_name]));
  const mine = post.author_id === userId;
  const closed = post.deadline !== null && post.deadline < new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const available = (["can", "know"] as const).filter((kind) => !replies.some((reply) => reply.author_id === userId && reply.kind === kind));
  return (
    <div className="sn-page sn-page--search">
      <div className="sn-hero">
        <p className="sn-meta">{names.get(post.author_id) ?? "酒場の会員"}</p>
        <h1 className="sn-want-title">{post.title}</h1>
        <p className="sn-meta">{post.industry} · {categoryLabel(post.category)}</p>
      </div>
      <div className="sn-facts">
        <div><MapPin aria-hidden /><span>探している場所</span><b>{areaText(post.areas)}</b></div>
        <div><Package aria-hidden /><span>公開範囲</span><b>{visibilityLabel(post.visibility)}</b></div>
        <div><Clock aria-hidden /><span>返事の期限</span><b>{post.deadline ?? "決めていません"}</b></div>
      </div>
      <div className="sn-story sn-story--plain"><div><p className="sn-k">内容</p><p className="sn-v whitespace-pre-wrap break-words">{post.body}</p></div></div>
      <dl className="sn-dl"><div><dt>問い合わせ先</dt><dd className="whitespace-pre-wrap break-words">{post.contact}</dd></div></dl>
      <section className="sn-sec" aria-label="みんなの返信">
        <h2 className="mb-2 font-bold">みんなの返信（{replies.length}件）</h2>
        {replies.length ? <ul className="divide-y">{replies.map((reply) => (
          <li className="space-y-1 py-3" key={reply.author_id + reply.kind}>
            <p className="text-sm font-bold">{names.get(reply.author_id) ?? "酒場の会員"} · {ANSWER_LABEL[reply.kind]}</p>
            <p className="whitespace-pre-wrap break-words">{reply.note}</p>
          </li>
        ))}</ul> : <p className="text-sm c-muted">まだ返信はありません。</p>}
      </section>
      <div className="sn-sec">{mine ? <details><summary className="cursor-pointer underline">案件の取り下げ</summary><ConstructionForm action={withdrawConstructionPost} submit="この案件を取り下げる"><input type="hidden" name="post_id" value={post.id} /></ConstructionForm></details>
        : closed ? <p>返信の受付は終了しました。</p>
        : available.length ? <ConstructionForm action={replyToConstructionPost} submit="返信する">
          <input type="hidden" name="post_id" value={post.id} />
          <ConstructionFields>
            <ConstructionField label="返信の種類"><select key={available.join()} name="kind">{available.map((kind) => <option key={kind} value={kind}>{ANSWER_LABEL[kind]}</option>)}</select></ConstructionField>
            <ConstructionField label="返信"><textarea name="note" required maxLength={200} rows={3} /></ConstructionField>
          </ConstructionFields>
        </ConstructionForm> : <p>返信済みです。</p>}</div>
    </div>
  );
}
