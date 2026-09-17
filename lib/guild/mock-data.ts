// 見本用の架空データ。実在の人物ではない（ギルドマスターの五島さんだけ本人）。
// Supabase につなぐときは、このファイルの関数を同じ名前・同じ戻り値のまま中身だけ差し替える。

import type {
  GiaApplicantImport,
  Guild,
  GuildNotification,
  IntroRequest,
  Party,
  Profile,
  Project,
  ProjectContact,
  ProjectStep,
  ProjectTask,
  StepRecord,
  ProfileContact,
  Quest,
  QuestApplication,
} from "./types";

/** 業種の選択肢（本番は sakaba.tags の kind=industry） */
export const industryOptions = [
  "IT・Web",
  "士業",
  "建設",
  "不動産",
  "飲食",
  "小売",
  "製造",
  "マーケティング",
  "デザイン",
  "教育・研修",
  "健康・医療",
  "美容",
  "金融・保険",
  "その他",
];

export const regionOptions = [
  "オンライン",
  "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
  "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
  "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知",
  "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
  "鳥取", "島根", "岡山", "広島", "山口",
  "徳島", "香川", "愛媛", "高知",
  "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄",
];

/** 見本の本人の連絡先（紹介が承諾された相手にだけ見える） */
export const myContact: ProfileContact = {
  profile_id: "p-morita",
  email: "sample@example.com",
  line_url: "",
  website_url: "https://example.com",
};

/** 見本：この人が以前 gia-next に書いていた内容 */
export const myGiaApplicant: GiaApplicantImport = {
  name: "森田 陽介",
  headline: "中小企業のホームページ・LP制作",
  job_title: "Web制作",
  location: "東京\n神奈川",
  services_summary: "ホームページ制作 / 採用ページ制作 / 更新の代行",
  want_to_connect_with: "士業の先生、採用に困っている経営者",
};

export const guild: Guild = {
  id: "g-gia",
  slug: "gia",
  name: "GIAギルド",
  terms: {
    member: "ギルドメンバー",
    quest: "クエスト",
    party: "パーティ",
    master: "ギルドマスター",
    status: "ステータス",
  },
};

/** 見本の「きょう」。本番ではサーバーで日本時間の日付を使う */
export const TODAY = "2026-09-15";

/** 見本でログインしている人 */
export const ME_ID = "p-morita";

/** 見本の本人が めいかん・けいじばんを最後に開いた日。本番は本人の行の members_seen_at / quests_seen_at */
export const mySeenAt = { members_seen_at: "2026-09-08", quests_seen_at: "2026-09-12" };
export const MASTER_ID = "p-goto";

export const profiles: Profile[] = [
  {
    id: "p-goto",
    display_name: "五島 一将",
    photo_url: null,
    headline: "GIA代表。人と仕事をつなぐ",
    industry: "IT・Web",
    job: "経営者",
    job_icon: "owner",
    region: "東京",
    bio: "アプリ開発と経営者コミュニティの運営をしています。",
    can_help_with: "仕組み化・アプリ化の相談、人の紹介",
    keywords: ["アプリ開発", "紹介", "経営者"],
    strengths: "人と人の間に立つこと",
    values_text: "紹介した人が得をすること",
    vision: "依頼が集まり、ちゃんとつながる場所をつくる",
    looking_for: "現場を持っている経営者",
    want_to_meet: "本気で事業を伸ばしたい人",
    role: "owner",
    visible_groups: ["work", "values", "connect"],
    accept_intro: true,
    joined_at: "2026-09-01",
  },
  {
    id: "p-morita",
    display_name: "森田 陽介",
    photo_url: null,
    headline: "中小企業のホームページ・LP制作",
    industry: "IT・Web",
    job: "Web制作",
    job_icon: "web",
    region: "東京",
    bio: "従業員10〜50名の会社のホームページと採用ページを作っています。",
    can_help_with: "ホームページ・採用ページの制作、更新の仕組みづくり",
    keywords: ["ホームページ", "採用ページ", "LP"],
    strengths: "",
    values_text: "作ったあと、社内で更新できること",
    vision: "",
    looking_for: "税理士さん・弁護士さんとのつながり",
    want_to_meet: "",
    role: "member",
    visible_groups: ["work", "connect"],
    accept_intro: true,
    joined_at: "2026-09-05",
  },
  {
    id: "p-saeki",
    display_name: "佐伯 美穂",
    photo_url: null,
    headline: "飲食・小売に強い税理士",
    industry: "士業",
    job: "税理士",
    job_icon: "tax",
    region: "大阪",
    bio: "開業3年以内の飲食店・小売店の顧問を中心にしています。オンライン対応可。",
    can_help_with: "決算・資金繰り・融資の相談",
    keywords: ["決算", "融資", "飲食店"],
    strengths: "数字を平易な言葉で説明すること",
    values_text: "社長が数字を怖がらなくなること",
    vision: "関西の飲食店の廃業を減らす",
    looking_for: "飲食店オーナー",
    want_to_meet: "店舗を増やしたい経営者",
    role: "member",
    visible_groups: ["work", "values", "connect"],
    accept_intro: true,
    joined_at: "2026-09-03",
  },
  {
    id: "p-kawashima",
    display_name: "川島 健一",
    photo_url: null,
    headline: "注文住宅とリフォームの工務店",
    industry: "建設",
    job: "工務店経営",
    job_icon: "build",
    region: "埼玉",
    bio: "社員12名の工務店を経営しています。新築とリフォームが半々です。",
    can_help_with: "住宅・店舗の施工、職人の手配",
    keywords: ["工務店", "リフォーム", "採用"],
    strengths: "現場の段取り",
    values_text: "",
    vision: "若い職人が辞めない会社にする",
    looking_for: "採用を手伝ってくれる人",
    want_to_meet: "",
    role: "member",
    visible_groups: ["work", "values", "connect"],
    accept_intro: true,
    joined_at: "2026-09-02",
  },
  {
    id: "p-noguchi",
    display_name: "野口 さやか",
    photo_url: null,
    headline: "博多で居酒屋を2店舗",
    industry: "飲食",
    job: "飲食店オーナー",
    job_icon: "food",
    region: "福岡",
    bio: "居酒屋を2店舗経営しています。3店舗目を考え中です。",
    can_help_with: "飲食店の立ち上げ・スタッフ教育の相談",
    keywords: ["居酒屋", "多店舗", "スタッフ教育"],
    strengths: "",
    values_text: "常連さんが友達を連れてくる店",
    vision: "",
    looking_for: "決算を相談できる税理士",
    want_to_meet: "多店舗展開をした先輩",
    role: "member",
    visible_groups: ["work", "connect"],
    accept_intro: true,
    joined_at: "2026-09-08",
  },
  {
    id: "p-ishii",
    display_name: "石井 拓海",
    photo_url: null,
    headline: "BtoBのマーケティング支援",
    industry: "マーケティング",
    job: "マーケター",
    job_icon: "marketing",
    region: "東京",
    bio: "製造業・士業のWeb集客とセミナー集客を支援しています。",
    can_help_with: "セミナー集客、広告運用、導線設計",
    keywords: ["セミナー", "広告", "BtoB"],
    strengths: "数字で改善を回すこと",
    values_text: "",
    vision: "",
    looking_for: "セミナーを一緒にやれる講師",
    want_to_meet: "",
    role: "member",
    visible_groups: ["work"],
    accept_intro: true,
    joined_at: "2026-09-04",
  },
  {
    id: "p-fujiwara",
    display_name: "藤原 恵",
    photo_url: null,
    headline: "空き家と古民家の再生",
    industry: "不動産",
    job: "不動産",
    job_icon: "realestate",
    region: "神奈川",
    bio: "空き家・古民家の買取と再生、民泊への転用を手がけています。",
    can_help_with: "物件探し、空き家活用の相談",
    keywords: ["空き家", "古民家", "民泊"],
    strengths: "地主さんとの交渉",
    values_text: "古い建物を壊さずに使うこと",
    vision: "地方の空き家を仕事の場所に変える",
    looking_for: "空き家で事業をしたい人",
    want_to_meet: "Webで集客できる人",
    role: "member",
    visible_groups: ["work", "values", "connect"],
    accept_intro: true,
    joined_at: "2026-09-06",
  },
  {
    id: "p-ono",
    display_name: "大野 亮",
    photo_url: null,
    headline: "中小企業の契約・労務の弁護士",
    industry: "士業",
    job: "弁護士",
    job_icon: "legal",
    region: "東京",
    bio: "契約書のチェックと、労務トラブルの予防を中心にしています。",
    can_help_with: "契約書の確認、利用規約の作成",
    keywords: ["契約書", "労務", "利用規約"],
    strengths: "",
    values_text: "",
    vision: "",
    looking_for: "",
    want_to_meet: "",
    role: "member",
    visible_groups: ["work"],
    accept_intro: true,
    joined_at: "2026-09-07",
  },
  {
    id: "p-komatsu",
    display_name: "小松 由佳",
    photo_url: null,
    headline: "ロゴと販促物のデザイン",
    industry: "デザイン",
    job: "デザイナー",
    job_icon: "design",
    region: "オンライン",
    bio: "ロゴ・チラシ・名刺・パッケージのデザイン。全国オンラインで対応しています。",
    can_help_with: "ロゴ、チラシ、LPのデザイン",
    keywords: ["ロゴ", "チラシ", "パッケージ"],
    strengths: "お店の雰囲気を形にすること",
    values_text: "",
    vision: "",
    looking_for: "文章を書ける人",
    want_to_meet: "",
    role: "member",
    visible_groups: ["work", "values", "connect"],
    accept_intro: true,
    joined_at: "2026-09-09",
  },
  {
    id: "p-hasegawa",
    display_name: "長谷川 修",
    photo_url: null,
    headline: "管理職研修の講師",
    industry: "教育・研修",
    job: "研修講師",
    job_icon: "teach",
    region: "名古屋",
    bio: "製造業の管理職研修と、若手の定着の研修をしています。",
    can_help_with: "社内研修、登壇",
    keywords: ["研修", "管理職", "定着"],
    strengths: "",
    values_text: "",
    vision: "",
    looking_for: "AIを使った研修ができる人",
    want_to_meet: "",
    role: "member",
    visible_groups: ["work", "connect"],
    accept_intro: false,
    joined_at: "2026-09-10",
  },
  {
    id: "p-murakami",
    display_name: "村上 奈々",
    photo_url: null,
    headline: "京都の整体院",
    industry: "健康・医療",
    job: "整体院",
    job_icon: "health",
    region: "京都",
    bio: "女性向けの整体院を1店舗。産後ケアが中心です。",
    can_help_with: "姿勢・体の不調の相談",
    keywords: ["整体", "産後ケア"],
    strengths: "",
    values_text: "通い続けなくてよい体にすること",
    vision: "",
    looking_for: "",
    want_to_meet: "",
    role: "member",
    visible_groups: ["work", "values"],
    accept_intro: true,
    joined_at: "2026-09-11",
  },
];

export const quests: Quest[] = [
  // ギルドマスターが ひらく、有料会員だけの リアルの集まり（仕事の紹介ではない）
  {
    id: "q-sakaba-night",
    creator_id: "p-goto",
    title: "10月の 酒場の夜（有料会員の のみかい）",
    category: "gathering",
    summary: "大阪・北新地で、ギルドの人と ゆっくり話す夜です。",
    body: "10月24日（土）19時から、北新地の お店で ひらきます。\nはじめての人も、ギルドマスターが 間に入って 紹介します。\n会費は お店で 当日に お支払いください。",
    region: "大阪",
    deadline: "2026-10-20",
    member_limit: 12,
    is_urgent: false,
    members_only: true,
    status: "open",
    created_at: "2026-09-16",
  },
  {
    id: "q-recruit-page",
    creator_id: "p-kawashima",
    title: "職人の採用ページを作れる人を探しています",
    category: "work",
    summary: "求人媒体に頼らず、自社のページから応募が来るようにしたい。",
    body: "今は求人媒体に年100万円ほど払っていますが、応募はほとんど来ません。\n現場の写真と先輩職人の声を載せた採用ページを作りたいです。撮影から相談できる方だと助かります。",
    region: "埼玉",
    deadline: "2026-09-26",
    member_limit: 2,
    is_urgent: true,
    members_only: false,
    status: "open",
    created_at: "2026-09-12",
  },
  {
    id: "q-izakaya-tax",
    creator_id: "p-noguchi",
    title: "3店舗目を出す前に、決算を一緒に見てほしい",
    category: "consult",
    summary: "今の数字で3店舗目を出してよいか判断したい。",
    body: "2店舗の決算書はあるのですが、正直よく読めていません。\n飲食店に詳しい税理士さんに、一度数字を見てもらいたいです。",
    region: "福岡（オンライン可）",
    deadline: null,
    member_limit: 1,
    is_urgent: false,
    members_only: false,
    status: "open",
    created_at: "2026-09-13",
  },
  {
    id: "q-akiya-biz",
    creator_id: "p-fujiwara",
    title: "古民家を使った事業を一緒に考えませんか",
    category: "collab",
    summary: "鎌倉の古民家1棟。宿・教室・撮影スタジオなど使い方を探しています。",
    body: "鎌倉で古民家を1棟再生しました。\n宿にするか、教室やスタジオとして貸すか、まだ決めていません。場所を使って事業をしたい方、集客を手伝える方と組みたいです。",
    region: "神奈川",
    deadline: null,
    member_limit: 3,
    is_urgent: false,
    members_only: false,
    status: "open",
    created_at: "2026-09-10",
  },
  {
    id: "q-ai-training",
    creator_id: "p-hasegawa",
    title: "管理職向け「AIの使い方」研修の登壇者",
    category: "work",
    summary: "製造業の管理職30名に、2時間の研修をお願いできる方。",
    body: "取引先の製造業から依頼がありました。難しい話ではなく、明日から使える内容を2時間でお願いしたいです。",
    region: "名古屋",
    deadline: "2026-11-20",
    member_limit: 1,
    is_urgent: false,
    members_only: false,
    status: "in_progress",
    created_at: "2026-09-05",
  },
  {
    id: "q-seminar-cohost",
    creator_id: "p-ishii",
    title: "士業向けセミナーを共催できる方",
    category: "collab",
    summary: "集客はこちらで。話す内容を持っている方を探しています。",
    body: "士業の先生向けに、オンラインセミナーを月1回やっています。集客と配信はこちらで行うので、テーマを持っている方と組みたいです。",
    region: "オンライン",
    deadline: null,
    member_limit: 2,
    is_urgent: false,
    members_only: false,
    status: "open",
    created_at: "2026-09-14",
  },
  {
    id: "q-seitai-lp",
    creator_id: "p-murakami",
    title: "整体院のLPを見直したい",
    category: "consult",
    summary: "予約が月に数件しか入らないLPを直したい。",
    body: "文章とデザインの両方を見てもらいました。",
    region: "京都（オンライン可）",
    deadline: null,
    member_limit: 2,
    is_urgent: false,
    members_only: false,
    status: "completed",
    created_at: "2026-09-02",
  },
  // 見本の本人（森田）が出したクエスト。「参加したい人を見る」を試せるように
  {
    id: "q-lp-writing",
    creator_id: "p-morita",
    title: "LPの文章を書ける方を探しています",
    category: "work",
    summary: "制作は自分で。お客様に響く文章を一緒に考えてほしい。",
    body: "中小企業のLPを月に2〜3本作っています。デザインと組み上げは自分でできますが、文章でいつも止まります。\nお客様への聞き取りから一緒に入って、文章を書いていただける方を探しています。",
    region: "東京（オンライン可）",
    deadline: "2026-10-31",
    member_limit: 2,
    is_urgent: false,
    members_only: false,
    status: "open",
    created_at: "2026-09-13",
  },
  // 出した人が取り下げたクエスト（見本の本人は参加したいと伝えていた）
  {
    id: "q-shop-sns",
    creator_id: "p-noguchi",
    title: "お店のInstagramを一緒に回してくれる方",
    category: "work",
    summary: "新メニューの写真と投稿を、月4回ほどお願いしたい。",
    body: "2店舗ぶんのInstagramを、スタッフが片手間で更新しています。写真の撮り方と投稿の型を一緒に作ってくれる方を探していました。",
    region: "福岡（オンライン可）",
    deadline: null,
    member_limit: 1,
    is_urgent: false,
    members_only: false,
    status: "withdrawn",
    created_at: "2026-09-06",
  },
];

/** 「参加したい」。本番は sakaba.quest_applications */
export const questApplications: QuestApplication[] = [
  {
    quest_id: "q-recruit-page",
    user_id: "p-morita",
    message: "採用ページの制作実績があります。撮影は協力会社と一緒に伺えます。",
    status: "applied",
    created_at: "2026-09-12",
  },
  {
    quest_id: "q-akiya-biz",
    user_id: "p-komatsu",
    message: "古民家の雰囲気に合うロゴと看板を考えられます。",
    status: "applied",
    created_at: "2026-09-11",
  },
  { quest_id: "q-akiya-biz", user_id: "p-ishii", message: "", status: "applied", created_at: "2026-09-12" },
  { quest_id: "q-ai-training", user_id: "p-goto", message: "", status: "applied", created_at: "2026-09-06" },
  { quest_id: "q-seitai-lp", user_id: "p-komatsu", message: "", status: "applied", created_at: "2026-09-03" },
  { quest_id: "q-seitai-lp", user_id: "p-ishii", message: "", status: "applied", created_at: "2026-09-03" },
  // 森田のクエストへの参加希望
  {
    quest_id: "q-lp-writing",
    user_id: "p-ishii",
    message: "広告用のLPの文章なら何本も書いてきました。聞き取りから入れます。",
    status: "applied",
    created_at: "2026-09-13",
  },
  {
    quest_id: "q-lp-writing",
    user_id: "p-komatsu",
    message: "デザインと合わせて、文章の方向も一緒に考えられます。",
    status: "applied",
    created_at: "2026-09-14",
  },
  { quest_id: "q-lp-writing", user_id: "p-hasegawa", message: "", status: "applied", created_at: "2026-09-15" },
  // 取り消した人は一覧にも人数にも出さない
  { quest_id: "q-lp-writing", user_id: "p-murakami", message: "", status: "withdrawn", created_at: "2026-09-14" },
  { quest_id: "q-shop-sns", user_id: "p-morita", message: "", status: "applied", created_at: "2026-09-07" },
];

export const parties: Party[] = [
  {
    id: "party-seitai-lp",
    name: "整体院LP改善パーティ",
    quest_id: "q-seitai-lp",
    member_ids: ["p-murakami", "p-komatsu", "p-ishii"],
    formed_at: "2026-09-09",
  },
];

export const introRequests: IntroRequest[] = [
  // 見本の本人（森田）が出した依頼
  {
    id: "r-1",
    requester_id: "p-morita",
    target_id: "p-saeki",
    quest_id: null,
    purpose: "consult",
    message: "制作会社の決算の見方を一度教わりたいです。",
    status: "reviewing",
    outcome: null,
    created_at: "2026-09-14",
    updated_at: "2026-09-14",
  },
  {
    id: "r-2",
    requester_id: "p-morita",
    target_id: "p-ono",
    quest_id: null,
    purpose: "work",
    message: "お客様のサイトに載せる利用規約を見ていただきたいです。",
    status: "proposed",
    outcome: null,
    created_at: "2026-09-12",
    updated_at: "2026-09-13",
  },
  {
    id: "r-3",
    requester_id: "p-morita",
    target_id: "p-komatsu",
    quest_id: null,
    purpose: "collab",
    message: "LP制作で、デザインをお願いできる方を探しています。",
    status: "accepted",
    outcome: null,
    created_at: "2026-09-08",
    updated_at: "2026-09-11",
  },
  {
    id: "r-4",
    requester_id: "p-morita",
    target_id: "p-kawashima",
    quest_id: "q-recruit-page",
    purpose: "work",
    message: "採用ページのクエストを見ました。一度お話を伺いたいです。",
    status: "introduced",
    outcome: "working",
    created_at: "2026-09-12",
    updated_at: "2026-09-14",
  },
  // 見本の本人（森田）への打診
  {
    id: "r-5",
    requester_id: "p-fujiwara",
    target_id: "p-morita",
    quest_id: "q-akiya-biz",
    purpose: "collab",
    message: "古民家の予約ページを作れる方を探しています。",
    status: "proposed",
    outcome: null,
    created_at: "2026-09-13",
    updated_at: "2026-09-14",
  },
  // ほかの人どうし（ギルドマスター画面で見える）
  {
    id: "r-6",
    requester_id: "p-noguchi",
    target_id: "p-saeki",
    quest_id: "q-izakaya-tax",
    purpose: "consult",
    message: "クエストに書いた件で、佐伯さんにお願いしたいです。",
    status: "requested",
    outcome: null,
    created_at: "2026-09-15",
    updated_at: "2026-09-15",
  },
  {
    id: "r-7",
    requester_id: "p-ishii",
    target_id: "p-fujiwara",
    quest_id: null,
    purpose: "info",
    message: "空き家の活用事例をセミナーで紹介させてもらえないかと思っています。",
    status: "requested",
    outcome: null,
    created_at: "2026-09-14",
    updated_at: "2026-09-14",
  },
  {
    id: "r-8",
    requester_id: "p-kawashima",
    target_id: "p-hasegawa",
    quest_id: null,
    purpose: "work",
    message: "若手職人向けの研修をお願いしたいです。",
    status: "declined_by_target",
    outcome: null,
    created_at: "2026-09-06",
    updated_at: "2026-09-08",
  },
  {
    id: "r-9",
    requester_id: "p-murakami",
    target_id: "p-komatsu",
    quest_id: "q-seitai-lp",
    purpose: "work",
    message: "LPのデザインをお願いしたいです。",
    status: "introduced",
    outcome: "met",
    created_at: "2026-09-03",
    updated_at: "2026-09-05",
  },
  // 森田が自分のクエストの参加希望者から選んだ（クエスト経由の紹介）
  {
    id: "r-10",
    requester_id: "p-morita",
    target_id: "p-ishii",
    quest_id: "q-lp-writing",
    purpose: "work",
    message: "LPの文章のクエストに手をあげてくださった石井さんにお願いしたいです。",
    status: "reviewing",
    outcome: null,
    created_at: "2026-09-14",
    updated_at: "2026-09-15",
  },
  // 同じクエストで、小松さんは承諾済み（プロジェクトのパーティに入れられる）
  {
    id: "r-11",
    requester_id: "p-morita",
    target_id: "p-komatsu",
    quest_id: "q-lp-writing",
    purpose: "work",
    message: "デザインと合わせて文章の方向も一緒に考えていただけたら心強いです。",
    status: "accepted",
    outcome: null,
    created_at: "2026-09-14",
    updated_at: "2026-09-16",
  },
];

// ---- 取得関数（本番ではここを Supabase の RPC に差し替える） ----

export function getProfile(id: string): Profile | undefined {
  return profiles.find((p) => p.id === id);
}

export function getQuest(id: string): Quest | undefined {
  return quests.find((q) => q.id === id);
}

/** 名鑑に出す仲間（ギルドマスター本人も含む） */
export function listMembers(): Profile[] {
  return profiles;
}

/** そのクエストの「参加したい」（取り消した人は除く） */
export function listApplications(questId: string): QuestApplication[] {
  return questApplications.filter((a) => a.quest_id === questId && a.status === "applied");
}

export function applicantCount(questId: string): number {
  return listApplications(questId).length;
}

/** その人の「参加したい」（取り消していないもの） */
export function getApplication(questId: string, userId: string): QuestApplication | undefined {
  return listApplications(questId).find((a) => a.user_id === userId);
}

/** 参加したい人の一覧を見られるのは、出した人とギルドマスター（owner/master）だけ */
export function canSeeApplicants(quest: Quest, viewerId: string): boolean {
  if (quest.creator_id === viewerId) return true;
  const role = getProfile(viewerId)?.role;
  return role === "owner" || role === "master";
}

/** 出した人が、その参加希望者について出した紹介依頼（取り下げたものは除く） */
export function findQuestIntro(quest: Quest, applicantId: string): IntroRequest | undefined {
  return introRequests.find(
    (r) =>
      r.quest_id === quest.id &&
      r.requester_id === quest.creator_id &&
      r.target_id === applicantId &&
      r.status !== "cancelled",
  );
}

/** 出した人か参加した人として関わり、クリアになったクエストの数 */
export function questClearCount(profileId: string): number {
  return quests.filter(
    (q) => q.status === "completed" && (q.creator_id === profileId || getApplication(q.id, profileId) !== undefined),
  ).length;
}

export function partyCount(profileId: string): number {
  return parties.filter((p) => p.member_ids.includes(profileId)).length;
}

/** 見本の本人（森田）が見えるプロジェクト。ほかの人の本人だけのプロジェクトも混ぜて、見えないことを確かめられるようにする */
export const projects: Project[] = [
  {
    id: "pj-hp",
    owner_id: "p-morita",
    title: "自社ホームページを 新しくする",
    goal: "トップと サービスのページを 今の仕事に合わせて 公開しなおす",
    memo: "写真は 9月中に撮影。文章は 先に仮で入れて、あとで差し替える。",
    source_quest_id: null,
    member_ids: [],
    status: "active",
    start_date: "2026-09-01",
    due_date: "2026-09-30",
    created_at: "2026-09-01",
    done_at: null,
  },
  {
    id: "pj-sales",
    owner_id: "p-morita",
    title: "ホームページ制作の 営業",
    goal: "9月中に 3社と 話をして、1社 契約する",
    memo: "紹介でいただいた方から 先に連絡する。",
    source_quest_id: null,
    member_ids: [],
    status: "active",
    start_date: "2026-09-01",
    due_date: "2026-09-30",
    created_at: "2026-09-01",
    done_at: null,
  },
  {
    id: "pj-seitai",
    owner_id: "p-murakami",
    title: "整体院LP改善",
    goal: "予約ボタンまで 迷わず行けるページにする",
    memo: "",
    source_quest_id: "q-seitai-lp",
    member_ids: ["p-komatsu", "p-morita"],
    status: "active",
    start_date: "2026-09-09",
    due_date: null,
    created_at: "2026-09-09",
    done_at: null,
  },
  {
    id: "pj-card",
    owner_id: "p-morita",
    title: "名刺を つくりなおす",
    goal: "肩書と QRコードを 今の仕事に合わせる",
    memo: "",
    source_quest_id: null,
    member_ids: [],
    status: "done",
    start_date: "2026-09-01",
    due_date: null,
    created_at: "2026-09-01",
    done_at: "2026-09-10",
  },
  // ほかの人の、本人だけのプロジェクト（森田には見えない）
  {
    id: "pj-private-other",
    owner_id: "p-ishii",
    title: "確定申告の じゅんび",
    goal: "",
    memo: "",
    source_quest_id: null,
    member_ids: [],
    status: "active",
    start_date: "2026-09-12",
    due_date: null,
    created_at: "2026-09-12",
    done_at: null,
  },
];

type TaskSeed = Omit<ProjectTask, "start_date" | "done_at"> & Partial<Pick<ProjectTask, "start_date" | "done_at">>;
const seedTask = (t: TaskSeed): ProjectTask => ({ start_date: null, done_at: null, ...t });

export const projectTasks: ProjectTask[] = [
  seedTask({ id: "t-hp-1", project_id: "pj-hp", title: "キャッチコピーを 考える", status: "done", assignee_id: null, start_date: "2026-09-08", due_date: "2026-09-12", sort_order: 1, done_at: "2026-09-12" }),
  seedTask({ id: "t-hp-2", project_id: "pj-hp", title: "トップの画像を 用意する", status: "todo", assignee_id: null, start_date: "2026-09-10", due_date: "2026-09-14", sort_order: 2 }),
  seedTask({ id: "t-hp-3", project_id: "pj-hp", title: "サービスの説明を なおす", status: "todo", assignee_id: null, start_date: "2026-09-15", due_date: "2026-09-19", sort_order: 3 }),
  seedTask({ id: "t-hp-4", project_id: "pj-hp", title: "公開する", status: "todo", assignee_id: null, due_date: "2026-09-30", sort_order: 4 }),
  seedTask({ id: "t-sales-1", project_id: "pj-sales", title: "提案資料を つくる", status: "done", assignee_id: null, start_date: "2026-09-01", due_date: "2026-09-05", sort_order: 1, done_at: "2026-09-05" }),
  seedTask({ id: "t-sales-2", project_id: "pj-sales", title: "料金表を なおす", status: "todo", assignee_id: null, due_date: "2026-09-19", sort_order: 2 }),
  seedTask({ id: "t-sei-1", project_id: "pj-seitai", title: "いまの予約の流れを 書き出す", status: "done", assignee_id: "p-komatsu", due_date: null, sort_order: 1, done_at: "2026-09-11" }),
  seedTask({ id: "t-sei-2", project_id: "pj-seitai", title: "ボタンの位置の 案を出す", status: "todo", assignee_id: "p-morita", due_date: "2026-09-20", sort_order: 2 }),
  seedTask({ id: "t-card-1", project_id: "pj-card", title: "肩書を決める", status: "done", assignee_id: null, due_date: null, sort_order: 1, done_at: "2026-09-05" }),
  seedTask({ id: "t-card-2", project_id: "pj-card", title: "印刷を 頼む", status: "done", assignee_id: null, due_date: null, sort_order: 2, done_at: "2026-09-10" }),
  seedTask({ id: "t-other-1", project_id: "pj-private-other", title: "領収書を まとめる", status: "todo", assignee_id: null, due_date: "2026-09-17", sort_order: 1 }),
];

/** 「人ごとの すすみ」を はじめるときの 型（営業） */
export const SALES_STEP_NAMES = ["初回アポ", "興味付け", "提案", "契約"];

export const projectSteps: ProjectStep[] = SALES_STEP_NAMES.map((name, i) => ({
  id: `st-sales-${i + 1}`,
  project_id: "pj-sales",
  name,
  sort_order: i + 1,
}));

export const projectContacts: ProjectContact[] = [
  { id: "c-a", project_id: "pj-sales", label: "Aさん（工務店）", memo: "", sort_order: 1 },
  { id: "c-b", project_id: "pj-sales", label: "Bさん（整骨院）", memo: "採用ページも 気にしていた", sort_order: 2 },
  { id: "c-c", project_id: "pj-sales", label: "Cさん（税理士）", memo: "紹介：石井さん", sort_order: 3 },
  { id: "c-d", project_id: "pj-sales", label: "Dさん（美容室）", memo: "見積もりは 2案 出す", sort_order: 4 },
  { id: "c-e", project_id: "pj-sales", label: "Eさん（歯科医院）", memo: "", sort_order: 5 },
  { id: "c-f", project_id: "pj-sales", label: "Fさん（不動産）", memo: "10月から 制作を はじめる", sort_order: 6 },
  { id: "c-g", project_id: "pj-sales", label: "Gさん（飲食店）", memo: "返事待ち。来週 もう一度 連絡", sort_order: 7 },
  { id: "c-h", project_id: "pj-sales", label: "Hさん（学習塾）", memo: "今期は 見送り", sort_order: 8 },
];

export const stepRecords: StepRecord[] = [
  { contact_id: "c-a", step_id: "st-sales-1", planned_on: "2026-09-18", done_on: null },
  { contact_id: "c-b", step_id: "st-sales-1", planned_on: "2026-09-10", done_on: "2026-09-10" },
  { contact_id: "c-b", step_id: "st-sales-2", planned_on: "2026-09-17", done_on: null },
  { contact_id: "c-c", step_id: "st-sales-1", planned_on: null, done_on: "2026-09-03" },
  { contact_id: "c-c", step_id: "st-sales-2", planned_on: null, done_on: "2026-09-12" },
  { contact_id: "c-c", step_id: "st-sales-4", planned_on: "2026-09-25", done_on: null },
  // 提案の予定が近い
  { contact_id: "c-d", step_id: "st-sales-1", planned_on: null, done_on: "2026-09-05" },
  { contact_id: "c-d", step_id: "st-sales-2", planned_on: null, done_on: "2026-09-09" },
  { contact_id: "c-d", step_id: "st-sales-3", planned_on: "2026-09-19", done_on: null },
  // まだ はじめの予定だけ
  { contact_id: "c-e", step_id: "st-sales-1", planned_on: "2026-09-22", done_on: null },
  // 契約まで 進んだ
  { contact_id: "c-f", step_id: "st-sales-1", planned_on: null, done_on: "2026-08-28" },
  { contact_id: "c-f", step_id: "st-sales-2", planned_on: null, done_on: "2026-09-02" },
  { contact_id: "c-f", step_id: "st-sales-3", planned_on: null, done_on: "2026-09-08" },
  { contact_id: "c-f", step_id: "st-sales-4", planned_on: null, done_on: "2026-09-14" },
  // 予定日を すぎても 終わっていない
  { contact_id: "c-g", step_id: "st-sales-1", planned_on: null, done_on: "2026-09-01" },
  { contact_id: "c-g", step_id: "st-sales-2", planned_on: "2026-09-12", done_on: null },
  // 提案までで 止まっている
  { contact_id: "c-h", step_id: "st-sales-1", planned_on: null, done_on: "2026-08-20" },
  { contact_id: "c-h", step_id: "st-sales-2", planned_on: null, done_on: "2026-08-27" },
  { contact_id: "c-h", step_id: "st-sales-3", planned_on: null, done_on: "2026-09-04" },
];

/** 見本の本人（森田）への「おしらせ」。本番は sakaba.notifications */
export const notifications: GuildNotification[] = [
  {
    id: "n-1",
    user_id: "p-morita",
    kind: "quest_applied",
    actor_id: "p-hasegawa",
    quest_id: "q-lp-writing",
    intro_request_id: null,
    intro_status: null,
    changed_fields: [],
    read_at: null,
    created_at: "2026-09-15",
  },
  {
    id: "n-2",
    user_id: "p-morita",
    kind: "quest_applied",
    actor_id: "p-komatsu",
    quest_id: "q-lp-writing",
    intro_request_id: null,
    intro_status: null,
    changed_fields: [],
    read_at: null,
    created_at: "2026-09-14",
  },
  {
    id: "n-3",
    user_id: "p-morita",
    kind: "quest_updated",
    actor_id: "p-kawashima",
    quest_id: "q-recruit-page",
    intro_request_id: null,
    intro_status: null,
    changed_fields: ["deadline", "is_urgent"],
    read_at: null,
    created_at: "2026-09-14",
  },
  {
    id: "n-4",
    user_id: "p-morita",
    kind: "intro_progress",
    actor_id: null,
    quest_id: null,
    intro_request_id: "r-5",
    intro_status: "proposed",
    changed_fields: [],
    read_at: null,
    created_at: "2026-09-14",
  },
  {
    id: "n-5",
    user_id: "p-morita",
    kind: "intro_progress",
    actor_id: null,
    quest_id: null,
    intro_request_id: "r-2",
    intro_status: "proposed",
    changed_fields: [],
    read_at: "2026-09-13",
    created_at: "2026-09-13",
  },
  {
    id: "n-6",
    user_id: "p-morita",
    kind: "quest_applied",
    actor_id: "p-ishii",
    quest_id: "q-lp-writing",
    intro_request_id: null,
    intro_status: null,
    changed_fields: [],
    read_at: "2026-09-13",
    created_at: "2026-09-13",
  },
  {
    id: "n-7",
    user_id: "p-morita",
    kind: "intro_progress",
    actor_id: null,
    quest_id: null,
    intro_request_id: "r-3",
    intro_status: "accepted",
    changed_fields: [],
    read_at: "2026-09-11",
    created_at: "2026-09-11",
  },
  {
    id: "n-8",
    user_id: "p-morita",
    kind: "quest_withdrawn",
    actor_id: "p-noguchi",
    quest_id: "q-shop-sns",
    intro_request_id: null,
    intro_status: null,
    changed_fields: [],
    read_at: "2026-09-09",
    created_at: "2026-09-09",
  },
];

/** 新しい順 */
export function listNotifications(userId: string): GuildNotification[] {
  return notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
