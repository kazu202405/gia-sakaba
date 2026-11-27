import Link from "next/link";
import { ConstructionField, ConstructionFields, ConstructionPanel } from "@/components/guild/construction/fields";
import { ConstructionForm } from "@/components/guild/construction/forms";
import { answerConstructionIntro, changeConstructionConnection, requestConstructionIntro, setConstructionNetworkVisibility } from "@/lib/guild/construction-actions";
import { constructionId, type ConstructionCandidate, type ConstructionConnection, type ConstructionIntro } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { listGuildMembers } from "@/lib/guild/server-data";

const statuses: Record<ConstructionIntro["status"], string> = {
  requested: "紹介する人の返事待ち", asking_target: "紹介先の返事待ち", connected: "知り合いになりました",
  declined_by_introducer: "紹介する人が辞退", declined_by_target: "紹介先が辞退",
};

const visibilityLabels = { open: "直接連絡OK", intro: "紹介経由のみ", masked: "名前を伏せる", hidden: "非表示" };
type Level = keyof typeof visibilityLabels;
type NetworkSettings = { default_level: Level; overrides: Record<string, Level> };

function ConnectionAction({ id, intent, label }: { id: string; intent: "request" | "accept" | "decline"; label: string }) {
  return <ConstructionForm action={changeConstructionConnection} submit={label}>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="intent" value={intent} />
  </ConstructionForm>;
}

function VisibilityForm({ friend, level }: { friend?: string; level: Level | "default" }) {
  return <ConstructionForm action={setConstructionNetworkVisibility} submit="公開範囲を保存">
    {friend && <input type="hidden" name="friend" value={friend} />}
    <ConstructionFields><ConstructionField label={friend ? "この知り合いの公開範囲" : "人脈の初期公開範囲"}><select name="level" defaultValue={level} key={level}>
      {friend && <option value="default">初期設定を使う</option>}
      {Object.entries(visibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></ConstructionField></ConstructionFields>
  </ConstructionForm>;
}

function IntroResponse({ id, introducer }: { id: string; introducer: boolean }) {
  return <div className="space-y-3">
    <details><summary className="cursor-pointer font-bold">紹介を承認する</summary>
      <ConstructionForm action={answerConstructionIntro} submit="承認する" className="mt-2">
        <input type="hidden" name="id" value={id} /><input type="hidden" name="answer" value="accept" />
        <ConstructionFields>
          {introducer && <>
            <ConstructionField label="紹介料の条件"><select name="fee" defaultValue="none"><option value="none">なし</option><option value="fixed">固定額（円）</option><option value="percent">成約時の割合（%）</option><option value="discuss">相談して決める</option></select></ConstructionField>
            <ConstructionField label="固定額または割合（該当する場合）"><input name="value" type="number" min="0" step="any" /></ConstructionField>
          </>}
          <ConstructionField label="ひとこと（任意）"><textarea name="note" maxLength={200} rows={2} /></ConstructionField>
        </ConstructionFields>
      </ConstructionForm>
    </details>
    <details><summary className="cursor-pointer">辞退する</summary><ConstructionForm action={answerConstructionIntro} submit="辞退する" className="mt-2">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="answer" value="decline" />
      <ConstructionFields><ConstructionField label="ひとこと（任意）"><textarea name="note" maxLength={200} rows={2} /></ConstructionField></ConstructionFields>
    </ConstructionForm></details>
  </div>;
}

function feeDescription(intro: ConstructionIntro): string | null {
  switch (intro.fee_kind) {
    case "none": return "紹介料なし";
    case "fixed": return "紹介料 " + Number(intro.fee_value).toLocaleString("ja-JP") + "円";
    case "percent": return "紹介料 成約時 " + intro.fee_value + "%";
    case "discuss": return "紹介料は相談して決定";
    default: return null;
  }
}

export default async function ConstructionNetworkPage({ searchParams }: { searchParams: Promise<{ via?: string; q?: string }> }) {
  const { db, store, userId } = await constructionContext();
  const { via, q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const [members, connections, intros, settingsResult] = await Promise.all([
    listGuildMembers(),
    constructionRows<ConstructionConnection>("sakaba_construction_list_my_connections"),
    constructionRows<ConstructionIntro>("sakaba_construction_list_intros"),
    db.rpc("sakaba_construction_get_network_visibility"),
  ]);
  if (settingsResult.error || !settingsResult.data) throw new Error("人脈の公開範囲を取得できませんでした。");
  const settings = settingsResult.data as NetworkSettings;
  const byId = new Map(members.map((member) => [member.id, member.display_name]));
  const name = (id: string) => byId.get(id) ?? "酒場の会員";
  const ids = new Set(connections.map((connection) => connection.friend_id));
  const viaId = constructionId.safeParse(via);
  const introducer = viaId.success && connections.some((connection) => connection.friend_id === viaId.data && connection.status === "connected")
    ? viaId.data : null;
  const candidates = introducer ? await constructionRows<ConstructionCandidate>("sakaba_construction_list_intro_candidates", { p_introducer_id: introducer }) : [];
  const searchable = members.filter((member) => member.id !== userId && !ids.has(member.id) && (
    !query || [member.display_name, member.name_kana ?? "", member.industry, member.region].join(" ").includes(query)
  ));
  return <div className="space-y-6">
    <ConstructionPanel title="知り合い">
      <div className="flex flex-wrap gap-4 text-sm"><Link className="underline" href={store.path("/network/company")}>会社情報を登録・編集</Link><Link className="underline" href={store.path("/me")}>自分のプロフィール</Link></div>
      <details><summary className="cursor-pointer">人脈の公開範囲</summary><VisibilityForm level={settings.default_level} /></details>
      {connections.length ? <ul className="divide-y">{connections.map((connection) => (
        <li className="space-y-2 py-3" key={connection.id}>
          <Link className="font-bold underline" href={store.path("/members/" + connection.friend_id)}>{name(connection.friend_id)}</Link>
          {connection.status === "connected" ? <>
            <Link className="block text-sm underline" href={store.path("/network?via=" + connection.friend_id + "#intro-candidates")}>紹介を頼む</Link>
            <details className="text-sm"><summary className="cursor-pointer">この知り合いの公開範囲</summary><VisibilityForm friend={connection.friend_id} level={settings.overrides[connection.friend_id] ?? "default"} /></details>
          </> : connection.status === "pending" && connection.requested_by !== userId ? <>
            <p className="text-sm">つながりの申請が届いています。</p>
            <div className="flex flex-wrap gap-2"><ConnectionAction id={connection.id} intent="accept" label="承認する" /><ConnectionAction id={connection.id} intent="decline" label="見送る" /></div>
          </> : <p className="text-sm c-muted">{connection.status === "pending" ? "承認待ち" : "申請は見送られました"}</p>}
        </li>
      ))}</ul> : <p>まだ知り合いはいません。名簿からつながりを申請できます。</p>}
      <details open={query ? true : undefined}>
        <summary className="cursor-pointer font-bold">会員を探す</summary>
        <form action={store.path("/network")} className="my-3 flex flex-wrap items-end gap-2">
          <ConstructionFields><ConstructionField label="名前・業種・地域"><input type="text" name="q" maxLength={100} defaultValue={query} /></ConstructionField></ConstructionFields>
          <button type="submit" className="c-button-main px-4 py-2">探す</button>
        </form>
        {searchable.length ? <ul className="divide-y">{searchable.slice(0, 25).map((member) => (
          <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={member.id}>
            <Link className="underline" href={store.path("/members/" + member.id)}>{member.display_name}</Link>
            <ConnectionAction id={member.id} intent="request" label="つながりを申請" />
          </li>
        ))}</ul> : <p className="text-sm c-muted">申請できる会員が見つかりませんでした。</p>}
        {searchable.length > 25 && <p className="text-sm c-muted">先頭25人を表示しています。名前などで絞り込めます。</p>}
      </details>
    </ConstructionPanel>

    {introducer && <section id="intro-candidates"><ConstructionPanel title={name(introducer) + "さんに紹介を頼む"}>
      {candidates.length ? <ul className="divide-y">{candidates.map((candidate) => (
        <li key={candidate.route_id} className="py-3">
          <p className="mb-2 font-bold">{candidate.label}{candidate.masked && candidate.label !== "氏名非公開" ? "（氏名非公開）" : ""}</p>
          <ConstructionForm action={requestConstructionIntro} submit="紹介を依頼する">
            <input type="hidden" name="via" value={introducer} /><input type="hidden" name="route" value={candidate.route_id} />
            <ConstructionFields><ConstructionField label="紹介の用件"><textarea name="note" required maxLength={200} rows={2} /></ConstructionField></ConstructionFields>
          </ConstructionForm>
        </li>
      ))}</ul> : <p>紹介を頼める候補はまだいません。</p>}
    </ConstructionPanel></section>}

    <ConstructionPanel title="紹介のやり取り">
      {intros.length ? <ul className="divide-y">{intros.map((intro) => {
        const isIntroducer = intro.introducer_id === userId && intro.status === "requested";
        const isTarget = intro.target_id === userId && intro.status === "asking_target";
        return <li className="space-y-3 py-4" key={intro.id}>
          <p className="font-bold">{name(intro.requester_id)} → {name(intro.introducer_id)} → {intro.target_id ? name(intro.target_id) : "氏名非公開"}</p>
          <p className="text-sm c-muted">{statuses[intro.status]}</p>
          <p className="whitespace-pre-wrap break-words">{intro.note}</p>
          {feeDescription(intro) && <p className="text-sm">{feeDescription(intro)}</p>}
          {intro.events.some((event) => event.status !== "requested") && <details><summary className="cursor-pointer">返事の履歴</summary>
            <ol className="mt-2 space-y-2 text-sm">{intro.events.filter((event) => event.status !== "requested").map((event) => <li className="whitespace-pre-wrap break-words" key={event.status}>{statuses[event.status]}{event.note && " · " + event.note}</li>)}</ol>
          </details>}
          {(isIntroducer || isTarget) && <IntroResponse id={intro.id} introducer={isIntroducer} />}
        </li>;
      })}</ul> : <p>まだ紹介のやり取りはありません。</p>}
    </ConstructionPanel>
  </div>;
}
