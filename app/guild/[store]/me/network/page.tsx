import type { Metadata } from "next";
import Link from "next/link";
import { ConstructionField, ConstructionFields } from "@/components/guild/construction/fields";
import { ConstructionForm } from "@/components/guild/construction/forms";
import { changeConstructionConnection, setConstructionNetworkVisibility } from "@/lib/guild/construction-actions";
import type { ConstructionConnection } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { listGuildMembers } from "@/lib/guild/server-data";

export const metadata: Metadata = { title: "人脈" };

const visibilityLabels = { open: "直接連絡OK", intro: "紹介経由のみ", masked: "名前を伏せる", hidden: "非表示" };
type Level = keyof typeof visibilityLabels;
type NetworkSettings = { default_level: Level; overrides: Record<string, Level> };

function Initial({ name }: { name: string }) {
  return <span className="sn-fc" data-kind="other" aria-hidden="true">{Array.from(name).slice(0, 2).join("")}</span>;
}

function ConnectionAction({ id, intent, label, main = false }: { id: string; intent: "request" | "accept" | "decline"; label: string; main?: boolean }) {
  return <ConstructionForm action={changeConstructionConnection} submit={label} submitClassName={main ? undefined : "sn-btn"}>
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

export default async function ConstructionMyNetworkPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { db, store, userId } = await constructionContext();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const [members, connections, settingsResult] = await Promise.all([
    listGuildMembers(),
    constructionRows<ConstructionConnection>("sakaba_construction_list_my_connections"),
    db.rpc("sakaba_construction_get_network_visibility"),
  ]);
  if (settingsResult.error || !settingsResult.data) throw new Error("人脈の公開範囲を取得できませんでした。");
  const settings = settingsResult.data as NetworkSettings;
  const byId = new Map(members.map((member) => [member.id, member.display_name]));
  const name = (id: string) => byId.get(id) ?? "酒場の会員";
  const ids = new Set(connections.map((connection) => connection.friend_id));
  const searchable = members.filter((member) => member.id !== userId && !ids.has(member.id) && (
    !query || [member.display_name, member.name_kana ?? "", member.industry, member.region].join(" ").includes(query)
  ));
  const connected = connections.filter((connection) => connection.status === "connected").length;
  return <div className="sn-page sn-page--search sn-mynet">
    <section className="sn-sec">
      <div className="sn-sec-h"><h2>知り合い</h2><span>{connected}人</span></div>
      {connections.length ? <div className="sn-list">{connections.map((connection) => (
        <div className="sn-row" key={connection.id}>
          <Initial name={name(connection.friend_id)} />
          <div className="sn-row-body">
            <p className="sn-row-title"><Link href={store.path("/members/" + connection.friend_id)}>{name(connection.friend_id)}</Link></p>
            {connection.status === "connected" ? <>
              <div className="sn-row-acts"><Link className="sn-btn sn-btn--main" href={store.path("/network?via=" + connection.friend_id + "#intro-candidates")}>紹介を頼む</Link></div>
              <details className="sn-fold"><summary>この知り合いの公開範囲</summary>
                <VisibilityForm friend={connection.friend_id} level={settings.overrides[connection.friend_id] ?? "default"} />
              </details>
            </> : connection.status === "pending" && connection.requested_by !== userId ? <>
              <p className="sn-meta">つながりの申請が届いています</p>
              <div className="sn-row-acts"><ConnectionAction id={connection.id} intent="accept" label="承認する" main /><ConnectionAction id={connection.id} intent="decline" label="見送る" /></div>
            </> : <p className="sn-meta">{connection.status === "pending" ? "承認待ち" : "申請は見送られました"}</p>}
          </div>
        </div>
      ))}</div> : <p className="sn-empty">まだ知り合いはいません。下の「会員を探す」からつながりを申請できます</p>}
    </section>

    <section className="sn-sec">
      <div className="sn-sec-h"><h2>人脈の公開範囲</h2></div>
      <p className="sn-meta">あなたの知り合いが、あなたの人脈の人にどこまで近づけるかの初期設定です。知り合いごとの設定は、上の各行から変えられます。</p>
      <VisibilityForm level={settings.default_level} />
    </section>

    <section className="sn-sec" id="search">
      <div className="sn-sec-h"><h2>会員を探す</h2></div>
      <form action={store.path("/me/network")} className="sn-mynet-search">
        <ConstructionFields><ConstructionField label="名前・業種・地域"><input type="text" name="q" maxLength={100} defaultValue={query} /></ConstructionField></ConstructionFields>
        <button type="submit" className="sn-btn sn-btn--main">探す</button>
      </form>
      {searchable.length ? <div className="sn-list">{searchable.slice(0, 25).map((member) => (
        <div className="sn-row" key={member.id}>
          <Initial name={member.display_name} />
          <div className="sn-row-body">
            <p className="sn-row-title"><Link href={store.path("/members/" + member.id)}>{member.display_name}</Link></p>
            <div className="sn-row-acts"><ConnectionAction id={member.id} intent="request" label="つながりを申請" main /></div>
          </div>
        </div>
      ))}</div> : <p className="sn-empty">申請できる会員が見つかりませんでした</p>}
      {searchable.length > 25 && <p className="sn-meta">先頭25人を表示しています。名前などで絞り込めます。</p>}
    </section>
  </div>;
}
