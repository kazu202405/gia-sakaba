// AI Clone（アシスタント / パートナー）の Stripe Checkout を起動する Server Action。
// /services/ai・/start の料金プランカードから <form action={...}> で呼ぶ前提。
//
// 実体は checkout-core.ts の aiCloneCheckoutRedirect に集約（自動再開ページ
// /services/ai/start/[plan] と共有）。ここでは「押した元ページ（/start or
// /services/ai）」を Referer から判定して returnPath として渡すだけ。
//
// 未ログイン時は core 側で /login?next=/services/ai/start/<plan> へ飛ばすので、
// ログイン後は自動再開ページ経由で再クリック不要で決済に進む。

"use server";

import { headers } from "next/headers";
import { type AiClonePlan } from "@/lib/stripe/client";
import { aiCloneCheckoutRedirect } from "./checkout-core";

// 申込ボタンを押した元ページ（/start か /services/ai）を Referer から判定。
async function resolveReturnPath(): Promise<string> {
  try {
    const ref = (await headers()).get("referer") || "";
    const p = new URL(ref).pathname;
    if (p === "/start" || p === "/services/ai") return p;
  } catch {
    // 解析失敗時はデフォルト
  }
  return "/services/ai";
}

async function startAiCloneCheckout(plan: AiClonePlan): Promise<never> {
  const returnPath = await resolveReturnPath();
  return aiCloneCheckoutRedirect(plan, returnPath);
}

export async function startAiCloneAssistant(): Promise<never> {
  return startAiCloneCheckout("assistant");
}

export async function startAiClonePartner(): Promise<never> {
  return startAiCloneCheckout("partner");
}
