// Core OS 各セクションの「書き方ガイド＋例文」コンテンツ。
//
// 目的: 会員が独力で Core OS を埋められるようにする（オンボUX = スケールの生命線）。
//   - what  : このセクションは一言で何か（ページ上部のスリムな意図バナーに使う）
//   - payoff: 埋めると右腕AIがどう変わるか（即報酬の伏線＝入力の動機）
//   - fields: 各入力項目（DBのフィールド名をキーに）のヒントと例文
//             → 各フォーム/ダイアログのラベル直下に <FieldHint> でインライン表示する。
//
// 例文は特定個人でなく「経営者一般」を想定した汎用サンプル。会員はこれを下敷きに自分の言葉へ差し替える。

export interface FieldGuide {
  /** 何を書くか（短く） */
  hint: string;
  /** 良い例文 */
  example: string;
}

export interface SectionGuideContent {
  /** このセクションは一言で何か */
  what: string;
  /** 埋めると右腕AIがどう変わるか（即報酬の伏線） */
  payoff: string;
  /** DBフィールド名 → ヒントと例文 */
  fields: Record<string, FieldGuide>;
}

export const SECTION_GUIDES = {
  mission: {
    what: "あなたが何のために事業を続けるのか。右腕AIが判断に迷ったときに立ち返る、いちばん上の根拠です。",
    payoff:
      "ここが埋まると、右腕AIは「提案を受けるか・断るか」「どれを優先するか」を“あなたらしく”判断できるようになります。",
    fields: {
      mission: {
        hint: "「誰の」「何を」「どう変えるのか」を一文で。きれいな言葉より、自分の本音で。",
        example:
          "地域の中小企業が、安心して長く相談できる相手をつくる。",
      },
      values_tags: {
        hint: "判断で大事にしている言葉を単語で。3〜5個あれば十分。",
        example: "誠実 / 長期 / 関係性 / スピード",
      },
      target_world: {
        hint: "この事業が広がった先、世の中がどうなっていてほしいか。",
        example:
          "紹介と信頼で仕事が回り、売り込みに消耗する経営者がいなくなる世界。",
      },
      not_doing: {
        hint: "一見いい話でも、自分はやらないと決めていること。線引きが“らしさ”になる。",
        example:
          "単発の値引き案件は受けない。紹介の生まれない取引は深追いしない。",
      },
      value_to_customer: {
        hint: "他社ではなくあなたから受け取る、本質的な価値。",
        example:
          "単発の作業代行ではなく、相手の状況を踏まえた提案まで踏み込むこと。",
      },
    },
  },

  "three-year-plan": {
    what: "3年後にどうなっていたいか。右腕AIが「今これは中期目標に効くか」を測る物差しです。",
    payoff:
      "ここが埋まると、右腕AIは目先の作業と将来への投資を切り分けて助言できるようになります。",
    fields: {
      plan_name: {
        hint: "この計画の呼び名。年を入れると分かりやすい。",
        example: "2029年までの成長計画",
      },
      ideal_state_in_3y: {
        hint: "数字と状態の両方で。「いくら」だけでなく「どう回っているか」。",
        example:
          "売上が安定し、自分が現場に出なくても新規の相談が入る仕組みができている。",
      },
      business_pillars: {
        hint: "収益を生む事業を単語で。複数あれば並べる。",
        example: "受託開発 / 自社サービス / セミナー・コミュニティ",
      },
      revenue_model: {
        hint: "どこからどう稼ぐか。ストック／フローの比率なども。",
        example: "月額のストック収益を全体の6割に。単発受託は縮小する。",
      },
      assets_to_build: {
        hint: "3年かけて積み上げたい、お金以外の資産。",
        example: "継続的に相談される顧客基盤 / 蓄積したノウハウ / 発信の蓄積",
      },
      work_style_to_quit: {
        hint: "3年後にはしていたくない働き方・状態。",
        example: "自分が現場に出ないと回らない働き方をやめる。",
      },
    },
  },

  "annual-kpi": {
    what: "今年の具体的な数値目標。右腕AIが「今これは目標に効くか」を判断する基準になります。",
    payoff:
      "ここが埋まると、右腕AIは日々の行動提案を“今年の数字”に紐づけて出せるようになります。",
    fields: {
      fiscal_year: {
        hint: "対象の年。西暦4桁で。",
        example: "2026",
      },
      title: {
        hint: "追いかける指標。売上だけでなく、その手前の行動指標も有効。",
        example: "月間経常収益（MRR） / 新規紹介件数",
      },
      target_value: {
        hint: "目標の数字だけ。単位は隣の欄へ。",
        example: "300",
      },
      unit: {
        hint: "数字の単位。",
        example: "万円 / 件 / 社",
      },
    },
  },

  "decision-principles": {
    what: "あなたが意思決定で従っているルール。右腕AIの判断の“芯”になる部分です。",
    payoff:
      "ここが埋まるほど、右腕AIの判断はあなた本人の感覚に近づきます。日々の判断を残すと精度がさらに上がります。",
    fields: {
      name: {
        hint: "ルールを一言で。覚えやすい言い回しに。",
        example: "迷ったら、長く続く関係の方を選ぶ。",
      },
      category: {
        hint: "どの場面のルールか。",
        example: "営業 / 採用 / 投資",
      },
      rule: {
        hint: "具体的にどう動くか。",
        example: "目先の利益より、3年後も付き合える相手かで決める。",
      },
      reason: {
        hint: "なぜそうするのか。理由があると例外の判断もできる。",
        example: "単発の利益より、紹介の連鎖の方が事業を伸ばすから。",
      },
      priority: {
        hint: "高・中・低のどれか。",
        example: "高",
      },
      exception: {
        hint: "このルールを破ってよい条件。",
        example: "キャッシュが残り3ヶ月を切ったら、短期の利益を優先してよい。",
      },
      related_values: {
        hint: "ミッションの価値観とつながる言葉。",
        example: "長期 / 関係性",
      },
    },
  },

  "tone-rules": {
    what: "右腕AIがメッセージを書くときの話し方。あなたらしさがいちばん出る部分です。",
    payoff:
      "ここが埋まると、右腕AIの返信が“あなたが書いたみたい”になり、そのまま送れる確率が上がります。",
    fields: {
      name: {
        hint: "この口調設定の呼び名。",
        example: "社長の標準口調 / 商談時の口調",
      },
      base_tone: {
        hint: "どんな雰囲気で話すか。単語でいくつか。",
        example: "落ち着いた / 誠実 / 押しつけない",
      },
      politeness: {
        hint: "相手によって変えるなら、その使い分けも。",
        example: "初対面は敬語、馴染みの相手はややくだけて。",
      },
      ng_expressions: {
        hint: "使ってほしくない言葉・言い回し。",
        example: "“絶対”“100%”などの断定の誇張。煽る表現。",
      },
      reply_length: {
        hint: "理想の長さ。",
        example: "3〜5文。長文は避ける。",
      },
      confirm_before_proposing: {
        hint: "提案の前にどうふるまうか。",
        example: "提案の前に、相手の状況を一言確認する。",
      },
      no_pushy_rule: {
        hint: "しつこくならないための線引き。",
        example: "2回断られたら追わない。",
      },
    },
  },

  "ng-rules": {
    what: "右腕AIに任せず、必ずあなたに回すべき領域。事故を防ぐための線引きです。",
    payoff:
      "ここが埋まると、右腕AIは“勝手に踏み込んではいけない領域”で必ず立ち止まり、あなたに確認するようになります。",
    fields: {
      area_name: {
        hint: "AIに最終判断させない領域を一言で。",
        example: "金額・契約条件の最終確定",
      },
      area: {
        hint: "具体的に何が含まれるか。",
        example: "見積金額 / 値引き / 契約書の文言",
      },
      reason_not_for_ai: {
        hint: "なぜ人が判断すべきか。",
        example: "金額は関係性と状況で変わり、誤ると信頼を損なうから。",
      },
      escalation_target: {
        hint: "誰に回すか。",
        example: "自分（社長）に確認",
      },
      confirmation_procedure: {
        hint: "どこまでAIがやってよいか。",
        example: "ドラフトまでは作ってよいが、送信前に必ず本人が承認する。",
      },
    },
  },

  faq: {
    what: "よく聞かれる質問への模範回答。右腕AIが迷わず即答できるようになります。",
    payoff:
      "ここが埋まると、右腕AIは定番の問い合わせに“あなたの答え”でその場で返せるようになります。",
    fields: {
      question: {
        hint: "お客様からよく来る質問をそのまま。",
        example: "料金はいくらですか？",
      },
      base_answer: {
        hint: "いつも答えている内容。",
        example: "プランにより月額◯円〜です。まずは無料相談で要件を伺います。",
      },
      supplement: {
        hint: "状況によって付け足す情報。",
        example: "初期費用は要件次第。継続割引もあります。",
      },
      caveat: {
        hint: "誤解されやすい点・気をつけること。",
        example: "大型のカスタム開発は別見積もり。金額の確定は本人確認後。",
      },
      requires_final_check: {
        hint: "金額や約束を含む質問は、AIに即答させず確認を挟むためにONに。",
        example: "（金額・納期・契約に関わる質問はON）",
      },
    },
  },
} satisfies Record<string, SectionGuideContent>;

export type SectionKey = keyof typeof SECTION_GUIDES;

/** セクション×フィールド名から、その項目のヒントと例文を引く。無ければ undefined。 */
export function getFieldGuide(
  section: SectionKey,
  field: string,
): FieldGuide | undefined {
  const fields = SECTION_GUIDES[section]?.fields as
    | Record<string, FieldGuide>
    | undefined;
  return fields?.[field];
}
