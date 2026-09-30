// 会員プランの中身（プラン画面と、トップページの会員プランで同じものを使う）
import { SAKABA_PLAN_NAMES } from "@/lib/guild/billing-plans";
import { PLAN_LIMITS } from "@/lib/guild/plan-usage";

// 数は PLAN_LIMITS（DBの sakaba.plan_limits と同じかをテストで見張っている）。
// 文の中の | は折り返してよい位置（components/guild/phrase.tsx）
export type Feature = { title: string; desc: string };
export const F = {
  intro: (n: number | null): Feature => ({ title: `つながり申請 月${n}件`, desc: "気になるメンバーに|「会ってみたい」と|申し込めます。|相手が承諾すると、|お互いの連絡先が|見えます。" }),
  quest: (n: number | null): Feature => ({ title: n === null ? "クエスト・集まり 何件でも" : `クエスト・集まり 月${n}件`, desc: "仕事の依頼や相談、|飲み会などの|呼びかけを、|掲示板に出せます。" }),
  project: (n: number | null): Feature => ({ title: n === null ? "プロジェクト いくつでも" : `プロジェクト ${n}つまで`, desc: "自分の仕事を|タスクに分けて|進める記録帳です。" }),
  nameSearch: { title: "名前・職業で探す", desc: "メンバー名鑑で、|名前や職業から|人を探せます。" },
  filter: { title: "絞り込み・めいし表示", desc: "業種や地域で|しぼり込んだり、|名刺の画像を|並べて見たりできます。" },
  keyword: { title: "キーワード検索", desc: "自己紹介や|さがしているものなど、|本文の言葉まで|探せます。" },
  members: { title: "有料会員限定の集まり", desc: "管理者が開く|会員限定の集まりに|申し込めます。" },
  wish: { title: "会食の希望", desc: "会ってみたい人や|話したいテーマを、|管理者に伝えられます。" },
  availability: { title: "会食のマッチング", desc: "空いている日時を|登録しておくと、|日程の合うメンバーが|数名そろったときに、|管理者から|会食のご案内が|届きます。|（登録した日時が|見えるのは、|あなたと管理者|だけです）" },
} satisfies Record<string, Feature | ((n: number | null) => Feature)>;

export const plans = [
  { key: "free", label: SAKABA_PLAN_NAMES.free, price: "0円", lead: "まず様子を見る・|紹介を待つ", features: [F.intro(PLAN_LIMITS.free.intro), F.quest(PLAN_LIMITS.free.quest), F.nameSearch, F.project(PLAN_LIMITS.free.project)] },
  { key: "standard", label: SAKABA_PLAN_NAMES.standard, price: "月480円", lead: "月に何人か、|自分から|会いに行く", features: [F.intro(PLAN_LIMITS.standard.intro), F.quest(PLAN_LIMITS.standard.quest), F.nameSearch, F.filter, F.project(PLAN_LIMITS.standard.project), F.members] },
  { key: "dining", label: SAKABA_PLAN_NAMES.dining, price: "月880円", lead: "毎週動いて、|仕事を回す", features: [F.intro(PLAN_LIMITS.dining.intro), F.quest(PLAN_LIMITS.dining.quest), F.filter, F.keyword, F.project(PLAN_LIMITS.dining.project), F.members, F.wish] },
] as const;
