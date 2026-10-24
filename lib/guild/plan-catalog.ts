// 会員プランの中身（プラン画面と、トップページの会員プランで同じものを使う）
import { SAKABA_PLAN_NAMES } from "@/lib/guild/billing-plans";
import { PLAN_LIMITS } from "@/lib/guild/plan-usage";
import { makeWording, type Wording } from "@/lib/guild/store-words";
import { GIA_WORDS } from "@/lib/guild/words/gia";

// 数は PLAN_LIMITS（DBの sakaba.plan_limits と同じかをテストで見張っている）。
// 文の中の | は折り返してよい位置（components/guild/phrase.tsx）
export type Feature = { title: string; desc: string };
// 店の画面は featuresFor(store.w)・plansFor(store.w)。名前の付いた F・plans は GIAの酒場の言葉（トップページが使う）
export const featuresFor = (w: Wording) => ({
  intro: (n: number | null): Feature => ({ title: `つながり申請 月${n}件`, desc: "気になるメンバーに|「会ってみたい」と|申し込めます。|相手が承諾すると、|お互いの連絡先が|見えます。" }),
  quest: (n: number | null): Feature => ({ title: n === null ? w("plan.f.questAll") : w("plan.f.quest", { n }), desc: "仕事の依頼や相談、|飲み会などの|呼びかけを、|掲示板に出せます。" }),
  project: (n: number | null): Feature => ({ title: n === null ? "プロジェクト いくつでも" : `プロジェクト ${n}つまで`, desc: "自分の仕事を|タスクに分けて|進める記録帳です。" }),
  nameSearch: { title: "名前・職業で探す", desc: w("plan.f.nameSearchDesc") },
  filter: { title: w("plan.f.filterTitle"), desc: w("plan.f.filterDesc") },
  keyword: { title: "キーワード検索", desc: w("plan.f.keywordDesc") },
  members: { title: "有料会員限定の集まり", desc: "管理者が開く|会員限定の集まりに|申し込めます。" },
  wish: { title: "会食の希望", desc: "会ってみたい人や|話したいテーマを、|管理者に伝えられます。" },
  availability: { title: "会食のマッチング", desc: "空いている日時を|登録しておくと、|日程の合うメンバーが|数名そろったときに、|管理者から|会食のご案内が|届きます。|（登録した日時が|見えるのは、|あなたと管理者|だけです）" },
}) satisfies Record<string, Feature | ((n: number | null) => Feature)>;

export const plansFor = (w: Wording) => {
  const F = featuresFor(w);
  return [
    { key: "free", label: SAKABA_PLAN_NAMES.free, price: "0円", lead: "まず様子を見る・|紹介を待つ", features: [F.intro(PLAN_LIMITS.free.intro), F.quest(PLAN_LIMITS.free.quest), F.nameSearch, F.project(PLAN_LIMITS.free.project)] },
    { key: "standard", label: SAKABA_PLAN_NAMES.standard, price: "月480円", lead: "月に何人か、|自分から|会いに行く", features: [F.intro(PLAN_LIMITS.standard.intro), F.quest(PLAN_LIMITS.standard.quest), F.nameSearch, F.filter, F.project(PLAN_LIMITS.standard.project), F.members] },
    { key: "dining", label: SAKABA_PLAN_NAMES.dining, price: "月880円", lead: "毎週動いて、|仕事を回す", features: [F.intro(PLAN_LIMITS.dining.intro), F.quest(PLAN_LIMITS.dining.quest), F.filter, F.keyword, F.project(PLAN_LIMITS.dining.project), F.members, F.wish] },
  ] as const;
};

const giaWording = makeWording(GIA_WORDS);
export const F = featuresFor(giaWording);
export const plans = plansFor(giaWording);
