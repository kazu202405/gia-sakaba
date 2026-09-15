// 会員プラン構成フラグ。
//
// 2026-06-23: 一般会員（サロン ¥990 / applicants.plan='salon'）を一旦クローズし、
// 有料は本会員（¥4,980 / plan='pro'）一本に集約する。
//
// このフラグで「990 を新規に売る／見せる導線」だけを隠す。
// DB の plan='salon' 値・既存会員データ・Stripe 決済導線（checkout/webhook）は温存。
//   → 既存の一般会員はそのまま閲覧・コーチ利用が可能（据え置き）。
//   → 990 を再開したくなったら、この値を true に戻すだけで全導線が復活する。
//
// ⚠️ 2026-08-10 追記: **true に戻すだけでは復活しない。**
//   (1) Stripe 側で GIA990 を商品ごと無効化済み（Checkout 作成が拒否される）
//   (2) /api/stripe/checkout は会員 online（¥4,980）を売るように向け替えた
//   このフラグを true にすると、¥990 と書かれたカードから ¥4,980 の決済が
//   始まる。再開するなら Price を作り直し、専用の導線を用意すること。
export const SALON_PLAN_ENABLED = false;

// 2026-08-10: 右腕AI（AI Clone）の外販を停止する。
//
// 会員の段を online/real/invite/premium に整理した際、右腕AIの
// assistant(¥4,980) / partner(¥7,980) が online / real と同じ Price ID を
// 使っていることが分かった。放置すると同じ金額の入口が2つ並び、
// Stripe の売上画面では metadata.purpose でしか区別できない。
//
// このフラグで「新規に売る導線」だけを閉じる。
//   → 既存の ai_clone_tenants はそのまま稼働（webhook の更新・解約処理も残す）
//   → 五島さん個人の道具としての利用は影響を受けない
//   → 再開したくなったら true に戻すだけで導線が復活する
export const AI_CLONE_SALES_ENABLED = false;
