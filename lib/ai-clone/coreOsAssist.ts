// Core OS「AIと対話して下書き」の設定。
// 各セクションごとに「会員に聞く数問の質問」と「AIが埋める出力フィールド」を定義する。
// クライアント（CoreOsAssistDialog）と API（/api/clone/coreos-assist）の両方から参照。
// ※ bracket パス([slug])を避けるため lib 配下に置き、SectionKey 等の型には依存しない。

export interface AssistQuestion {
  /** answers のキー */
  key: string;
  /** 質問文 */
  label: string;
  /** 入力欄プレースホルダ */
  placeholder: string;
}

export interface AssistFieldSpec {
  /** フォームのフィールド名（DBフィールド名に一致） */
  key: string;
  /** AIが何を埋めるかの説明（プロンプト用） */
  desc: string;
}

export interface AssistConfig {
  /** ダイアログ見出し */
  title: string;
  /** 会員に聞く数問 */
  questions: AssistQuestion[];
  /** AIが生成する出力フィールド */
  fields: AssistFieldSpec[];
}

export const CORE_OS_ASSIST = {
  mission: {
    title: "ミッションをAIと作る",
    questions: [
      {
        key: "business",
        label: "どんな事業をしていますか？（誰に何を提供しているか）",
        placeholder: "例：中小企業向けに経理代行をしている",
      },
      {
        key: "why",
        label: "なぜその事業を続けているのですか？（想い・きっかけ）",
        placeholder: "例：経理で消耗する社長を何人も見てきたから",
      },
      {
        key: "values",
        label: "仕事で大事にしている価値観は？",
        placeholder: "例：誠実さ、長く付き合うこと、スピード",
      },
    ],
    fields: [
      { key: "mission", desc: "ミッション。誰の何をどう変えるかを一文で。" },
      { key: "values_tags", desc: "価値観。単語をカンマ区切りで3〜5個。" },
      { key: "target_world", desc: "目指す世界。事業が広がった先の理想を一文で。" },
      { key: "not_doing", desc: "やらないこと。一見良くてもやらないと決めること。" },
      {
        key: "value_to_customer",
        desc: "お客様に届けたい本質的な価値を一文で。",
      },
    ],
  },
  "three-year-plan": {
    title: "3年計画をAIと作る",
    questions: [
      {
        key: "ideal",
        label: "3年後、どうなっていたいですか？（売上・働き方・状態）",
        placeholder: "例：売上が安定し、自分が現場に出なくても回っている",
      },
      {
        key: "pillars",
        label: "今の事業の柱と、これから増やしたいものは？",
        placeholder: "例：今は経理代行。これからコンサルも増やしたい",
      },
      {
        key: "quit",
        label: "3年後にはやめていたい働き方は？",
        placeholder: "例：自分が動かないと売上が止まる状態",
      },
    ],
    fields: [
      {
        key: "plan_name",
        desc: "計画名。年を入れると分かりやすい（例：2029年までの成長計画）。",
      },
      {
        key: "ideal_state_in_3y",
        desc: "3年後の理想状態。数字と状態の両方で。",
      },
      { key: "business_pillars", desc: "事業の柱。カンマ区切りで。" },
      { key: "revenue_model", desc: "収益モデル。どこからどう稼ぐか。" },
      { key: "assets_to_build", desc: "3年で築きたい資産（お金以外）。" },
      { key: "work_style_to_quit", desc: "やめたい働き方。" },
    ],
  },
  "decision-principles": {
    title: "判断基準をAIと作る",
    questions: [
      {
        key: "rule",
        label: "意思決定で、自分なりのこだわり・ルールはありますか？",
        placeholder: "例：迷ったら長く続く関係の方を選ぶ",
      },
      {
        key: "why",
        label: "なぜそうするのですか？",
        placeholder: "例：単発の利益より紹介の連鎖の方が伸びるから",
      },
      {
        key: "scene",
        label: "どんな場面のルールですか？",
        placeholder: "例：案件を受けるかどうかの判断のとき",
      },
    ],
    fields: [
      { key: "name", desc: "原則名。覚えやすい一言で。" },
      { key: "category", desc: "場面のカテゴリ（営業 / 採用 / 投資 など）。" },
      { key: "rule", desc: "具体的にどう動くか。" },
      { key: "reason", desc: "なぜそうするのか。" },
      { key: "priority", desc: "優先度。必ず「高」「中」「低」のいずれか1文字。" },
      { key: "exception", desc: "このルールを破ってよい例外条件。無ければ空。" },
      { key: "related_values", desc: "関連する価値観。カンマ区切り。無ければ空。" },
    ],
  },
  "tone-rules": {
    title: "口調ルールをAIと作る",
    questions: [
      {
        key: "tone",
        label: "メッセージを書くとき、どんな雰囲気で書きたいですか？",
        placeholder: "例：落ち着いて、誠実に、押しつけない",
      },
      {
        key: "ng",
        label: "使いたくない言葉・避けたい表現は？",
        placeholder: "例：「絶対」「100%」などの誇張、煽る表現",
      },
      {
        key: "relation",
        label: "相手によって言葉遣いを変えますか？",
        placeholder: "例：初対面は敬語、馴染みの相手はややくだけて",
      },
    ],
    fields: [
      { key: "name", desc: "この口調設定の呼び名（例：基本トーン）。" },
      { key: "base_tone", desc: "基本の口調。単語でいくつか。" },
      { key: "politeness", desc: "敬語の度合い・相手による使い分け。" },
      { key: "ng_expressions", desc: "使ってほしくない言葉・言い回し。" },
      { key: "reply_length", desc: "返信の理想の長さ。無ければ空。" },
      { key: "confirm_before_proposing", desc: "提案の前に確認すること。無ければ空。" },
      { key: "no_pushy_rule", desc: "押し売りしないための線引き。無ければ空。" },
    ],
  },
  "ng-rules": {
    title: "NGルールをAIと作る",
    questions: [
      {
        key: "area",
        label: "AIに任せず、必ず自分が最終判断したい領域は？",
        placeholder: "例：金額・契約条件の最終確定",
      },
      {
        key: "why",
        label: "なぜ人が判断すべきですか？",
        placeholder: "例：金額は関係性と状況で変わり、誤ると信頼を損なうから",
      },
      {
        key: "who",
        label: "その領域に当たったら、誰に確認を回しますか？",
        placeholder: "例：自分（社長）に確認",
      },
    ],
    fields: [
      { key: "area_name", desc: "AIに最終判断させない領域を一言で。" },
      { key: "reason_not_for_ai", desc: "なぜ人が判断すべきか。" },
      { key: "escalation_target", desc: "誰に回すか。" },
      {
        key: "confirmation_procedure",
        desc: "どこまでAIがやってよいか・確認手順。",
      },
    ],
  },
  faq: {
    title: "FAQをAIと作る",
    questions: [
      {
        key: "question",
        label: "お客様からよく聞かれる質問は？",
        placeholder: "例：料金はいくらですか？",
      },
      {
        key: "answer",
        label: "いつもどう答えていますか？",
        placeholder: "例：プランにより月額◯円〜。まず無料相談から",
      },
      {
        key: "caution",
        label: "答えるとき、気をつけていることは？",
        placeholder: "例：大型案件は別見積もり、金額確定は本人確認後",
      },
    ],
    fields: [
      { key: "question", desc: "質問文。お客様の言葉のまま。" },
      { key: "base_answer", desc: "いつも答えている内容。" },
      { key: "supplement", desc: "状況により付け足す補足。無ければ空。" },
      { key: "caveat", desc: "誤解されやすい点・注意点。無ければ空。" },
    ],
  },
} satisfies Record<string, AssistConfig>;

export type AssistableSection = keyof typeof CORE_OS_ASSIST;

export function getAssistConfig(section: string): AssistConfig | null {
  return (CORE_OS_ASSIST as Record<string, AssistConfig>)[section] ?? null;
}
