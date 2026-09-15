import { Member, Tag } from "./types";

export const tags: Tag[] = [
  { id: "1", name: "IT・テクノロジー", type: "industry" },
  { id: "2", name: "飲食・フード", type: "industry" },
  { id: "3", name: "不動産", type: "industry" },
  { id: "4", name: "コンサルティング", type: "industry" },
  { id: "5", name: "医療・ヘルスケア", type: "industry" },
  { id: "6", name: "東京", type: "region" },
  { id: "7", name: "大阪", type: "region" },
  { id: "8", name: "福岡", type: "region" },
  { id: "9", name: "組織づくり", type: "challenge" },
  { id: "10", name: "事業承継", type: "challenge" },
  { id: "11", name: "新規事業", type: "challenge" },
  { id: "12", name: "マーケティング", type: "strength" },
  { id: "13", name: "ファイナンス", type: "strength" },
  { id: "14", name: "人材育成", type: "strength" },
];

export const members: Member[] = [
  {
    id: "1",
    slug: "tanaka-ichiro",
    name: "田中 一郎",
    nameFurigana: "たなか いちろう",
    nickname: "いっちー",
    memberNumber: "001",
    photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    genre: "コンサル/研修/講師",
    headline: "人の可能性を信じ、組織を変える",
    roleTitle: "代表取締役",
    jobTitle: "経営コンサルタント",
    location: "東京\n大阪",
    storyOrigin: "大手商社で10年間、海外事業の立ち上げに携わってきました。数字を追いかける日々の中で、いつしか「人」を見失っていた自分に気づいたのは、部下が突然退職を申し出た時でした。",
    storyTurningPoint: "その部下の「田中さんは、僕のことを駒としか見ていなかった」という言葉が、今も胸に刺さっています。そこから、組織とは何か、リーダーシップとは何かを根本から問い直す旅が始まりました。",
    storyNow: "今は「人が育つ組織」をテーマに、中小企業の経営支援をしています。売上よりも先に、まず人を見る。その姿勢が、結果として事業成長につながることを、日々実感しています。",
    storyFuture: "このサークルで出会う経営者の皆さんと、「人を大切にする経営」の輪を広げていきたい。そして、働く人が幸せになれる会社を、日本中に増やしていきたいと思っています。",
    servicesSummary: "組織開発コンサルティング / 経営者向けコーチング / リーダーシップ研修",
    wantToConnectWith: "組織づくりに悩んでいる中小企業の経営者、人を大切にする経営に本気で取り組みたい方、異業種で人材育成に携わっている方と学び合いたいです。",
    favorites: "坂本龍馬の本、朝の散歩、コーヒーを丁寧に淹れる時間",
    schoolDaysSelf: "サッカー部で主将。目立つより、チームメイトの相談役になるタイプでした。",
    values: "『人が育つ組織』は、売上より先に人を見ることから始まる。",
    statusMessage: "今月は人材育成の話を聞きたい",
    tags: [tags[3], tags[5], tags[8], tags[13]],
    status: "published",
    allowDirectContact: true,
    contactLinks: {
      site: "https://example.com",
      line: "https://line.me/example",
    },
    contactLinksVisibility: { site: true, line: false },
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
  {
    id: "2",
    slug: "sato-yuki",
    name: "佐藤 裕樹",
    nameFurigana: "さとう ゆうき",
    nickname: "ゆうき",
    memberNumber: "002",
    photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face",
    genre: "AI/IT/SE",
    headline: "テクノロジーで、地方の可能性を解き放つ",
    roleTitle: "CEO",
    jobTitle: "IT起業家",
    location: "福岡\n東京",
    storyOrigin: "福岡の小さな町で育ちました。東京の大学を出て、そのまま都内のIT企業に就職。気づけば故郷のことなど忘れて、ただがむしゃらに働いていました。",
    storyTurningPoint: "父が倒れたという連絡を受け、久しぶりに帰省した時。シャッター商店街になった地元を見て、胸が締め付けられました。「自分の持っているスキルで、何かできないか」。その思いが、起業のきっかけです。",
    storyNow: "地方企業のDX支援を専門にしています。最新技術を導入することが目的ではなく、その土地の人々の暮らしが少しでも良くなること。それだけを考えて、日々向き合っています。",
    storyFuture: "地方には、まだまだ眠っている価値がたくさんあります。テクノロジーの力で、それらを世界に届けたい。そして、地方で働くことが当たり前の選択肢になる未来を作りたいです。",
    servicesSummary: "地方企業向けDXコンサルティング / SaaS開発 / IT人材育成",
    wantToConnectWith: "地方で事業をされている経営者、地域課題にテクノロジーで取り組みたい方、エンジニア教育に関心のある方とつながりたいです。",
    currentHobby: "休日は古民家カフェ巡り。地方の空気に触れることがエネルギー源。",
    values: "『田舎に帰っても、選択肢があること』を次の世代に残したい。",
    statusMessage: "九州・四国の経営者と話したい",
    tags: [tags[0], tags[7], tags[10], tags[11]],
    status: "published",
    allowDirectContact: true,
    contactLinks: {
      site: "https://example.com",
    },
    contactLinksVisibility: { site: true },
    createdAt: "2024-02-10",
    updatedAt: "2024-02-10",
  },
  {
    id: "3",
    slug: "yamamoto-emi",
    name: "山本 恵美",
    nameFurigana: "やまもと えみ",
    nickname: "えみさん",
    memberNumber: "003",
    photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
    genre: "飲食/BAR/カフェ",
    headline: "食を通じて、人と人をつなぐ",
    roleTitle: "オーナーシェフ",
    jobTitle: "飲食店経営",
    location: "大阪",
    storyOrigin: "料理人として20年、様々なレストランで腕を磨いてきました。しかし、いくら美味しい料理を作っても、それだけでは何かが足りない。その「何か」を探し続けていました。",
    storyTurningPoint: "コロナ禍で店を閉めざるを得なくなった時、常連のお客様から届いた手紙。「あなたの店は、私たちの居場所でした」。その言葉で、自分が本当に提供していたものに気づきました。",
    storyNow: "今は小さな店を営みながら、地域のコミュニティスペースとしても開放しています。料理教室や異業種交流会など、食を通じた「つながり」を生み出す場作りに力を入れています。",
    storyFuture: "食は、人を幸せにする力を持っています。この場所から、新しいビジネスやプロジェクトが生まれ、地域全体が活性化していく。そんな未来を描いています。",
    servicesSummary: "レストラン経営 / ケータリング / 食を通じたチームビルディング",
    wantToConnectWith: "食を通じて地域貢献したい方、コミュニティ作りに関心のある経営者、一次産業（農家・漁師）の方と食卓でつながれたら嬉しいです。",
    favorites: "器との出会い、漁港の朝市、手書きの手紙",
    values: "料理は、その時その場でしか味わえない一期一会。",
    statusMessage: "貸切でのチームビルディング相談歓迎",
    tags: [tags[1], tags[6], tags[8], tags[13]],
    status: "published",
    allowDirectContact: false,
    contactLinks: {},
    createdAt: "2024-03-05",
    updatedAt: "2024-03-05",
  },
  {
    id: "4",
    slug: "suzuki-kenji",
    name: "鈴木 健二",
    nameFurigana: "すずき けんじ",
    nickname: "ケンさん",
    memberNumber: "004",
    photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face",
    genre: "不動産/住宅関連",
    headline: "不動産で、人生のステージを創る",
    roleTitle: "代表取締役社長",
    jobTitle: "不動産デベロッパー",
    location: "東京",
    storyOrigin: "父から引き継いだ小さな不動産会社。最初は正直、やりたい仕事ではありませんでした。建物を売る、ただそれだけの仕事だと思っていたからです。",
    storyTurningPoint: "ある日、お客様から「この家のおかげで、家族の絆が深まりました」と言われた時。不動産は「箱」を売るのではなく、「人生のステージ」を創る仕事なのだと気づきました。",
    storyNow: "今は地域密着型の不動産開発に注力しています。その土地の歴史や文化を大切にしながら、住む人・働く人が幸せになれる空間づくりを心がけています。",
    storyFuture: "まちづくりを通じて、地域の価値を高めていきたい。そして、「ここに住んでよかった」「ここで働けてよかった」と思える場所を、もっと増やしていきたいです。",
    servicesSummary: "不動産開発 / リノベーション / まちづくりコンサルティング",
    wantToConnectWith: "地域活性化に取り組む方、建築・デザインに関わるクリエイター、自社オフィスや店舗の拠点作りで悩んでいる経営者と話したいです。",
    schoolDaysSelf: "内気で、建物や街の写真を撮るのが趣味でした。今の仕事の原点。",
    currentHobby: "地方の古い街並みを歩いて写真に収めること。",
    tags: [tags[2], tags[5], tags[9], tags[12]],
    status: "published",
    allowDirectContact: true,
    contactLinks: {
      site: "https://example.com",
      sns: "https://twitter.com/example",
    },
    contactLinksVisibility: { site: true, sns: true },
    createdAt: "2024-03-20",
    updatedAt: "2024-03-20",
  },
  {
    id: "5",
    slug: "nakamura-akiko",
    name: "中村 明子",
    nameFurigana: "なかむら あきこ",
    nickname: "あきこ先生",
    memberNumber: "005",
    photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face",
    genre: "医療",
    headline: "予防医療で、健康寿命を延ばす",
    roleTitle: "院長",
    jobTitle: "医師・クリニック経営",
    location: "東京",
    storyOrigin: "大学病院で救急医療に携わっていました。毎日のように重症患者を診る中で、「なぜもっと早く来てくれなかったのか」と悔しい思いを何度もしました。",
    storyTurningPoint: "ある患者さんが、定期検診を受けていれば助かったはずの病気で亡くなった時。「治す医療」から「防ぐ医療」へ。自分の使命を見つけた瞬間でした。",
    storyNow: "予防医療に特化したクリニックを開業し、企業の健康経営支援も行っています。病気になってからではなく、健康なうちにできることを、一人でも多くの人に伝えたい。",
    storyFuture: "日本の健康寿命を延ばすことが、私のライフワークです。経営者の皆さんと連携して、働く人が健康でいられる社会を作っていきたいと思っています。",
    servicesSummary: "予防医療クリニック運営 / 企業健康経営コンサルティング / ヘルスケア講演",
    wantToConnectWith: "健康経営に本気で取り組みたい経営者、医療・介護・フィットネス業界の方、予防の大切さを発信している方とつながりたいです。",
    currentHobby: "週1の登山。患者さんへの『運動のすすめ』は自分の実体験から。",
    values: "『治す医療』より『防ぐ医療』で、健康寿命そのものを延ばしたい。",
    statusMessage: "健康経営の事例ヒアリング募集中",
    tags: [tags[4], tags[5], tags[10], tags[13]],
    status: "published",
    allowDirectContact: true,
    contactLinks: {
      site: "https://example.com",
    },
    contactLinksVisibility: { site: true },
    createdAt: "2024-04-01",
    updatedAt: "2024-04-01",
  },
  {
    id: "6",
    slug: "watanabe-takeshi",
    name: "渡辺 剛",
    nameFurigana: "わたなべ たけし",
    nickname: "たけしさん",
    memberNumber: "006",
    photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
    genre: "金融/生命保険/投資",
    headline: "お金の不安をなくし、挑戦を支える",
    roleTitle: "代表パートナー",
    jobTitle: "ファイナンシャルアドバイザー",
    location: "東京\n大阪",
    storyOrigin: "証券会社で富裕層向けの資産運用を担当していました。数字を追いかけ、手数料を稼ぐ日々。心のどこかで「これは誰のための仕事なのか」と疑問を感じていました。",
    storyTurningPoint: "独立を決意したのは、親しい友人が資金繰りで会社を畳んだ時。「もっと早く相談してくれれば…」。お金の知識で人を救える、そう確信しました。",
    storyNow: "中小企業経営者に特化した財務コンサルティングを行っています。資金調達、事業承継、個人資産との最適化。経営者が本業に集中できるよう、お金の面から支えています。",
    storyFuture: "お金の不安がなくなれば、もっと大胆に挑戦できる。そんな経営者を一人でも多く増やし、日本経済を底から元気にしていきたいです。",
    servicesSummary: "財務コンサルティング / 事業承継支援 / 資産運用アドバイス",
    wantToConnectWith: "資金繰りや事業承継で悩んでいる中小企業経営者、挑戦したいのに一歩踏み出せない方、税理士・社労士など士業の方と連携したいです。",
    favorites: "ジャズ、万年筆、囲碁",
    values: "お金は目的ではなく、挑戦するための道具。",
    statusMessage: "事業承継の相談、初回無料です",
    tags: [tags[3], tags[6], tags[9], tags[12]],
    status: "published",
    allowDirectContact: true,
    contactLinks: {
      site: "https://example.com",
      line: "https://line.me/example",
    },
    contactLinksVisibility: { site: true, line: true },
    createdAt: "2024-04-15",
    updatedAt: "2024-04-15",
  },
];

export function getPublishedMembers(): Member[] {
  return members.filter((m) => m.status === "published");
}

export function getMemberBySlug(slug: string): Member | undefined {
  return members.find((m) => m.slug === slug && m.status === "published");
}

export function getMemberById(id: string): Member | undefined {
  return members.find((m) => m.id === id);
}

export function searchMembers(
  query: string,
  selectedTags: string[]
): Member[] {
  const published = getPublishedMembers();

  return published.filter((member) => {
    // 検索クエリでフィルタ
    const matchesQuery =
      !query ||
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.jobTitle.toLowerCase().includes(query.toLowerCase()) ||
      member.roleTitle.toLowerCase().includes(query.toLowerCase()) ||
      member.headline.toLowerCase().includes(query.toLowerCase()) ||
      member.servicesSummary.toLowerCase().includes(query.toLowerCase());

    // タグでフィルタ
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tagId) =>
        member.tags.some((tag) => tag.id === tagId)
      );

    return matchesQuery && matchesTags;
  });
}
