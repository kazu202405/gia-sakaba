// /clone/[slug]/people ─ Hub / 人物の一覧 + 追加。
// loadTenantOr404 でテナント解決 → ai_clone_person を tenant 内で SELECT し、
// テーブル形式で表示。追加は PersonAddDialog（モーダル）から Server Action 経由。
// 編集 / 削除 / 詳細ページは Phase 1 残作業。

import Link from "next/link";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { SortableTableHeader } from "@/components/nav/SortableTableHeader";
import { PersonAddDialog } from "./_components/PersonAddDialog";
import { PersonAvatar } from "./_components/PersonAvatar";
import { PeopleFilterBar, REFERRER_NONE_SENTINEL } from "./_components/PeopleFilterBar";
import { CsvExportButton } from "../_components/CsvExportButton";

export const dynamic = "force-dynamic";

interface PersonRow {
  id: string;
  name: string;
  name_kana: string | null;
  company_name: string | null;
  position: string | null;
  industry: string | null;
  avatar_url: string | null;
  importance: string | null;
  temperature: string | null;
  // 2026-05-17 migration 0028: relationship → met_context
  met_context: string | null;
  next_action: string | null;
  updated_at: string | null;
  referred_by: string | null;
  referred_by_person_id: string | null;
}

// 重要度バッジ（S/A/B/C を muted Editorial パレットで）
function ImportanceBadge({ importance }: { importance: string | null }) {
  if (!importance) {
    return <span className="text-[11px] text-gray-300">—</span>;
  }
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    S: {
      bg: "bg-[#fbf3e3]",
      border: "border-[#e6d3a3]",
      text: "text-[#8a5a1c]",
      dotBg: "bg-[#c08a3e]",
    },
    A: {
      bg: "bg-[#f1f4f7]",
      border: "border-[#d6dde5]",
      text: "text-[#1c3550]",
      dotBg: "bg-[#1c3550]",
    },
    B: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-600",
      dotBg: "bg-gray-400",
    },
    C: {
      bg: "bg-gray-50",
      border: "border-gray-100",
      text: "text-gray-400",
      dotBg: "bg-gray-300",
    },
  };
  const s = styles[importance] ?? styles.B;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {importance}
    </span>
  );
}

function parseCsvParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw[0] : raw;
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, "").trim();
}

export default async function PeoplePage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sanitizeForOr((sp.q ?? "").toString());
  const importances = parseCsvParam(sp.importance);
  const temperatures = parseCsvParam(sp.temperature);
  const metContexts = parseCsvParam(sp.met_context);
  const industries = parseCsvParam(sp.industry);
  const communityFilter = parseCsvParam(sp.community); // 会 ID の CSV
  const referrersRaw = parseCsvParam(sp.referrer);
  // referrers の中に sentinel "__none__" が含まれていたら「紹介元なし」モード。
  // 通常 ID と sentinel を分離して処理する。両方併用も可（その人 or 紹介元なし）。
  const wantNoReferrer = referrersRaw.includes(REFERRER_NONE_SENTINEL);
  const referrers = referrersRaw.filter((v) => v !== REFERRER_NONE_SENTINEL);
  const referrerQ = sanitizeForOr((sp.referrer_q ?? "").toString());
  const hasAction = sp.has_action === "1";
  // 既定は更新日新しい順
  const sort = (sp.sort ?? "updated_at_desc").toString();

  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  // 紹介元テキスト検索：referrer_q が指定されていれば、テナント内で name/company_name が
  // 部分一致する人物 ID を先に解決しておく。メインクエリの referred_by_person_id フィルタに
  // ドロップダウンの referrers と一緒に和集合で渡す。
  let referrerTextMatchedIds: string[] = [];
  if (referrerQ) {
    const matchRes = await supabase
      .from("ai_clone_person")
      .select("id")
      .eq("tenant_id", tenant.id)
      .or(`name.ilike.%${referrerQ}%,company_name.ilike.%${referrerQ}%`);
    referrerTextMatchedIds = ((matchRes.data ?? []) as { id: string }[]).map((r) => r.id);
  }
  // ドロップダウン referrers と text マッチ ID の和集合
  const referrerIdsForFilter = Array.from(
    new Set([...referrers, ...referrerTextMatchedIds]),
  );

  // 会フィルタ：選択された会に所属する person_id を先に解決し、メインクエリを id で絞る。
  // 0 件マッチ（選択された会に誰もいない）の判定用に「選択あり」フラグも持つ。
  let communityPersonIds: string[] = [];
  if (communityFilter.length > 0) {
    const pcRes = await supabase
      .from("ai_clone_person_communities")
      .select("person_id")
      .in("community_id", communityFilter);
    communityPersonIds = Array.from(
      new Set(
        ((pcRes.data ?? []) as { person_id: string }[]).map((r) => r.person_id),
      ),
    );
  }

  // メインクエリ：条件を順次積む
  let mainQuery = supabase
    .from("ai_clone_person")
    .select(
      "id, name, name_kana, company_name, position, industry, avatar_url, importance, temperature, met_context, next_action, updated_at, referred_by, referred_by_person_id",
    )
    .eq("tenant_id", tenant.id);

  if (importances.length > 0) mainQuery = mainQuery.in("importance", importances);
  if (temperatures.length > 0) mainQuery = mainQuery.in("temperature", temperatures);
  if (metContexts.length > 0) mainQuery = mainQuery.in("met_context", metContexts);
  if (industries.length > 0) mainQuery = mainQuery.in("industry", industries);
  // 紹介元フィルタの合成:
  //   - referrerIdsForFilter のみ → in(ids)
  //   - wantNoReferrer のみ → FK/text 両方 null
  //   - 両方 → in(ids) OR (FK null かつ text null) を .or() で組む
  //   - referrer_q 指定で 0 件マッチ かつ dropdown も空 かつ wantNoReferrer 無し → 0 件返す
  //   - どちらも無し → フィルタなし
  if (referrerIdsForFilter.length > 0 && wantNoReferrer) {
    const idList = referrerIdsForFilter.map((v) => `"${v}"`).join(",");
    mainQuery = mainQuery.or(
      `referred_by_person_id.in.(${idList}),and(referred_by_person_id.is.null,referred_by.is.null)`,
    );
  } else if (referrerIdsForFilter.length > 0) {
    mainQuery = mainQuery.in("referred_by_person_id", referrerIdsForFilter);
  } else if (wantNoReferrer) {
    mainQuery = mainQuery
      .is("referred_by_person_id", null)
      .is("referred_by", null);
  } else if (referrerQ) {
    // テキスト検索が指定されたのにマッチが 1 件も無い → 0 件で返す（false 条件）
    mainQuery = mainQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (hasAction) mainQuery = mainQuery.not("next_action", "is", null);
  // 会フィルタ：選択された会の所属者だけに絞る。所属者が 0 人なら 0 件で返す。
  if (communityFilter.length > 0) {
    if (communityPersonIds.length === 0) {
      mainQuery = mainQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      mainQuery = mainQuery.in("id", communityPersonIds);
    }
  }
  if (q) {
    mainQuery = mainQuery.or(
      `name.ilike.%${q}%,name_kana.ilike.%${q}%,company_name.ilike.%${q}%,position.ilike.%${q}%,industry.ilike.%${q}%`,
    );
  }

  // ソート（SortableTableHeader と連動）
  // 有効 field：name / updated_at / importance
  const [sortField, sortDir] = sort.split("_").length === 3
    ? [sort.split("_").slice(0, 2).join("_"), sort.split("_")[2]] as [string, "asc" | "desc"]
    : [sort.split("_")[0], sort.split("_")[1]] as [string, "asc" | "desc"];
  const ascending = sortDir === "asc";
  if (sortField === "name" || sortField === "updated_at" || sortField === "importance") {
    mainQuery = mainQuery.order(sortField, { ascending, nullsFirst: false });
  } else {
    mainQuery = mainQuery.order("updated_at", { ascending: false });
  }

  // total / met_context ユニーク値 / 紹介元集計（誰が誰を紹介したか）を並列取得
  const [logsRes, totalRes, metContextRes, industryRes, referredByRes] = await Promise.all([
    mainQuery,
    supabase
      .from("ai_clone_person")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
    // met_context のユニーク値（重複あり、後で集計）
    supabase
      .from("ai_clone_person")
      .select("met_context")
      .eq("tenant_id", tenant.id)
      .not("met_context", "is", null),
    // industry のユニーク値（後で集計）
    supabase
      .from("ai_clone_person")
      .select("industry")
      .eq("tenant_id", tenant.id)
      .not("industry", "is", null),
    // 紹介元として誰かを紹介した人物（FK ありの行から referred_by_person_id を全部取る）
    supabase
      .from("ai_clone_person")
      .select("referred_by_person_id")
      .eq("tenant_id", tenant.id)
      .not("referred_by_person_id", "is", null),
  ]);
  const { data, error } = logsRes;
  const totalCount = totalRes.count ?? 0;
  const hasActiveFilter =
    q.length > 0 || importances.length > 0 || temperatures.length > 0
    || metContexts.length > 0 || industries.length > 0
    || communityFilter.length > 0
    || referrers.length > 0 || wantNoReferrer
    || referrerQ.length > 0
    || hasAction;

  // met_context の使用回数集計（typeahead 候補表示用）
  const metContextCounts = new Map<string, number>();
  for (const r of (metContextRes.data ?? []) as { met_context: string | null }[]) {
    const v = r.met_context?.trim();
    if (!v) continue;
    metContextCounts.set(v, (metContextCounts.get(v) ?? 0) + 1);
  }
  const metContextOptions = Array.from(metContextCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  // industry の使用回数集計（フィルタ候補表示用）
  const industryCounts = new Map<string, number>();
  for (const r of (industryRes.data ?? []) as { industry: string | null }[]) {
    const v = r.industry?.trim();
    if (!v) continue;
    industryCounts.set(v, (industryCounts.get(v) ?? 0) + 1);
  }
  const industryOptions = Array.from(industryCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  // 紹介元として登場する person_id の集計（typeahead 候補表示用）
  const referrerCounts = new Map<string, number>();
  for (const r of (referredByRes.data ?? []) as { referred_by_person_id: string | null }[]) {
    const v = r.referred_by_person_id;
    if (!v) continue;
    referrerCounts.set(v, (referrerCounts.get(v) ?? 0) + 1);
  }
  // 紹介元 person_id → name/company_name を解決（一覧表示にも使う）
  const referrerIds = Array.from(referrerCounts.keys());
  let referrerDetails: { id: string; name: string; company_name: string | null }[] = [];
  if (referrerIds.length > 0) {
    const referrerRes = await supabase
      .from("ai_clone_person")
      .select("id, name, company_name")
      .eq("tenant_id", tenant.id)
      .in("id", referrerIds);
    referrerDetails = (referrerRes.data ?? []) as typeof referrerDetails;
  }
  const referrerById = new Map(referrerDetails.map((r) => [r.id, r]));
  const referrerOptions = Array.from(referrerCounts.entries())
    .map(([id, count]) => {
      const detail = referrerById.get(id);
      return {
        id,
        name: detail?.name ?? "(不明)",
        companyName: detail?.company_name ?? null,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  // referrer_q プレビュー用：紹介実績がある人（referrerOptions）のうち、name/company_name に
  // 部分一致するもの。フィルタ自体はテナント内全人物が対象だが、プレビューに 1 度も紹介して
  // ない人を出しても誤解を生むので「紹介実績あり」に絞っている。
  const referrerNameMatches = referrerQ
    ? referrerOptions.filter((o) => {
      const needle = referrerQ.toLowerCase();
      return (
        o.name.toLowerCase().includes(needle)
        || (o.companyName ?? "").toLowerCase().includes(needle)
      );
    })
    : [];

  // 会（コミュニティ）の一覧＋所属人数（フィルタ候補用）。
  // 件数集計はリンク行を引いて数える（テナント単位なら通常 1000 行未満）。
  const { data: communityList } = await supabase
    .from("ai_clone_community")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .order("name", { ascending: true });
  const communityIdList = ((communityList ?? []) as { id: string }[]).map((c) => c.id);
  const communityCounts = new Map<string, number>();
  if (communityIdList.length > 0) {
    const { data: linkRows } = await supabase
      .from("ai_clone_person_communities")
      .select("community_id")
      .in("community_id", communityIdList);
    for (const r of (linkRows ?? []) as { community_id: string }[]) {
      communityCounts.set(r.community_id, (communityCounts.get(r.community_id) ?? 0) + 1);
    }
  }
  const communityOptions = ((communityList ?? []) as { id: string; name: string }[])
    .map((c) => ({ id: c.id, name: c.name, count: communityCounts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const people = (data ?? []) as PersonRow[];

  // CSV エクスポート（現在のフィルタ結果をそのまま出力）
  const csvHeaders = [
    "名前", "会社", "役職", "業種", "重要度", "温度感",
    "出会った場所", "紹介元", "次のアクション", "更新日時",
  ];
  const csvRows: (string | number | null)[][] = people.map((p) => {
    const referrerName = p.referred_by_person_id
      ? referrerById.get(p.referred_by_person_id)?.name ?? ""
      : p.referred_by ?? "";
    return [
      p.name, p.company_name, p.position, p.industry, p.importance, p.temperature,
      p.met_context, referrerName, p.next_action,
      p.updated_at ? formatDateTime(p.updated_at) : "",
    ];
  });

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="HUB / PEOPLE"
        title="人物"
        description="人脈・顧客・パートナーをここに集約。右腕AI が紹介設計や商談前準備で参照する基盤データ。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={totalCount} label="登録済み" tone="navy" />
            <CsvExportButton filename="people" headers={csvHeaders} rows={csvRows} />
            <PersonAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      {totalCount > 0 && (
        <PeopleFilterBar
          filteredCount={people.length}
          totalCount={totalCount}
          metContextOptions={metContextOptions}
          industryOptions={industryOptions}
          communityOptions={communityOptions}
          referrerOptions={referrerOptions}
          referrerNameMatches={referrerNameMatches}
        />
      )}

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && people.length === 0 && !hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ誰も登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「人物を追加」から、右腕AI に覚えさせたい人を1人ずつ入れていきます。
            <br />
            名前だけでもOK。詳細は後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && people.length === 0 && hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            条件に一致する人物はいません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            検索キーワードやフィルタを見直してみてください。
            <br />
            上部「フィルタ解除」で全件表示に戻せます。
          </p>
        </EditorialCard>
      )}

      {!error && people.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          {/* テーブルヘッダー（クリックで並び替え）。8列：名前/会社役職/紹介元/重要度/温度感/出会った場所/次のアクション/更新 */}
          <div className="hidden md:grid md:grid-cols-[1.3fr_1.3fr_0.7fr_1fr_0.5fr_0.6fr_0.9fr_1.1fr_0.8fr] gap-3 px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <SortableTableHeader field="name" defaultDir="asc" label="名前" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">会社 / 役職</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">業種</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">紹介元</span>
            <SortableTableHeader field="importance" defaultDir="asc" label="重要度" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">温度感</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">出会った場所</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">次のアクション</span>
            <SortableTableHeader field="updated_at" defaultDir="desc" label="更新" align="right" />
          </div>

          {/* 行（クリックで詳細へ） */}
          <ul className="divide-y divide-gray-100">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/clone/${slug}/people/${p.id}`}
                  className="block px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
                >
                  {/* モバイル：コンパクトカード（アバター＋名前／会社・業種・温度感＋重要度バッジ） */}
                  <div className="md:hidden flex items-center gap-3">
                    <PersonAvatar url={p.avatar_url} name={p.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-[#1c3550] truncate">
                        {p.name}
                      </div>
                      <div className="text-[12px] text-gray-500 truncate">
                        {[p.company_name, p.industry, p.temperature]
                          .filter(Boolean)
                          .join(" ・ ") || (
                          <span className="text-gray-300">詳細は開いて確認</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <ImportanceBadge importance={p.importance} />
                    </div>
                  </div>

                  {/* デスクトップ：テーブル行（9列） */}
                  <div className="hidden md:grid md:grid-cols-[1.3fr_1.3fr_0.7fr_1fr_0.5fr_0.6fr_0.9fr_1.1fr_0.8fr] gap-3 items-center">
                  {/* 名前（左に〇アバター、下によみがな） */}
                  <div className="flex items-center gap-2">
                    <PersonAvatar url={p.avatar_url} name={p.name} size={28} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[#1c3550] truncate">
                        {p.name}
                      </div>
                      {p.name_kana && (
                        <div className="text-[11px] text-gray-400 truncate">
                          {p.name_kana}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 会社 / 役職 */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {p.company_name || p.position ? (
                      <>
                        {p.company_name && <span>{p.company_name}</span>}
                        {p.company_name && p.position && (
                          <span className="text-gray-300 mx-1.5">/</span>
                        )}
                        {p.position && <span>{p.position}</span>}
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 業種 */}
                  <div className="text-[13px] mt-1 md:mt-0 truncate">
                    {p.industry ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#1c3550]/5 border border-[#1c3550]/15 text-[12px] text-[#1c3550]">
                        {p.industry}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 紹介元
                       - FK あり → テナント内人物名（◆ アイコン付き）。Link でくくられている関係上、
                         さらに <Link> はネストできないので「リンクっぽく見える表示」のみ。
                         詳細ページの "紹介元" セクションから飛べる導線は別途あり。
                       - FK なし、テキストあり → グレーで外部表示
                       - 両方なし → —
                  */}
                  <div className="text-[13px] mt-1 md:mt-0 truncate">
                    {p.referred_by_person_id
                      && referrerById.get(p.referred_by_person_id) ? (
                      <span className="inline-flex items-center gap-1 text-[#1c3550] font-medium">
                        <span aria-hidden className="text-[#c08a3e]">◆</span>
                        {referrerById.get(p.referred_by_person_id)!.name}
                      </span>
                    ) : p.referred_by ? (
                      <span className="text-gray-500">{p.referred_by}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 重要度 */}
                  <div className="mt-1 md:mt-0">
                    <ImportanceBadge importance={p.importance} />
                  </div>

                  {/* 温度感 */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {p.temperature || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 出会った場所 */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 truncate">
                    {p.met_context || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 次のアクション */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 truncate">
                    {p.next_action || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 更新日時 */}
                  <div className="text-[11px] text-gray-400 mt-1 md:mt-0 md:text-right tabular-nums">
                    {formatDateTime(p.updated_at)}
                  </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
