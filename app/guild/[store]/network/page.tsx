import Link from "next/link";
import { ConstructionField, ConstructionFields } from "@/components/guild/construction/fields";
import { ConstructionForm } from "@/components/guild/construction/forms";
import { IntroReplyButtons } from "@/components/guild/construction/intro-reply";
import { requestConstructionIntro } from "@/lib/guild/construction-actions";
import { constructionId, type ConstructionCandidate, type ConstructionConnection, type ConstructionIntro } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { listGuildMembers } from "@/lib/guild/server-data";

// やり取り＝紹介のおねがいだけ。知り合い・公開範囲・会員検索は /me/network に移した（見本 /guild-look/sns と同じ分け方）
const statuses: Record<ConstructionIntro["status"], string> = {
  requested: "紹介する人の返事待ち", asking_target: "紹介先の返事待ち", connected: "知り合いになりました",
  declined_by_introducer: "紹介する人が辞退", declined_by_target: "紹介先が辞退",
};

const emptyTexts: Record<string, string> = {
  incoming: "返事をしていないおねがいは、ありません",
  replied: "返事をした紹介は、まだありません",
  sent: "紹介を頼んだ記録は、まだありません",
  history: "紹介のやり取りは、まだありません",
};

function feeDescription(intro: ConstructionIntro): string | null {
  switch (intro.fee_kind) {
    case "none": return "紹介料なし";
    case "fixed": return "紹介料 " + Number(intro.fee_value).toLocaleString("ja-JP") + "円";
    case "percent": return "紹介料 成約時 " + intro.fee_value + "%";
    case "discuss": return "紹介料は相談して決定";
    default: return null;
  }
}

// 顔の代わりの頭文字（見本の sn-fc と同じ丸）
function Initial({ name }: { name: string }) {
  return <span className="sn-fc" data-kind="other" aria-hidden="true">{Array.from(name).slice(0, 2).join("")}</span>;
}

export default async function ConstructionNetworkPage({ searchParams }: { searchParams: Promise<{ via?: string; tab?: string }> }) {
  const { store, userId } = await constructionContext();
  const { via, tab } = await searchParams;
  const [members, connections, intros] = await Promise.all([
    listGuildMembers(),
    constructionRows<ConstructionConnection>("sakaba_construction_list_my_connections"),
    constructionRows<ConstructionIntro>("sakaba_construction_list_intros"),
  ]);
  const byId = new Map(members.map((member) => [member.id, member.display_name]));
  const name = (id: string) => byId.get(id) ?? "酒場の会員";
  const viaId = constructionId.safeParse(via);
  const introducer = viaId.success && connections.some((connection) => connection.friend_id === viaId.data && connection.status === "connected")
    ? viaId.data : null;
  const candidates = introducer ? await constructionRows<ConstructionCandidate>("sakaba_construction_list_intro_candidates", { p_introducer_id: introducer }) : [];
  const incoming = intros.filter((intro) => (intro.introducer_id === userId && intro.status === "requested")
    || (intro.target_id === userId && intro.status === "asking_target"));
  const tabs = [
    { key: "incoming", name: "届いた", items: incoming },
    { key: "replied", name: "返事した", items: intros.filter((intro) => intro.events.some((event) => event.status !== "requested" && event.actor_id === userId)) },
    { key: "sent", name: "送った", items: intros.filter((intro) => intro.requester_id === userId) },
    { key: "history", name: "記録", items: intros },
  ] as const;
  const selected = tabs.find((item) => item.key === tab) ?? tabs[0];
  return <div className="sn-page sn-page--search">
    <nav className="sn-tabs" aria-label="やり取り">
      {tabs.map((item) => <Link key={item.key} className="sn-live-tab" aria-current={item.key === selected.key ? "page" : undefined}
        href={store.path("/network?tab=" + item.key)}>{item.name}{item.items.length > 0 && " " + item.items.length}</Link>)}
    </nav>

    {introducer && <section id="intro-candidates" className="sn-sec">
      <div className="sn-sec-h"><h2>{name(introducer)}さんに紹介を頼む</h2><Link href={store.path("/network")}>やめる</Link></div>
      {candidates.length ? <div className="sn-list">{candidates.map((candidate) => (
        <div className="sn-row" key={candidate.route_id}>
          <Initial name={candidate.label} />
          <div className="sn-row-body">
            <p className="sn-row-title">{candidate.label}{candidate.masked && candidate.label !== "氏名非公開" ? "（氏名非公開）" : ""}</p>
            <ConstructionForm action={requestConstructionIntro} submit="紹介を依頼する" className="mt-2">
              <input type="hidden" name="via" value={introducer} /><input type="hidden" name="route" value={candidate.route_id} />
              <ConstructionFields><ConstructionField label="紹介の用件"><textarea name="note" required maxLength={200} rows={2} /></ConstructionField></ConstructionFields>
            </ConstructionForm>
          </div>
        </div>
      ))}</div> : <p className="sn-empty">紹介を頼める候補はまだいません</p>}
    </section>}

    <section id="introductions">
      {selected.items.length ? <div className="sn-list">{selected.items.map((intro) => {
        const isIntroducer = intro.introducer_id === userId && intro.status === "requested";
        const isTarget = intro.target_id === userId && intro.status === "asking_target";
        const requester = name(intro.requester_id);
        const introducerName = name(intro.introducer_id);
        const target = intro.target_id ? name(intro.target_id) : "氏名非公開の方";
        const fee = feeDescription(intro);
        const replies = intro.events.filter((event) => event.status !== "requested");
        return <div className="sn-row" key={intro.id}>
          <Initial name={isTarget ? introducerName : requester} />
          <div className="sn-row-body">
            {isIntroducer ? <p><b>{requester}さん</b>から、<b>{target}さん</b>への紹介依頼が届いています</p>
              : isTarget ? <p><b>{introducerName}さん</b>が、<b>{requester}さん</b>を紹介したいそうです{fee && <span className="sn-meta">（{fee}）</span>}</p>
              : <p><b>{requester}さん</b> → <b>{introducerName}さん</b> → <b>{target}</b></p>}
            {intro.note && <>
              {isTarget && <p className="sn-meta">{requester}さんの用件</p>}
              <p className="sn-say whitespace-pre-wrap break-words">{intro.note}</p>
            </>}
            <p className="sn-meta">{statuses[intro.status]}{fee && !isTarget && "・" + fee}</p>
            {replies.length > 0 && <ul className="sn-log-events">{replies.map((event) => (
              <li className="whitespace-pre-wrap break-words" key={event.status}>{statuses[event.status]}{event.note && "：" + event.note}</li>
            ))}</ul>}
            {(isIntroducer || isTarget) && <IntroReplyButtons id={intro.id} introducer={isIntroducer} requesterName={requester} targetName={target} />}
          </div>
        </div>;
      })}</div> : <div className="sn-empty">
        <p>{emptyTexts[selected.key]}</p>
        <p className="sn-empty-act"><Link href={store.path("/me/network")} className="sn-btn sn-btn--main">知り合いを探す</Link></p>
      </div>}
    </section>
  </div>;
}
