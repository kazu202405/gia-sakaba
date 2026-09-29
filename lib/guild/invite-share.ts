// 自分の招待リンクを人に送るときの部品（リンク・招待文・共有）。
//
// なぜ作るか: 招待リンクを「コピーして、LINEを開いて、貼って、文章を考える」だと、
// 紹介が生まれにくい。招待文コピーと端末の共有画面で、文章つきのメッセージを送れるようにする。
// （LINE専用のボタンは作らない。スマホの共有画面にLINEが出るため。2026-09-29 五島さん）
//
// ⚠️ 招待文に書くのは、入会画面（app/guild/join/page.tsx）に実際に書いてあることだけ。
//    「フリープラン（0円）で入会できます」は入会画面にある文言と同じ。
//    ここで約束を増やさない（料金・特典・人数など）。

/** 入会画面のURL。招待コードはURLに入れるので必ずエンコードする。 */
export function inviteUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/guild/join?invite=${encodeURIComponent(code)}`;
}

/** 招待文（リンクつき）。そのまま貼って送れる。 */
export function inviteMessage(url: string): string {
  return [
    "GIAの酒場に招待します。",
    "仕事や人脈をつなぐ場所です。下のリンクから、フリープラン（0円）で入会できます。",
    url,
  ].join("\n");
}

/** 端末の共有画面を使えるか。使えない端末ではボタン自体を出さない。 */
export function canNativeShare(nav: { share?: unknown } | undefined): boolean {
  return !!nav && typeof nav.share === "function";
}

/** 共有画面で「やめた」を選んだだけ。エラーとして知らせない。 */
export function isShareCancel(error: unknown): boolean {
  return typeof error === "object" && error !== null
    && (error as { name?: unknown }).name === "AbortError";
}

/**
 * 「リンクを作り直す」の説明。ふだんは使わない操作なので、何が起きるかを先に伝える。
 * 押した本人が心配するのは「入会した人はどうなる？」なので、必ず書く。
 * 実際の動き（sakaba_create_my_member_invite の rotate）：今のリンクを失効させ、新しいリンクを発行する。
 * すでに入会した人の invite_id は残るので、招待のつながりは消えない。
 */
export const ROTATE_COPY = {
  summary: "リンクを止めたいとき",
  lead: "リンクが広まりすぎたときなどに使います。ふだんは押さなくて大丈夫です。",
  effects: [
    "今のリンクは使えなくなり、新しいリンクができます。",
    "すでに入会した人とのつながりは、そのまま残ります。",
    "新しいリンクは、送りたい人へあらためて送り直してください。",
  ],
  button: "今のリンクを止めて、作り直す",
  busy: "作り直し中…",
  confirmTitle: "今のリンクを止めて、作り直します",
  confirmMessage: "今のリンクからは入会できなくなります。すでに入会した人とのつながりは、そのまま残ります。",
  confirmOk: "作り直す",
  done: "新しいリンクを作ってコピーしました。前のリンクは使えなくなりました",
} as const;
