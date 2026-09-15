// 会員「オンライン ¥4,980」の Stripe Checkout Session を作り、URL を返す。
// クライアント（UpgradeCta）は受け取った url に window.location.href で遷移する。
//
// 2026-08-10: サロン ¥990 専用のエンドポイントだったが、会員の段を
// online / real / invite / premium に整理したのに伴い online へ向け替えた。
// ¥990（GIA990）は Stripe 側で商品ごと無効化済みで、新規には売らない。
// 決済の作り方は lib/stripe/membership-checkout.ts に集約している。
//
// 応答は必ず JSON にする。生の 500（空ボディ）を返すと
// クライアントの res.json() が「Unexpected end of JSON input」になるため。

import { NextResponse } from "next/server";
import { createMembershipCheckout } from "@/lib/stripe/membership-checkout";

export async function POST() {
  const result = await createMembershipCheckout("online", {
    successPath: "/upgrade/success?session_id={CHECKOUT_SESSION_ID}",
    cancelPath: "/upgrade",
  });

  switch (result.status) {
    case "ok":
      return NextResponse.json({ url: result.url });

    case "unauthenticated":
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    case "already_active":
      return NextResponse.json(
        { error: "既に会員としてご契約中です" },
        { status: 400 },
      );

    case "unavailable":
      return NextResponse.json(
        { error: "ただいま決済の準備中です。", unavailable: true },
        { status: 200 },
      );
  }
}
