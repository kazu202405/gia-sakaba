// /clone/[slug]/services の Server Actions。
// テナント member 判定は ai_clone_service への RLS が自動実行する。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";
import { REFERRAL_KNOWLEDGE } from "@/lib/ai-clone/referral-knowledge";

export interface ServiceInput {
  name: string;
  target_audience?: string | null;
  problem_solved?: string | null;
  offering?: string | null;
  pricing?: string | null;
  onboarding_flow?: string | null;
  faq_text?: string | null;
  good_fit?: string | null;
  bad_fit?: string | null;
  // 紹介されやすさ（migration 0053）。紹介コーチの価値設計レンズで磨く対象。
  usp?: string | null;
  buying_reason?: string | null;
  referral_one_liner?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createService(
  slug: string,
  tenantId: string,
  input: ServiceInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "サービス名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_service").insert({
    tenant_id: tenantId,
    name,
    target_audience: norm(input.target_audience),
    problem_solved: norm(input.problem_solved),
    offering: norm(input.offering),
    pricing: norm(input.pricing),
    onboarding_flow: norm(input.onboarding_flow),
    faq_text: norm(input.faq_text),
    good_fit: norm(input.good_fit),
    bad_fit: norm(input.bad_fit),
    usp: norm(input.usp),
    buying_reason: norm(input.buying_reason),
    referral_one_liner: norm(input.referral_one_liner),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/services`);
  return { ok: true };
}

export async function updateService(
  slug: string,
  tenantId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "サービス名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_service")
    .update({
      name,
      target_audience: norm(input.target_audience),
      problem_solved: norm(input.problem_solved),
      offering: norm(input.offering),
      pricing: norm(input.pricing),
      onboarding_flow: norm(input.onboarding_flow),
      faq_text: norm(input.faq_text),
      good_fit: norm(input.good_fit),
      bad_fit: norm(input.bad_fit),
      usp: norm(input.usp),
      buying_reason: norm(input.buying_reason),
      referral_one_liner: norm(input.referral_one_liner),
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/services`);
  revalidatePath(`/clone/${slug}/services/${serviceId}`);
  return { ok: true };
}

export async function deleteService(
  slug: string,
  tenantId: string,
  serviceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_service")
    .delete()
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/services`);
  return { ok: true };
}

export interface ServicePolish {
  usp: string;
  buying_reason: string;
  referral_one_liner: string;
}

// サービスの既存情報を素材に、紹介ノウハウのレンズで
// USP・買う理由・紹介の一言の案を生成する（保存はしない。フォームに入れて人が確認）。
export async function polishService(
  input: ServiceInput,
): Promise<{ ok: boolean; data?: ServicePolish; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  if (!input.name?.trim()) {
    return { ok: false, error: "先にサービス名を入れてください" };
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return { ok: false, error: "AIが未設定です（OPENAI_API_KEY）" };
  }

  const facts = [
    `サービス名: ${input.name}`,
    input.target_audience ? `対象者: ${input.target_audience}` : null,
    input.problem_solved ? `解決する悩み: ${input.problem_solved}` : null,
    input.offering ? `提供内容: ${input.offering}` : null,
    input.pricing ? `料金: ${input.pricing}` : null,
    input.good_fit ? `提案に向く相手: ${input.good_fit}` : null,
    input.bad_fit ? `向かない相手: ${input.bad_fit}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await openai.chat.completions.create({
      model: resolveModel(),
      response_format: { type: "json_object" },
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "あなたは紹介営業の専門家です。以下の紹介ノウハウに沿って、1つのサービスを『紹介されやすく』磨きます。\n" +
            REFERRAL_KNOWLEDGE +
            "\n\n制約：このサービスの情報だけを根拠にし、書かれていない事実を創作しない。サービスの対象・悩み・提供に即して、そのサービス固有に尖らせる（一般論や他サービスへの流用はしない）。" +
            '出力は日本語のJSONのみ: { "usp": "他との違いを1〜2文", "buying_reason": "なぜあなた／なぜ今を1〜2文", "referral_one_liner": "『〇〇があってさ…』と30秒で紹介できる一言" }',
        },
        {
          role: "user",
          content: `# 磨くサービス\n${facts}\n\nこのサービスの USP・買う理由・紹介の一言を作ってください。`,
        },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    return {
      ok: true,
      data: {
        usp: typeof parsed.usp === "string" ? parsed.usp : "",
        buying_reason:
          typeof parsed.buying_reason === "string" ? parsed.buying_reason : "",
        referral_one_liner:
          typeof parsed.referral_one_liner === "string"
            ? parsed.referral_one_liner
            : "",
      },
    };
  } catch (e) {
    console.error("[services] polish 失敗:", e);
    return {
      ok: false,
      error: "生成に失敗しました。少し時間をおいて試してください。",
    };
  }
}
