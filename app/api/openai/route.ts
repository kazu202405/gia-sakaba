import { NextRequest, NextResponse } from "next/server";
import { resolveModel } from "@/lib/openai/client";

export async function POST(request: NextRequest) {
  const apiUrl = process.env.OPENAI_API_URL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { error: "API URLまたはAPIキーが設定されていません。環境変数を確認してください。" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // バリデーション1: メッセージが配列かつ空でないことを確認
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "メッセージが無効です。正しい形式でリクエストを送信してください。" },
        { status: 400 }
      );
    }

    // バリデーション2: max_tokensが数値であり正の値であることを確認
    if (body.max_tokens && (typeof body.max_tokens !== "number" || body.max_tokens <= 0)) {
      return NextResponse.json(
        { error: "max_tokensは正の数値で指定してください。" },
        { status: 400 }
      );
    }

    // バリデーション3: メッセージサイズ制限（例: 10KB以下）を超えないことを確認
    if (JSON.stringify(body.messages).length > 10000) {
      return NextResponse.json(
        { error: "リクエストが大きすぎます。メッセージを減らしてください。" },
        { status: 413 }
      );
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // クライアント指定があれば尊重し、なければ env / DEFAULT_MODEL に従う
        model: resolveModel(body.model),
        messages: body.messages,
        max_tokens: body.max_tokens || 3500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "OpenAI APIでエラーが発生しました。" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // レスポンスの形式を検証
    if (!data || !data.choices || !Array.isArray(data.choices)) {
      return NextResponse.json(
        { error: "外部APIのレスポンスが不正です。" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("バックエンドエラー:", error);
    return NextResponse.json(
      { error: "サーバーでエラーが発生しました。時間を置いて再度お試しください。" },
      { status: 500 }
    );
  }
}
