import { members } from "./mock-data";

// プロパティ名は Supabase の列名（snake_case）に揃えてある。
// Phase 2 で Supabase select() の戻り値にそのまま差し替えできるよう、
// mock の interface 段階から DB 列名と同じ綴り・同じ意味で持つ。
//
// 列名の正本は supabase/migrations/0001_initial_schema.sql ＋ 0007_add_applicant_extended_fields.sql。
// DB に未追加のフィールド（photo_url, trust_score, recommendation_count, context_tags,
// industry, member_type, slug など）も「将来追加予定の名前」で先に書いている。
//
// 値（"法人"/"個人" 等）は表示ラベル兼用のため日本語のまま残す。
// Phase 2 で DB 列に切り出すタイミングで英単語コード（corporate/individual 等）に
// 移行し、表示は別レイヤーでラベル化する。

export interface DashboardMember {
  id: string;
  slug: string;
  name: string;
  photo_url: string;
  role_title: string;
  job_title: string;
  headline: string;
  trust_score: number;
  recommendation_count: number;
  context_tags: string[];
  referrer_name: string;
  industry: string;
  member_type: "法人" | "個人";
}

export const dashboardMembers: DashboardMember[] = [
  {
    ...pick(members[0]),
    trust_score: 92,
    recommendation_count: 18,
    context_tags: ["接待・会食向き", "経営者同士の会食"],
    referrer_name: "創設メンバー",
    industry: "コンサル",
    member_type: "法人",
  },
  {
    ...pick(members[1]),
    trust_score: 85,
    recommendation_count: 12,
    context_tags: ["カジュアル", "一人で集中", "ビジネスに効く"],
    referrer_name: "田中 一郎",
    industry: "IT・テック",
    member_type: "法人",
  },
  {
    ...pick(members[2]),
    trust_score: 97,
    recommendation_count: 31,
    context_tags: ["接待・会食向き", "和食", "個室あり"],
    referrer_name: "田中 一郎",
    industry: "飲食",
    member_type: "個人",
  },
  {
    ...pick(members[3]),
    trust_score: 78,
    recommendation_count: 8,
    context_tags: ["接待・会食向き", "個室あり"],
    referrer_name: "渡辺 剛",
    industry: "不動産",
    member_type: "法人",
  },
  {
    ...pick(members[4]),
    trust_score: 81,
    recommendation_count: 14,
    context_tags: ["ヘルシー", "一人で集中", "読了後に語りたい一冊"],
    referrer_name: "山本 恵美",
    industry: "医療",
    member_type: "法人",
  },
  {
    ...pick(members[5]),
    trust_score: 88,
    recommendation_count: 22,
    context_tags: ["接待・会食向き", "ワインが充実"],
    referrer_name: "鈴木 健二",
    industry: "コンサル",
    member_type: "個人",
  },
  {
    id: "7",
    slug: "ogawa-risa",
    name: "小川 理沙",
    photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    role_title: "Creative Director",
    job_title: "デザイナー",
    headline: "空間とブランドで、想いをカタチに",
    trust_score: 74,
    recommendation_count: 9,
    context_tags: ["カジュアル", "一人で集中", "大人の趣味"],
    referrer_name: "佐藤 裕樹",
    industry: "クリエイティブ",
    member_type: "個人",
  },
  {
    id: "8",
    slug: "morita-shun",
    name: "森田 駿",
    photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
    role_title: "代表取締役",
    job_title: "人材紹介業",
    headline: "人と企業の最高の出会いを創る",
    trust_score: 83,
    recommendation_count: 15,
    context_tags: ["カジュアル", "大人数OK", "週末のアクティビティ"],
    referrer_name: "田中 一郎",
    industry: "経営者",
    member_type: "法人",
  },
  {
    id: "9",
    slug: "fujita-mai",
    name: "藤田 舞",
    photo_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face",
    role_title: "CEO",
    job_title: "Eコマース経営",
    headline: "ローカルの魅力を、世界に届ける",
    trust_score: 79,
    recommendation_count: 11,
    context_tags: ["カジュアル", "ヘルシー", "週末のアクティビティ"],
    referrer_name: "中村 明子",
    industry: "IT・テック",
    member_type: "個人",
  },
  {
    id: "10",
    slug: "honda-koji",
    name: "本田 浩二",
    photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    role_title: "オーナー",
    job_title: "飲食店グループ経営",
    headline: "食で街を元気にする",
    trust_score: 95,
    recommendation_count: 28,
    context_tags: ["接待・会食向き", "和食", "個室あり"],
    referrer_name: "山本 恵美",
    industry: "飲食",
    member_type: "法人",
  },
];

// mock-data.ts は camelCase（旧資産）のため、ここで snake_case にマッピングする。
// Phase 2 で Supabase select() に置き換わると、この pick() 自体が不要になる。
function pick(m: (typeof members)[number]) {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    photo_url: m.photoUrl,
    role_title: m.roleTitle,
    job_title: m.jobTitle,
    headline: m.headline,
  };
}

export const industryFilters = [
  "全員",
  "経営者",
  "IT・テック",
  "飲食",
  "不動産",
  "医療",
  "クリエイティブ",
  "コンサル",
];

export const communityStats = {
  member_count: 48,
  recommendation_count: 156,
  monthly_posts: 23,
};

// --- Profile page data ---

export interface Recommendation {
  id: string;
  restaurant_name: string;
  area: string;
  genre: string;
  story: string;
  context_tags: string[];
  posted_at: string;
}

export interface Endorsement {
  from_id: string;
  from_name: string;
  from_photo_url: string;
  tags: [string, string, string];
  comment: string;
}

export interface ProfileStory {
  origin: string;             // きっかけ
  turning: string;            // 転機
  now: string;                // 今
  passion: string;            // 好きなもの
  values: string;             // 大事にしていること（applicants では SQL 予約語回避で personal_values）
  core_values: [string, string, string]; // 大切にしていること（3つ）
  childhood: string;          // 学生の頃はどんな子供だった？
  looking_for: string;        // こんな人と繋がりたい
  endorsements: Endorsement[]; // 他者からの一言
}

export interface MemberProfile extends DashboardMember {
  story_origin: string;
  story_now: string;
  profile_story: ProfileStory;
  services_summary: string;
  referral_chain: string[];
  recommendations: Recommendation[];
}

const storyMap: Record<
  string,
  {
    story_origin: string;
    story_now: string;
    profile_story: ProfileStory;
    services_summary: string;
  }
> = {
  "1": {
    story_origin: members[0].storyOrigin,
    story_now: members[0].storyNow,
    services_summary: members[0].servicesSummary,
    profile_story: {
      origin: "新卒で入った会社が倒産寸前で、再建プロジェクトに飛び込んだのが原点。",
      turning: "30歳の時、クライアント企業の再建に成功。組織が変わる瞬間の熱量に取り憑かれて独立を決意。",
      now: "経営コンサルタントとして、中小企業の組織変革を支援しています。",
      passion: "週末の築地の朝市巡り。あと最近はサウナにハマってます。",
      values: "人の可能性を最後まで信じること。「もう無理」の先にいつもブレイクスルーがある。",
      core_values: [
        "約束を守ること。小さな信頼の積み重ねが全て。",
        "相手の可能性を最後まで信じ抜くこと。",
        "現場に足を運ぶこと。数字だけでは見えないものがある。",
      ],
      childhood: "野球少年。キャプテンを任されてから、チームをまとめることが好きになった。",
      looking_for: "業界問わず、組織づくりに本気で向き合っている経営者の方。",
      endorsements: [
        {
          from_id: "2",
          from_name: "佐藤 裕樹",
          from_photo_url: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face",
          tags: ["熱い", "信頼できる", "面倒見がいい"],
          comment: "本気で人に向き合う人。困った時に真っ先に相談したくなる存在です。",
        },
        {
          from_id: "3",
          from_name: "山本 恵美",
          from_photo_url: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
          tags: ["頼れる兄貴", "行動力", "グルメ"],
          comment: "お店選びのセンスが抜群。紹介してもらった人とは必ず良いご縁になります。",
        },
      ],
    },
  },
  "2": {
    story_origin: members[1].storyOrigin,
    story_now: members[1].storyNow,
    services_summary: members[1].servicesSummary,
    profile_story: {
      origin: "大学時代に作ったアプリがバズって、そのまま起業。",
      turning: "東京での成功に満足できず、地方のDXに可能性を感じて福岡に移住。",
      now: "地方自治体や中小企業のDX支援を行うIT企業を経営しています。",
      passion: "プログラミングと釣り。コードも魚も、粘った先に大物がかかる。",
      values: "テクノロジーは人を幸せにするためにある。効率化の先にある「ゆとり」を届けたい。",
      core_values: [
        "技術は手段。目的は人の幸せであること。",
        "地方にこそ、テクノロジーの恩恵を届けたい。",
        "コードの美しさにこだわること。美しいコードは壊れにくい。",
      ],
      childhood: "パソコンオタク。文化祭でゲームを作って売ってた。",
      looking_for: "地方でビジネスをしている方、DXに興味のある経営者の方。",
      endorsements: [
        {
          from_id: "1",
          from_name: "田中 一郎",
          from_photo_url: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
          tags: ["天才肌", "実行力", "謙虚"],
          comment: "技術力だけでなく、ビジネスの本質を理解している稀有なエンジニア経営者。",
        },
      ],
    },
  },
  "3": {
    story_origin: members[2].storyOrigin,
    story_now: members[2].storyNow,
    services_summary: members[2].servicesSummary,
    profile_story: {
      origin: "母の手料理が原点。食卓の幸せを広げたくて料理の道へ。",
      turning: "パリの三ツ星で修行中、日本の食材の素晴らしさに改めて気づいた。",
      now: "大阪・北新地で割烹を経営。地元の食材にこだわった和食を提供しています。",
      passion: "早朝の市場巡りと、器集め。料理は器で完成すると思っています。",
      values: "食を通じて人を笑顔にすること。一皿に想いを込める。",
      core_values: [
        "素材への敬意を忘れないこと。",
        "お客様の表情を見て、料理を仕上げること。",
        "季節を大切にすること。旬のものに勝る調味料はない。",
      ],
      childhood: "おばあちゃん子。台所に立って一緒に料理するのが日課だった。",
      looking_for: "食に情熱のある方、コラボイベントを一緒にやれる方。",
      endorsements: [
        {
          from_id: "1",
          from_name: "田中 一郎",
          from_photo_url: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
          tags: ["本物の料理人", "温かい", "情熱"],
          comment: "料理だけでなく、人柄が素晴らしい。お店に行くたびに元気をもらえる。",
        },
      ],
    },
  },
  "4": {
    story_origin: members[3].storyOrigin,
    story_now: members[3].storyNow,
    services_summary: members[3].servicesSummary,
    profile_story: {
      origin: "父の不動産会社に入社。従来のやり方に疑問を持ち始めた。",
      turning: "古いビルのリノベーションで街が変わるのを目の当たりにして、事業を転換。",
      now: "リノベーション特化の不動産デベロッパーとして、街に価値を生む開発をしています。",
      passion: "街歩きと建築巡り。古い建物のポテンシャルを見つけるのが好き。",
      values: "街に価値を生む開発。利益だけでなく、そこに暮らす人の豊かさを考える。",
      core_values: [
        "その街に暮らす人の目線で考えること。",
        "古いものの中にある価値を見逃さないこと。",
        "利益と社会貢献は両立できると信じること。",
      ],
      childhood: "LEGOに没頭してた。何かを作ることがずっと好き。",
      looking_for: "不動産に興味のある方、オフィス移転やリノベを検討中の方。",
      endorsements: [
        {
          from_id: "6",
          from_name: "渡辺 剛",
          from_photo_url: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
          tags: ["ビジョナリー", "誠実", "センスがいい"],
          comment: "数字だけでなく、街の未来を考えて開発する姿勢に共感しています。",
        },
      ],
    },
  },
  "5": {
    story_origin: members[4].storyOrigin,
    story_now: members[4].storyNow,
    services_summary: members[4].servicesSummary,
    profile_story: {
      origin: "勤務医時代、患者さんの生活習慣を変えることの難しさと大切さを痛感。",
      turning: "予防医療に特化したクリニックを開業。経営の面白さにも目覚める。",
      now: "クリニック経営と並行して、企業向け健康経営コンサルも手掛けています。",
      passion: "ヨガと読書。心と体の健康は経営の土台だと実感しています。",
      values: "治療より予防。一人ひとりの人生に寄り添う医療を目指しています。",
      core_values: [
        "治療より予防。病気になる前に手を差し伸べたい。",
        "エビデンスに基づいた判断を大切にすること。",
        "患者さんの人生全体を見て、寄り添うこと。",
      ],
      childhood: "生き物が好きな理科少女。カエルの観察日記を3年間続けた。",
      looking_for: "健康経営に関心のある経営者の方、ヘルスケア領域でコラボできる方。",
      endorsements: [
        {
          from_id: "1",
          from_name: "田中 一郎",
          from_photo_url: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
          tags: ["聡明", "芯が強い", "優しい"],
          comment: "健康経営セミナーで共演。エビデンスに基づいた話が説得力抜群です。",
        },
      ],
    },
  },
  "6": {
    story_origin: members[5].storyOrigin,
    story_now: members[5].storyNow,
    services_summary: members[5].servicesSummary,
    profile_story: {
      origin: "証券会社で機関投資家向けの営業を経験。数字の向こうにある人生に興味を持った。",
      turning: "リーマンショックを経て、個人の経営者に寄り添うアドバイザーとして独立。",
      now: "経営者の資産運用と事業承継を専門にサポートしています。",
      passion: "ワインと日本酒。銘柄の背景を知ると味が変わるのが面白い。",
      values: "数字の向こうにある人生を見ること。お金は手段であって目的ではない。",
      core_values: [
        "お金は手段。その先にある人生を一緒に考えること。",
        "リスクから目を背けず、正直に伝えること。",
        "長期的な信頼関係を最優先にすること。",
      ],
      childhood: "将棋部。先を読む習慣はここで身についた。",
      looking_for: "資産運用や事業承継を考えている経営者の方。",
      endorsements: [
        {
          from_id: "4",
          from_name: "鈴木 健二",
          from_photo_url: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face",
          tags: ["冷静", "頭が切れる", "頼りになる"],
          comment: "複雑な案件でも的確なアドバイスをくれる。ワインの話も面白い。",
        },
      ],
    },
  },
  "7": {
    story_origin: "美大卒業後、大手広告代理店でブランディングを経験。独立後はカフェやレストランの空間デザインを手掛けています。",
    story_now: "「食べる」だけでなく「過ごす」体験をデザインすることにこだわっています。空間が変われば、料理の味まで変わる。",
    services_summary: "ブランドデザイン / 店舗空間設計 / VI制作",
    profile_story: {
      origin: "美大時代にカフェでバイトしていて、空間が人の気持ちを変えることに気づいた。",
      turning: "大手広告代理店を辞めて独立。飲食店の空間デザインに絞ることを決意。",
      now: "カフェやレストランの空間デザインを専門に手掛けています。",
      passion: "インテリアショップ巡りとスケッチ。旅先では必ずカフェに入ります。",
      values: "空間は体験そのもの。居心地の良さは、細部の積み重ねでしか生まれない。",
      core_values: [
        "細部にこだわること。神は細部に宿る。",
        "使う人の気持ちを想像して設計すること。",
        "美しさと機能性は両立できると信じること。",
      ],
      childhood: "絵を描くのが好きで、部屋の模様替えばかりしてた。",
      looking_for: "店舗の新規出店やリブランディングを考えている方。",
      endorsements: [
        {
          from_id: "3",
          from_name: "山本 恵美",
          from_photo_url: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
          tags: ["センス抜群", "こだわり", "話しやすい"],
          comment: "うちの店の内装もお願いしました。空間が変わるとお客さんの表情も変わる。",
        },
      ],
    },
  },
  "8": {
    story_origin: "リクルートで法人営業を経験後、人材紹介会社を設立。経営者同士をつなぐことが一番の喜びです。",
    story_now: "人と人をつなぐ場として、食事の場が最も大切だと気づきました。良いお店を知っていることが、最高の営業ツールです。",
    services_summary: "エグゼクティブ人材紹介 / 経営者マッチング / 採用コンサルティング",
    profile_story: {
      origin: "リクルート時代、人の転職で人生が変わる瞬間を何度も見た。",
      turning: "「会社に合う人」でなく「人に合う会社」を見つけたいと思い独立。",
      now: "経営幹部の人材紹介と経営者同士のマッチングを行っています。",
      passion: "ワインと人脈づくり。良い出会いは良い食事から生まれると信じています。",
      values: "人と人を繋ぐことで、双方の人生が豊かになること。",
      core_values: [
        "紹介は責任。双方が幸せになる出会いだけを届けること。",
        "人の良いところを見つけて、言葉にすること。",
        "損得ではなく、ご縁で動くこと。",
      ],
      childhood: "クラスの仲裁役。人と人の間に立つのが得意だった。",
      looking_for: "経営幹部の採用を考えている方、良い人材を探している経営者の方。",
      endorsements: [
        {
          from_id: "1",
          from_name: "田中 一郎",
          from_photo_url: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
          tags: ["人脈の鬼", "気配り", "ムードメーカー"],
          comment: "森田さんに紹介された人で外れたことがない。人を見る目が本物。",
        },
      ],
    },
  },
  "9": {
    story_origin: "地方の特産品をECで全国に届ける事業を立ち上げました。生産者さんの想いを伝えることが使命です。",
    story_now: "生産者さんに会いに行くたびに、地元のお店で食事をするのが楽しみ。その土地の味が、その土地の人の温かさを教えてくれます。",
    services_summary: "EC事業運営 / 地方創生プロデュース / D2Cブランド構築",
    profile_story: {
      origin: "旅先で出会った農家さんの想いに感動して、届ける仕事をしようと決めた。",
      turning: "クラウドファンディングで初プロジェクトが大成功。地方創生の道へ。",
      now: "地方の特産品をECで全国に届ける事業を運営しています。",
      passion: "全国の生産者さんを訪ねること。その土地の食と人に出会う旅。",
      values: "つくる人の想いを、届ける人が伝える。食のストーリーを大切にしたい。",
      core_values: [
        "つくる人の想いを、そのまま届けること。",
        "現地に行くこと。画面越しでは伝わらないものがある。",
        "売れる仕組みより、伝わる仕組みをつくること。",
      ],
      childhood: "田舎育ちで、おじいちゃんの畑で遊んでた。土の匂いが好きだった。",
      looking_for: "地方の食材やプロダクトに興味のある方、ECやD2Cに関心のある方。",
      endorsements: [
        {
          from_id: "3",
          from_name: "山本 恵美",
          from_photo_url: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
          tags: ["情熱的", "行動力", "食への愛"],
          comment: "藤田さんが届けてくれる食材は、どれもストーリーがあって料理が楽しくなる。",
        },
      ],
    },
  },
  "10": {
    story_origin: "料理人として修行を積んだ後、30歳で独立。今は和食を中心に3店舗を経営しています。",
    story_now: "お店は「美味しい」だけでは足りない。来てくれた人の人生の一場面に寄り添える場所でありたいと思っています。",
    services_summary: "飲食店グループ経営 / メニュー開発 / 飲食店コンサルティング",
    profile_story: {
      origin: "高校時代に母が作ってくれた弁当がきっかけ。料理で人を幸せにしたいと思った。",
      turning: "修行先の親方に「お前は経営者になれ」と言われ、30歳で独立。",
      now: "和食を中心に3店舗を経営。後進の育成にも力を入れています。",
      passion: "食材の産地巡りと器探し。料理は五感で楽しむもの。",
      values: "お店は料理だけじゃない。来てくれた人の大切な時間に寄り添う場所でありたい。",
      core_values: [
        "料理は愛情。手を抜いた瞬間、味に出る。",
        "スタッフを家族のように大切にすること。",
        "お客様の「大切な一日」に寄り添う場所であること。",
      ],
      childhood: "母の手伝いで台所に立つのが日課。給食のおかわりじゃんけんは負けなし。",
      looking_for: "飲食業に興味のある方、新メニューやコラボを一緒に考えられる方。",
      endorsements: [
        {
          from_id: "8",
          from_name: "森田 駿",
          from_photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
          tags: ["職人気質", "人情", "本物"],
          comment: "料理への情熱はもちろん、スタッフへの愛情が深い。一緒にいると元気になれる人。",
        },
      ],
    },
  },
};

const recommendationsMap: Record<string, Recommendation[]> = {
  "1": [
    { id: "r1", restaurant_name: "鮨 まつもと", area: "大阪・北新地", genre: "寿司", story: "大切な商談の前日に訪れた一軒。大将の丁寧な仕事に心が落ち着き、翌日の商談は見事に成功。以来、勝負の前夜はここと決めています。", context_tags: ["接待・会食向き", "個室あり"], posted_at: "2025-12-10" },
    { id: "r2", restaurant_name: "リストランテ ルーチェ", area: "大阪・西天満", genre: "イタリアン", story: "クライアントとの会食で何度も使わせてもらっているお店。シェフの温かい人柄と、落ち着いた雰囲気が商談を後押ししてくれます。", context_tags: ["接待・会食向き", "経営者同士の会食"], posted_at: "2025-11-22" },
  ],
  "2": [
    { id: "r3", restaurant_name: "珈琲 蘭館", area: "大阪・本町", genre: "カフェ", story: "コードを書く手が止まった時、ここのカウンターに座ると不思議とアイデアが降りてくる。マスターの淹れるコーヒーは思考を整理してくれる。", context_tags: ["一人で集中", "カジュアル"], posted_at: "2025-12-05" },
  ],
  "3": [
    { id: "r4", restaurant_name: "割烹 田中", area: "大阪・北新地", genre: "和食", story: "季節の食材を使った料理は、食べるたびに日本の四季を感じさせてくれます。大将との会話も楽しみのひとつ。", context_tags: ["接待・会食向き", "和食"], posted_at: "2025-12-15" },
    { id: "r5", restaurant_name: "ビストロ マルシェ", area: "大阪・中之島", genre: "フレンチ", story: "気取らないフレンチが最高。シェフが市場で仕入れたその日の食材で作る料理は、毎回違う感動がある。", context_tags: ["カジュアル", "経営者同士の会食"], posted_at: "2025-11-30" },
    { id: "r6", restaurant_name: "蕎麦 よしむら", area: "京都・祇園", genre: "蕎麦", story: "修行先の大将に連れて行ってもらったお店。蕎麦の香りと、静かな空間が心を洗ってくれます。", context_tags: ["一人で集中", "和食"], posted_at: "2025-10-18" },
  ],
  "4": [
    { id: "r7", restaurant_name: "焼肉 万両", area: "大阪・南森町", genre: "焼肉", story: "不動産の契約が成立した日、お客様をお連れする定番のお店。個室の落ち着いた空間が、信頼関係をさらに深めてくれます。", context_tags: ["接待・会食向き", "個室あり"], posted_at: "2025-11-08" },
  ],
  "5": [
    { id: "r8", restaurant_name: "自然食レストラン みどり", area: "大阪・中崎町", genre: "自然食", story: "患者さんに食事指導をする立場として、まず自分が本物の食を知る必要がある。ここの料理は、体が喜ぶのがわかります。", context_tags: ["ヘルシー", "一人で集中"], posted_at: "2025-12-01" },
  ],
  "6": [
    { id: "r9", restaurant_name: "ワインバー CAVA", area: "大阪・心斎橋", genre: "ワインバー", story: "100種類以上のワインリストから、ソムリエが商談相手の好みに合わせてセレクトしてくれる。ここでの食事が、何度も取引につながった。", context_tags: ["接待・会食向き", "ワインが充実"], posted_at: "2025-12-08" },
  ],
  "7": [
    { id: "r10", restaurant_name: "カフェ LIGHT", area: "大阪・靱公園", genre: "カフェ", story: "内装デザインの参考にもなる、美しい空間。光の入り方、家具の配置、すべてが計算されていて、でも居心地がいい。仕事の合間に立ち寄りたくなる。", context_tags: ["一人で集中", "カジュアル"], posted_at: "2025-11-25" },
  ],
  "8": [
    { id: "r11", restaurant_name: "炭火焼鳥 やまもと", area: "大阪・福島", genre: "焼鳥", story: "候補者との面談後、ここで一杯やりながら本音を引き出す。カウンター席の距離感が、人と人の距離を縮めてくれる。", context_tags: ["カジュアル", "経営者同士の会食"], posted_at: "2025-12-12" },
  ],
  "9": [
    { id: "r12", restaurant_name: "農家レストラン みのり", area: "長野・安曇野", genre: "和食", story: "取引先の農家さんに連れて行ってもらった一軒。採れたての野菜がこんなに美味しいのかと衝撃を受けました。子どもたちも大喜び。", context_tags: ["家族向き", "ヘルシー"], posted_at: "2025-11-15" },
  ],
  "10": [
    { id: "r13", restaurant_name: "天ぷら 大阪あら川", area: "大阪・本町", genre: "天ぷら", story: "同業として尊敬する大将の仕事。さつまいもの天ぷらを食べた時、料理とは素材への敬意だと改めて教わりました。", context_tags: ["接待・会食向き", "和食"], posted_at: "2025-12-03" },
    { id: "r14", restaurant_name: "日本料理 かが万", area: "大阪・北浜", genre: "日本料理", story: "海外のゲストをお連れすると必ず感動される。日本料理の可能性を見せてくれるお店です。", context_tags: ["接待・会食向き", "個室あり"], posted_at: "2025-10-28" },
  ],
};

const referralChainMap: Record<string, string[]> = {
  "1": ["創設メンバー"],
  "2": ["創設メンバー", "田中 一郎"],
  "3": ["創設メンバー", "田中 一郎"],
  "4": ["創設メンバー", "田中 一郎", "渡辺 剛"],
  "5": ["創設メンバー", "田中 一郎", "山本 恵美"],
  "6": ["創設メンバー", "田中 一郎", "渡辺 剛", "鈴木 健二"],
  "7": ["創設メンバー", "田中 一郎", "佐藤 裕樹"],
  "8": ["創設メンバー", "田中 一郎"],
  "9": ["創設メンバー", "田中 一郎", "山本 恵美", "中村 明子"],
  "10": ["創設メンバー", "田中 一郎", "山本 恵美"],
};

// --- Referral tree data ---

export interface TreeNode {
  id: string;
  name: string;
  photo_url: string;
  role_title: string;
  trust_score: number;
  children: TreeNode[];
}

function dm(id: string) {
  const m = dashboardMembers.find((x) => x.id === id)!;
  return {
    id: m.id,
    name: m.name,
    photo_url: m.photo_url,
    role_title: m.role_title,
    trust_score: m.trust_score,
  };
}

export const referralTree: TreeNode = {
  id: "0",
  name: "創設メンバー",
  photo_url: "",
  role_title: "ガイアの酒場",
  trust_score: 100,
  children: [
    {
      ...dm("1"),
      children: [
        {
          ...dm("2"),
          children: [
            { ...dm("7"), children: [] },
          ],
        },
        {
          ...dm("3"),
          children: [
            {
              ...dm("5"),
              children: [
                { ...dm("9"), children: [] },
              ],
            },
            { ...dm("10"), children: [] },
          ],
        },
        { ...dm("8"), children: [] },
        {
          ...dm("6"),
          children: [
            { ...dm("4"), children: [] },
          ],
        },
      ],
    },
  ],
};

// --- Discover page data ---

export interface DiscoverRecommendation extends Recommendation {
  member_id: string;
  member_name: string;
  member_photo_url: string;
  member_trust_score: number;
}

export function getAllRecommendations(): DiscoverRecommendation[] {
  return dashboardMembers.flatMap((m) => {
    const recs = recommendationsMap[m.id] || [];
    return recs.map((r) => ({
      ...r,
      member_id: m.id,
      member_name: m.name,
      member_photo_url: m.photo_url,
      member_trust_score: m.trust_score,
    }));
  });
}

export function getMemberProfile(id: string): MemberProfile | undefined {
  const member = dashboardMembers.find((m) => m.id === id);
  if (!member) return undefined;

  const story = storyMap[id] || {
    story_origin: "",
    story_now: "",
    services_summary: "",
    profile_story: {
      origin: "",
      turning: "",
      now: "",
      passion: "",
      values: "",
      core_values: ["", "", ""] as [string, string, string],
      childhood: "",
      looking_for: "",
      endorsements: [],
    },
  };

  return {
    ...member,
    ...story,
    referral_chain: referralChainMap[id] || [],
    recommendations: recommendationsMap[id] || [],
  };
}
