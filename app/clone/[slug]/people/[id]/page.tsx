// /clone/[slug]/people/[id] ─ 人物詳細ページ。
// プロフィール表示 + 編集 / 削除 + 関連エンティティ6種（案件/会話/活動/経費/タスク/判断）の紐付けUI。

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime, formatDate } from "@/app/admin/_components/EditorialFormat";
import { PersonEditDialog } from "../_components/PersonEditDialog";
import { PersonDeleteButton } from "../_components/PersonDeleteButton";
import { PersonQuickEdit } from "../_components/PersonQuickEdit";
import { PersonAvatar } from "../_components/PersonAvatar";
import { PersonPhotos, type PhotoItem } from "./_components/PersonPhotos";
import { PersonPhotoUploadButton } from "./_components/PersonPhotoUploadButton";
import { PersonTabs } from "./_components/PersonTabs";
import { RelatedSection, type RelatedItem } from "../../_components/RelatedSection";
import type { PickerCandidate } from "../../_components/LinkPickerDialog";
import {
  linkPersonProject,
  unlinkPersonProject,
  linkPersonConversationLog,
  unlinkPersonConversationLog,
  linkPersonActivityLog,
  unlinkPersonActivityLog,
  linkPersonExpense,
  unlinkPersonExpense,
  linkPersonTask,
  unlinkPersonTask,
  linkPersonDecisionLog,
  unlinkPersonDecisionLog,
} from "@/lib/ai-clone/links";
import type { PersonInput } from "../_actions";

export const dynamic = "force-dynamic";

// 活動ログ（finance/activities）は未使用のため、人物詳細の「関連活動ログ」セクションを非表示にする。
// 使い始めたら true に戻すだけで復活する（紐付けロジック・クエリはそのまま残してある）。
const SHOW_ACTIVITY_LOG = false;

interface PersonRow {
  id: string;
  name: string;
  name_kana: string | null;  // migration 0049
  company_name: string | null;
  url: string | null;  // migration 0054
  position: string | null;
  industry: string | null;  // migration 0045
  avatar_url: string | null; // migration 0048
  // 2026-05-17 migration 0028: relationship → met_context, challenges → caveats
  met_context: string | null;
  importance: string | null;
  temperature: string | null;
  referred_by: string | null;
  referred_to: string | null;
  referred_by_person_id: string | null;
  interests: string[] | null;
  caveats: string | null;     // 旧「注意点」と「課題」を統合した「備考」
  next_action: string | null;
  // 生年月日・性別・出生時刻・出生地（/admin/divination からの保存で入る）
  birthday: string | null;     // ISO date "YYYY-MM-DD"
  gender: string | null;
  birth_hour: number | null;   // 0-23
  birth_minute: number | null; // 0-59
  birthplace: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// "YYYY-MM-DD" → "YYYY年M月D日" 表示。失敗時はそのまま返す。
function formatBirthday(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

// 詳細ページのキー/バリュー1行
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-[11px] tracking-[0.18em] text-gray-500 uppercase pt-0.5">
        {label}
      </div>
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {value || <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}

// 候補リストから既存リンク済みIDを除外したピッカー候補を作るヘルパー
function makeCandidates<T extends { id: string }>(
  all: T[],
  linkedIds: Set<string>,
  toCandidate: (row: T) => PickerCandidate,
): PickerCandidate[] {
  return all.filter((r) => !linkedIds.has(r.id)).map(toCandidate);
}

// yen 表記
function yen(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_person")
    .select(
      "id, name, name_kana, company_name, url, position, industry, avatar_url, met_context, importance, temperature, referred_by, referred_to, referred_by_person_id, interests, caveats, next_action, birthday, gender, birth_hour, birth_minute, birthplace, created_at, updated_at",
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const person = data as PersonRow;

  // 人物の画像ギャラリー（新しい順）
  const { data: photoRows } = await supabase
    .from("ai_clone_person_photo")
    .select("id, public_url, storage_path")
    .eq("tenant_id", tenant.id)
    .eq("person_id", person.id)
    .order("created_at", { ascending: false });
  const photos = (photoRows ?? []) as PhotoItem[];

  // 所属する「会」（コミュニティ）。多対多リンク経由で名前を取得。
  const { data: communityRows } = await supabase
    .from("ai_clone_person_communities")
    .select("community:ai_clone_community(id, name)")
    .eq("person_id", person.id);
  const communities = (communityRows ?? [])
    .map((r) => {
      const c = (r as { community: unknown }).community;
      const obj = Array.isArray(c) ? c[0] : c;
      return obj as { id: string; name: string } | null;
    })
    .filter((c): c is { id: string; name: string } => !!c && !!c.name);
  const communityNames = communities.map((c) => c.name);

  // 紹介元の人物（FK ある場合のリンク先名前） + 紹介先（この人物を referred_by_person_id とする逆引き一覧）
  const [referrerRow, referredToList] = await Promise.all([
    person.referred_by_person_id
      ? supabase
          .from("ai_clone_person")
          .select("id, name")
          .eq("tenant_id", tenant.id)
          .eq("id", person.referred_by_person_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("ai_clone_person")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .eq("referred_by_person_id", person.id)
      .order("name", { ascending: true }),
  ]);
  const referrer = (referrerRow.data ?? null) as { id: string; name: string } | null;
  const referredToPeople = (referredToList.data ?? []) as { id: string; name: string }[];

  // 並列取得: メモ件数 + 6種のリンク現状 + 6種の候補マスター
  const [
    noteCountRes,
    linkProjects,
    linkConversations,
    linkActivities,
    linkExpenses,
    linkTasks,
    linkDecisions,
    allProjects,
    allConversations,
    allActivities,
    allExpenses,
    allTasks,
    allDecisions,
  ] = await Promise.all([
    supabase
      .from("ai_clone_person_note")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_projects")
      .select("project_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_activity_logs")
      .select("activity_log_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_expenses")
      .select("expense_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_tasks")
      .select("task_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_decision_logs")
      .select("decision_log_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_project")
      .select("id, name, status, due_date")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_clone_conversation_log")
      .select("id, occurred_at, summary, channel, content")
      .eq("tenant_id", tenant.id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("ai_clone_activity_log")
      .select("id, occurred_date, content, activity_type")
      .eq("tenant_id", tenant.id)
      .order("occurred_date", { ascending: false }),
    supabase
      .from("ai_clone_expense")
      .select("id, occurred_date, amount, category, payee")
      .eq("tenant_id", tenant.id)
      .order("occurred_date", { ascending: false }),
    supabase
      .from("ai_clone_task")
      .select("id, name, status, due_date")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_clone_decision_log")
      .select("id, occurred_at, theme, conclusion")
      .eq("tenant_id", tenant.id)
      .order("occurred_at", { ascending: false }),
  ]);

  const noteCount = noteCountRes.count ?? 0;
  const linkedProjectIds = new Set(
    (linkProjects.data ?? []).map((r: { project_id: string }) => r.project_id),
  );
  const linkedConvIds = new Set(
    (linkConversations.data ?? []).map(
      (r: { conversation_log_id: string }) => r.conversation_log_id,
    ),
  );
  const linkedActivityIds = new Set(
    (linkActivities.data ?? []).map(
      (r: { activity_log_id: string }) => r.activity_log_id,
    ),
  );
  const linkedExpenseIds = new Set(
    (linkExpenses.data ?? []).map((r: { expense_id: string }) => r.expense_id),
  );
  const linkedTaskIds = new Set(
    (linkTasks.data ?? []).map((r: { task_id: string }) => r.task_id),
  );
  const linkedDecisionIds = new Set(
    (linkDecisions.data ?? []).map(
      (r: { decision_log_id: string }) => r.decision_log_id,
    ),
  );

  type ProjectRow = {
    id: string;
    name: string;
    status: string | null;
    due_date: string | null;
  };
  type ConvRow = {
    id: string;
    occurred_at: string;
    summary: string | null;
    channel: string | null;
    content: string | null;
  };
  type ActRow = {
    id: string;
    occurred_date: string;
    content: string | null;
    activity_type: string | null;
  };
  type ExpRow = {
    id: string;
    occurred_date: string;
    amount: number;
    category: string | null;
    payee: string | null;
  };
  type TaskRow = {
    id: string;
    name: string;
    status: string | null;
    due_date: string | null;
  };
  type DecRow = {
    id: string;
    occurred_at: string;
    theme: string | null;
    conclusion: string | null;
  };

  const projectRows = (allProjects.data ?? []) as ProjectRow[];
  const convRows = (allConversations.data ?? []) as ConvRow[];
  const actRows = (allActivities.data ?? []) as ActRow[];
  const expRows = (allExpenses.data ?? []) as ExpRow[];
  const taskRows = (allTasks.data ?? []) as TaskRow[];
  const decRows = (allDecisions.data ?? []) as DecRow[];

  // 既存リンクの表示用 RelatedItem 配列（候補マスターから絞り込み）
  const projectItems: RelatedItem[] = projectRows
    .filter((p) => linkedProjectIds.has(p.id))
    .map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: [p.status, p.due_date ? `期限 ${formatDate(p.due_date)}` : null]
        .filter(Boolean)
        .join(" / "),
      href: `/clone/${slug}/projects/${p.id}`,
    }));
  const convItems: RelatedItem[] = convRows
    .filter((c) => linkedConvIds.has(c.id))
    .map((c) => ({
      id: c.id,
      label: c.summary ?? c.content?.slice(0, 60) ?? "（無題）",
      sublabel: [
        formatDateTime(c.occurred_at),
        c.channel,
      ]
        .filter(Boolean)
        .join(" / "),
    }));
  const actItems: RelatedItem[] = actRows
    .filter((a) => linkedActivityIds.has(a.id))
    .map((a) => ({
      id: a.id,
      label: a.content?.slice(0, 60) ?? a.activity_type ?? "（無題）",
      sublabel: [formatDate(a.occurred_date), a.activity_type]
        .filter(Boolean)
        .join(" / "),
    }));
  const expItems: RelatedItem[] = expRows
    .filter((e) => linkedExpenseIds.has(e.id))
    .map((e) => ({
      id: e.id,
      label: `${yen(e.amount)} ${e.category ?? ""}`.trim(),
      sublabel: [formatDate(e.occurred_date), e.payee]
        .filter(Boolean)
        .join(" / "),
    }));
  const taskItems: RelatedItem[] = taskRows
    .filter((t) => linkedTaskIds.has(t.id))
    .map((t) => ({
      id: t.id,
      label: t.name,
      sublabel: [t.status, t.due_date ? `期限 ${formatDate(t.due_date)}` : null]
        .filter(Boolean)
        .join(" / "),
    }));
  const decItems: RelatedItem[] = decRows
    .filter((d) => linkedDecisionIds.has(d.id))
    .map((d) => ({
      id: d.id,
      label: d.theme ?? d.conclusion?.slice(0, 60) ?? "（無題）",
      sublabel: [
        formatDateTime(d.occurred_at),
        d.conclusion ? d.conclusion.slice(0, 40) : null,
      ]
        .filter(Boolean)
        .join(" / "),
    }));

  // ピッカー候補（既存リンク済を除外）
  const projectCandidates = makeCandidates(projectRows, linkedProjectIds, (p) => ({
    id: p.id,
    label: p.name,
    sublabel: p.status ?? null,
  }));
  const convCandidates = makeCandidates(convRows, linkedConvIds, (c) => ({
    id: c.id,
    label: c.summary ?? c.content?.slice(0, 60) ?? "（無題）",
    sublabel: [formatDateTime(c.occurred_at), c.channel]
      .filter(Boolean)
      .join(" / "),
  }));
  const actCandidates = makeCandidates(actRows, linkedActivityIds, (a) => ({
    id: a.id,
    label: a.content?.slice(0, 60) ?? a.activity_type ?? "（無題）",
    sublabel: [formatDate(a.occurred_date), a.activity_type]
      .filter(Boolean)
      .join(" / "),
  }));
  const expCandidates = makeCandidates(expRows, linkedExpenseIds, (e) => ({
    id: e.id,
    label: `${yen(e.amount)} ${e.category ?? ""}`.trim(),
    sublabel: [formatDate(e.occurred_date), e.payee]
      .filter(Boolean)
      .join(" / "),
  }));
  const taskCandidates = makeCandidates(taskRows, linkedTaskIds, (t) => ({
    id: t.id,
    label: t.name,
    sublabel: t.status ?? null,
  }));
  const decCandidates = makeCandidates(decRows, linkedDecisionIds, (d) => ({
    id: d.id,
    label: d.theme ?? d.conclusion?.slice(0, 60) ?? "（無題）",
    sublabel: formatDateTime(d.occurred_at),
  }));

  // Edit ダイアログに渡す初期値（PersonInput 形）
  const initial: PersonInput = {
    name: person.name,
    name_kana: person.name_kana ?? "",
    company_name: person.company_name ?? "",
    url: person.url ?? "",
    position: person.position ?? "",
    industry: person.industry ?? "",
    met_context: person.met_context ?? "",
    importance: person.importance ?? "",
    temperature: person.temperature ?? "",
    referred_by: person.referred_by ?? "",
    referred_by_person_id: person.referred_by_person_id ?? null,
    interests: person.interests ?? [],
    communities: communityNames,
    caveats: person.caveats ?? "",
    next_action: person.next_action ?? "",
    birthday: person.birthday ?? "",
    // "未指定" は実質未入力扱い。select の "" に寄せて編集時の差分を出さない。
    gender: person.gender && person.gender !== "未指定" ? person.gender : "",
    birthplace: person.birthplace ?? "",
  };

  // 紹介元の picker 初期表示用（FK 解決済み）
  const initialReferrer = referrer
    ? { id: referrer.id, name: referrer.name, companyName: null }
    : null;

  // server action を personId/tenantId で bind してクライアントへ
  type LinkFn = (
    slug: string,
    tenantId: string,
    personId: string,
    rightId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  const bindLink = (fn: LinkFn) =>
    fn.bind(null, slug, tenant.id, person.id) as (
      rightId: string,
    ) => Promise<{ ok: boolean; error?: string }>;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      {/* 戻る導線 */}
      <Link
        href={`/clone/${slug}/people`}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-[#1c3550] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        人物一覧に戻る
      </Link>

      <div className="flex items-start gap-4">
        <div className="pt-1 shrink-0">
          <PersonAvatar url={person.avatar_url} name={person.name} size={56} />
        </div>
        <div className="flex-1 min-w-0">
      <EditorialHeader
        eyebrow="HUB / PEOPLE"
        title={person.name}
        description={
          [person.company_name, person.industry, person.position]
            .filter(Boolean)
            .join(" / ") || undefined
        }
        right={
          <div className="flex items-center gap-2">
            <PersonEditDialog
              slug={slug}
              tenantId={tenant.id}
              personId={person.id}
              initial={initial}
              initialReferrer={initialReferrer}
            />
            <PersonPhotoUploadButton
              slug={slug}
              tenantId={tenant.id}
              personId={person.id}
            />
            <PersonDeleteButton
              slug={slug}
              tenantId={tenant.id}
              personId={person.id}
              personName={person.name}
            />
          </div>
        }
      />
        </div>
      </div>

      <PersonTabs slug={slug} personId={person.id} noteCount={noteCount} />

      {/* Quick Edit（重要度・温度感・次のアクション・備考を inline で更新。
          出会った場所は一度しか入れないので Quick Edit から外し、編集ダイアログ
          経由のみで更新する） */}
      <PersonQuickEdit
        slug={slug}
        tenantId={tenant.id}
        personId={person.id}
        initial={{
          importance: person.importance,
          temperature: person.temperature,
          next_action: person.next_action,
          caveats: person.caveats,
        }}
      />

      {/* メイン情報（Quick Edit 対象の項目は除外、それ以外を表示） */}
      <EditorialCard className="px-6 py-2">
        <Row label="よみがな" value={person.name_kana} />
        <Row label="業種" value={person.industry} />
        <Row
          label="URL"
          value={
            person.url ? (
              <a
                href={person.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1c3550] hover:text-[#c08a3e] underline-offset-2 hover:underline break-all"
              >
                {person.url}
              </a>
            ) : null
          }
        />
        <Row label="出会った場所" value={person.met_context} />
        <Row label="生年月日" value={formatBirthday(person.birthday)} />
        <Row label="性別" value={person.gender && person.gender !== "未指定" ? person.gender : null} />
        <Row
          label="出生時刻"
          value={
            person.birth_hour !== null
              ? `${String(person.birth_hour).padStart(2, "0")}:${String(person.birth_minute ?? 0).padStart(2, "0")}`
              : null
          }
        />
        <Row label="出生地" value={person.birthplace} />
        <Row
          label="紹介元"
          value={
            referrer ? (
              <Link
                href={`/clone/${slug}/people/${referrer.id}`}
                className="text-[#1c3550] hover:text-[#c08a3e] underline-offset-2 hover:underline"
              >
                {referrer.name}
              </Link>
            ) : (
              person.referred_by
            )
          }
        />
        <Row
          label="紹介先"
          value={
            referredToPeople.length > 0 ? (
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {referredToPeople.map((p, idx) => (
                  <span key={p.id} className="inline-flex items-center">
                    <Link
                      href={`/clone/${slug}/people/${p.id}`}
                      className="text-[#1c3550] hover:text-[#c08a3e] underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {idx < referredToPeople.length - 1 && (
                      <span className="text-gray-300 ml-2">/</span>
                    )}
                  </span>
                ))}
                {person.referred_to && (
                  <span className="text-gray-400 text-xs ml-2">
                    （メモ: {person.referred_to}）
                  </span>
                )}
              </div>
            ) : (
              person.referred_to
            )
          }
        />
        <Row
          label="関心ごと"
          value={
            person.interests && person.interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {person.interests.map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="inline-flex items-center px-2 py-0.5 bg-[#1c3550]/5 border border-[#1c3550]/20 rounded text-[12px] text-[#1c3550]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null
          }
        />
        <Row
          label="所属（会）"
          value={
            communityNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {communityNames.map((name, idx) => (
                  <span
                    key={`${name}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fbf3e3] border border-[#e6d3a3] rounded text-[12px] text-[#8a5a1c] font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null
          }
        />
      </EditorialCard>

      {/* 写真・名刺画像ギャラリー（1枚をアイコンに設定可能） */}
      <EditorialCard className="px-6 py-4">
        <PersonPhotos
          slug={slug}
          tenantId={tenant.id}
          personId={person.id}
          initialPhotos={photos}
          initialAvatar={person.avatar_url}
        />
      </EditorialCard>

      {/* 関連エンティティ 6セクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RelatedSection
          title="関連案件"
          pickerTitle="案件を紐付け"
          triggerLabel="案件を追加"
          pickerEmptyMessage="案件マスターに登録がありません"
          items={projectItems}
          candidates={projectCandidates}
          onLink={bindLink(linkPersonProject)}
          onUnlink={bindLink(unlinkPersonProject)}
        />
        <RelatedSection
          title="関連会話ログ"
          pickerTitle="会話ログを紐付け"
          triggerLabel="会話を追加"
          pickerEmptyMessage="会話ログがありません"
          items={convItems}
          candidates={convCandidates}
          onLink={bindLink(linkPersonConversationLog)}
          onUnlink={bindLink(unlinkPersonConversationLog)}
        />
        {/* 活動ログ未使用のため「関連活動ログ」は非表示。復活は SHOW_ACTIVITY_LOG を true に。 */}
        {SHOW_ACTIVITY_LOG && (
          <RelatedSection
            title="関連活動ログ"
            pickerTitle="活動を紐付け"
            triggerLabel="活動を追加"
            pickerEmptyMessage="活動ログがありません"
            items={actItems}
            candidates={actCandidates}
            onLink={bindLink(linkPersonActivityLog)}
            onUnlink={bindLink(unlinkPersonActivityLog)}
          />
        )}
        <RelatedSection
          title="関連経費"
          pickerTitle="経費を紐付け"
          triggerLabel="経費を追加"
          pickerEmptyMessage="経費がありません"
          items={expItems}
          candidates={expCandidates}
          onLink={bindLink(linkPersonExpense)}
          onUnlink={bindLink(unlinkPersonExpense)}
        />
        <RelatedSection
          title="関連タスク"
          pickerTitle="タスクを紐付け"
          triggerLabel="タスクを追加"
          pickerEmptyMessage="タスクがありません"
          items={taskItems}
          candidates={taskCandidates}
          onLink={bindLink(linkPersonTask)}
          onUnlink={bindLink(unlinkPersonTask)}
        />
        <RelatedSection
          title="関連判断履歴"
          pickerTitle="判断を紐付け"
          triggerLabel="判断を追加"
          pickerEmptyMessage="判断履歴がありません"
          items={decItems}
          candidates={decCandidates}
          onLink={bindLink(linkPersonDecisionLog)}
          onUnlink={bindLink(unlinkPersonDecisionLog)}
        />
      </div>

      <p className="text-[10px] tracking-[0.18em] text-gray-400 text-right">
        作成 {formatDateTime(person.created_at)} ／ 更新{" "}
        {formatDateTime(person.updated_at)}
      </p>
    </div>
  );
}
