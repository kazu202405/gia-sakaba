// Core OS「棚卸し（健康診断）」API。
// allowlist された Core OS の text 項目（id付き）を GPT に渡し、
// 重複・矛盾・陳腐化・抽象すぎ・肥大を指摘＋直し方を提案させる。
// 各指摘は table/id/field を持ち、画面でインライン書き直し/引退できる。
// 書き込みは別 API（coreos-apply）。ここは読み取り＋提案のみ。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";
import {
  loadCoreOsRows,
  isEditableField,
  isDeletableTable,
  CORE_OS_EDITABLE,
} from "@/lib/ai-clone/coreos-audit";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Finding {
  table: string;
  id: string;
  field: string;
  type: string; // duplicate|contradiction|stale|too_abstract|bloat
  action: string; // rewrite|retire|merge|keep
  title: string;
  detail: string;
  suggestion: string;
  // サーバ付与
  sectionLabel: string;
  fieldLabel: string;
  current: string;
  editable: "rewrite" | "retire" | null; // インライン操作可否
}

const AUDIT_SYSTEM = `あなたは経営者の右腕AIの「Core OS（判断軸の脳）」を点検するレビュアーです。
Core OS は AI が毎回参照する“憲法”なので、小さく・鋭く・最新に保つ必要があります。膨らみ・重複・陳腐化・抽象論は AI の判断をぼやけさせます。
渡された項目リスト（各行に table / id / field が明記）を点検し、改善提案を出してください。

観点：
- duplicate（重複）：似た内容が複数 → 片方を書き直すか統合
- contradiction（矛盾）：相反する内容
- stale（陳腐化）：古そう・実態と食い違いそう
- too_abstract（抽象的すぎ）：判断を変えない一般論・きれいごと
- bloat（肥大）：細かすぎて主軸を埋もれさせる

各指摘の action：
- rewrite：その field をこう書き直すと効く（suggestion に「書き直した全文」を入れる）
- retire：その項目はもう不要（行ごと引退）
- merge：重複・統合すべき。**「残す側を rewrite（suggestion に統合後の全文）」＋「消す側を retire」の2つの finding に分けて出す**こと（同じ id を両方に使わない）
出力は必ず次の JSON のみ。table/id/field は渡したリストの値を**そのまま**使う（創作しない）：
{
  "overall": "全体総評（2〜3文。鋭さ・肥大の有無・最優先の1点）",
  "findings": [
    { "table": "...", "id": "...", "field": "...", "type": "...", "action": "rewrite|retire|merge", "title": "短い見出し", "detail": "気になる点(1〜2文)", "suggestion": "rewriteなら書き直した全文 / それ以外は具体提案" }
  ]
}
findings は重要な順に最大8件。問題が無ければ findings は空配列、overall で良好と伝える。`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "対象が不正です" }, { status: 400 });
  }

  // member 認可
  const { data: tenant } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: "テナントが見つかりません" }, { status: 404 });
  }
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json({ error: "AIが未設定です" }, { status: 503 });
  }

  const rows = await loadCoreOsRows(tenant.id);
  if (rows.length === 0) {
    return NextResponse.json({
      overall:
        "Core OS がまだ十分に蓄積されていません。判断基準やルールが増えてきたら棚卸ししましょう。",
      findings: [],
    });
  }

  // AI に渡す項目リスト（table/id/field を明記）と、検証用の参照マップ
  const valueMap = new Map<string, { section: string; fieldLabel: string; value: string }>();
  const itemsText = rows
    .map((r) => {
      const head = `■ ${r.sectionLabel}  [table=${r.table} id=${r.id}]`;
      const body = r.fields
        .map((f) => {
          valueMap.set(`${r.table}:${r.id}:${f.field}`, {
            section: r.sectionLabel,
            fieldLabel: f.label,
            value: f.value,
          });
          return `   - ${f.label}（field=${f.field}）: ${f.value}`;
        })
        .join("\n");
      return `${head}\n${body}`;
    })
    .join("\n\n");

  try {
    const completion = await client.chat.completions.create({
      model: resolveModel(),
      response_format: { type: "json_object" },
      max_tokens: 1600,
      messages: [
        { role: "system", content: AUDIT_SYSTEM },
        {
          role: "user",
          content: `# 現在の Core OS 項目（AIが毎回参照している判断軸）\n${itemsText}\n\n上記を点検し、指定の JSON で返してください。`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { overall?: unknown; findings?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "棚卸しの生成に失敗しました" },
        { status: 500 }
      );
    }
    const overall =
      typeof parsed.overall === "string" ? parsed.overall.trim() : "";

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const findings: Finding[] = (
      Array.isArray(parsed.findings) ? parsed.findings : []
    )
      .map((x): Finding | null => {
        const o = (x ?? {}) as Record<string, unknown>;
        const table = str(o.table);
        const id = str(o.id);
        const field = str(o.field);
        const action = str(o.action);
        // テーブルが allowlist 内で、(table,id) が実在することを必須に（捏造防止）
        if (!CORE_OS_EDITABLE[table]) return null;
        const rowExists = rows.some((r) => r.table === table && r.id === id);
        if (!rowExists) return null;

        const fieldRef = valueMap.get(`${table}:${id}:${field}`);
        let editable: "rewrite" | "retire" | null = null;
        if (
          (action === "rewrite" || action === "merge") &&
          isEditableField(table, field) &&
          fieldRef
        ) {
          // merge も「残す側のフィールドを統合後の文に書き直す」操作として扱う
          editable = "rewrite";
        } else if (action === "retire" && isDeletableTable(table)) {
          editable = "retire";
        }

        return {
          table,
          id,
          field,
          type: str(o.type),
          action,
          title: str(o.title),
          detail: str(o.detail),
          suggestion: str(o.suggestion),
          sectionLabel:
            fieldRef?.section ?? CORE_OS_EDITABLE[table].label ?? table,
          fieldLabel: fieldRef?.fieldLabel ?? field,
          current: fieldRef?.value ?? "",
          editable,
        };
      })
      .filter((f): f is Finding => f !== null)
      .slice(0, 8);

    return NextResponse.json({ overall, findings });
  } catch (err) {
    console.error("[coreos-audit] 生成失敗:", err);
    return NextResponse.json(
      { error: "棚卸しの生成に失敗しました" },
      { status: 500 }
    );
  }
}
