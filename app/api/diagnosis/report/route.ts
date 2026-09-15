// 売上ボトルネック診断の「詳しいレポート」AI生成。
// 結果表示後の「AIで詳しいレポートを生成」ボタンから叩く。
//   入力: 回答（採点を再計算）＋業種＋悩み（＋保存済みなら id）
//   出力: { type:{name,description}, issues:[{title,detail}x3], steps:[{title,detail}x3] }
// 「商品の売り込み」ではなく「ボトルネック診断 → 改善の優先順位」を書かせる。

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";
import {
  scoreDiagnosis,
  type Answers,
  type DiagnosisReportContent,
  type ReportItem,
} from "@/lib/diagnosis/score";
import { FALLBACK_ISSUE } from "@/lib/diagnosis/proposals";

export const runtime = "nodejs";
export const maxDuration = 60;

function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function fallbackContent(
  result: ReturnType<typeof scoreDiagnosis>
): DiagnosisReportContent {
  const issues: ReportItem[] = [
    {
      title: `${result.bottleneck.title}が最大の伸びしろ`,
      detail: FALLBACK_ISSUE[result.bottleneck.key],
    },
    {
      title: `次に伸ばせるのは${result.secondWeakest.title}`,
      detail: FALLBACK_ISSUE[result.secondWeakest.key],
    },
  ];
  const steps: ReportItem[] = [
    {
      title: `まず「${result.bottleneck.title}」を伸ばす`,
      detail: "伸びしろが一番大きい1点に集中するのが最短です。",
    },
  ];
  return {
    type: {
      name: result.fallbackTypeName,
      description: `${result.bottleneck.title}を伸ばすと、売上が大きく変わります。`,
    },
    issues,
    steps,
  };
}

function sanitizeItems(raw: unknown): ReportItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title.trim() : "";
      const detail = typeof o.detail === "string" ? o.detail.trim() : "";
      return { title, detail };
    })
    .filter((i) => i.title || i.detail)
    .slice(0, 3);
}

export async function POST(req: Request) {
  let body: {
    id?: string;
    industry?: string;
    budget?: string;
    worry?: string;
    answers?: Answers;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const answers = body.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "回答が不正です" }, { status: 400 });
  }
  const industry = (body.industry ?? "").trim();
  const budget = (body.budget ?? "").trim();
  const worry = (body.worry ?? "").trim();
  const id = (body.id ?? "").trim();

  const result = scoreDiagnosis(answers);

  let content: DiagnosisReportContent;
  const client = getOpenAIClient();

  if (!client) {
    content = fallbackContent(result);
  } else {
    try {
      const dimLines = result.dimensions
        .map((d) => `・${d.title}（${d.subtitle}）：${d.score}点`)
        .join("\n");
      const flags = [
        result.pricing.active ? `単価フラグ: ${result.pricing.message}` : "",
        result.supply.active ? `供給フラグ: ${result.supply.message}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const completion = await client.chat.completions.create({
        model: resolveModel(),
        response_format: { type: "json_object" },
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "あなたは中小企業・個人事業の売上改善に強い実務家コンサルタントです。売上を『認知集客→見込み客化→商談化→成約→継続紹介』の導線で捉え、どこを伸ばせば一番効くか（伸びしろ）を前向きに診断します。ネガティブな断定（ダメ・弱い・詰まり等）は避け、『ここを伸ばせば変わる』という言い方にします。商品の売り込みはせず、伸ばす優先順位を示します。専門用語を避け、具体的かつ率直に。診断はざっくり推定である前提で断定しすぎない。出力は必ず JSON。",
          },
          {
            role: "user",
            content: `次の診断結果から、レポートの文章を作ってください。

業種: ${industry || "不明"}
売上アップに使える月額予算: ${budget || "不明"}
総合: ${result.total}点（ランク${result.rank}）
${dimLines}
最大の伸びしろ: ${result.bottleneck.title}（次に伸ばせる: ${result.secondWeakest.title}）
${flags ? flags + "\n" : ""}本人の悩み: ${worry || "（記入なし）"}

出力JSONの形式:
{
  "type": { "name": "診断タイプ名（前向きに。例：見込み客化 伸ばしどきタイプ）", "description": "60〜120字。『集客が課題だと思っていたら、実は◯◯を伸ばすのが近道』のように、本当に伸ばせる場所を前向きに言語化して励ます" },
  "issues": [ { "title": "伸ばせるポイントの見出し（簡潔・前向き）", "detail": "60〜100字。なぜそこを伸ばすと効くか" } ],  // いま伸ばせるポイント 最大3つ
  "steps": [ { "title": "STEPの見出し", "detail": "60〜100字。具体的な行動" } ]   // 優先して取り組む順 最大3つ
}
issues と steps はそれぞれ最大3件。最も伸びしろの大きい導線から優先順位をつけて書くこと。ネガティブ語は避け、前向きな表現で。
打ち手は事業規模・予算に合わせること（月商/利益が小さめなら、まず低コストで自分でできる手を優先。規模が大きめなら外注・採用・投資も選択肢として提案）。`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as {
        type?: { name?: unknown; description?: unknown };
        issues?: unknown;
        steps?: unknown;
      };
      const typeName =
        typeof parsed.type?.name === "string" && parsed.type.name.trim()
          ? parsed.type.name.trim()
          : result.fallbackTypeName;
      const typeDesc =
        typeof parsed.type?.description === "string"
          ? parsed.type.description.trim()
          : "";
      const issues = sanitizeItems(parsed.issues);
      const steps = sanitizeItems(parsed.steps);

      content = {
        type: { name: typeName, description: typeDesc },
        issues: issues.length ? issues : fallbackContent(result).issues,
        steps: steps.length ? steps : fallbackContent(result).steps,
      };
    } catch (err) {
      console.error("[diagnosis] レポート生成失敗:", err);
      content = fallbackContent(result);
    }
  }

  // 保存済みなら ai_report を更新（ベストエフォート）
  if (id) {
    const admin = adminSupabase();
    if (admin) {
      const { error } = await admin
        .from("diagnosis_submissions")
        .update({ ai_report: content })
        .eq("id", id);
      if (error) console.error("[diagnosis] ai_report 更新失敗:", error.message);
    }
  }

  return NextResponse.json({ content });
}
