// OpenAI クライアントの共通初期化と model 解決。
//
// なぜ共通化するか:
//   gia-next には用途別に複数の GPT 経路がある:
//     - 汎用: /api/openai + hooks/useGpt
//     - AI Clone: lib/ai-clone/openai.ts
//     - 紹介コーチ chat: app/api/coach/chat/route.ts
//   model 指定や client 初期化を各所に書くと、後で「全体を gpt-4o に上げる」
//   「別の OpenAI 互換プロキシに切り替える」等の運用変更が散らかる。
//   ここに集約しておけば1ファイル修正で済む。
//
// 環境変数:
//   - OPENAI_API_KEY  必須。未設定なら getOpenAIClient() は null を返す（呼び出し側でフォールバック）。
//   - OPENAI_MODEL    任意。未指定なら DEFAULT_MODEL（"gpt-4o-mini"）を使う。
//
// 使い分け:
//   - getOpenAIClient(): OpenAI SDK を直接叩きたい時（streaming, response_format など）
//   - resolveModel(): SDK 越し / fetch 直叩き どちらでも model 名を統一したい時
//
// model 解決の優先順位:
//   関数引数 override > OPENAI_MODEL env > DEFAULT_MODEL

import OpenAI from "openai";

/** プロジェクト全体のデフォルトモデル。env 未設定時のフォールバック。 */
export const DEFAULT_MODEL = "gpt-4o-mini";

// プロセス内シングルトン。OpenAI SDK の HTTP keep-alive を活かすため複数回 new しない。
let cached: OpenAI | null | undefined;

/**
 * OpenAI クライアントを取得（プロセス内 1回だけ初期化）。
 * APIキー未設定なら null を返す。呼び出し側は「未接続フォールバック」を実装すること。
 */
export function getOpenAIClient(): OpenAI | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    cached = null;
    return null;
  }
  cached = new OpenAI({ apiKey });
  return cached;
}

/**
 * 使用するモデル名を解決する。
 * 呼び出し元から override が来ればそれを尊重し、なければ env、それもなければ DEFAULT_MODEL。
 */
export function resolveModel(override?: string | null): string {
  if (override && override.trim()) return override.trim();
  const fromEnv = process.env.OPENAI_MODEL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  return DEFAULT_MODEL;
}
