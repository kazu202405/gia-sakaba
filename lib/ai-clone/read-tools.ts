// AI Clone の Read 系 Tool Calling 基盤（query / 雑談中の検索専用）。
//
// 目的:
//   handleQuery（質問・相談・雑談モード）の中で AI Clone が必要に応じて
//   過去データを引っ張れるようにする。書込みではないので副作用なし。
//
// 設計:
//   tools.ts の mutate ツール群とは別 export にして、handleQuery 側でだけ
//   ロードする。仕様は OpenAI function spec。executor は supabase-db の
//   search*ForChat ヘルパーを呼び、結果は JSON シリアライズしやすい平たい
//   構造で返す（AI が文脈として扱いやすいよう）。
//
// なぜ Read を Tool 化するか:
//   handleQuery は従来「人物名抽出 → 関連情報 pre-fetch → systemPrompt 埋込」
//   という固定 context だった。これだと「キーワード検索」「日付範囲指定」
//   「過去の判断事例参照」など、AI が自律的に検索したい場面に対応できない。
//   tool calling 化すれば AI が「何を／いつ／誰を」検索するか自分で決められる。

import type { ChatCompletionTool } from "openai/resources/chat/completions";
import {
  searchConversationsForChat,
  searchTasksForChat,
  searchPeopleForChat,
  searchDecisionCasesForChat,
  fetchReferralWeeklyKpi,
  listCommunityMembers,
  listSilentPeople,
  listProjectsForChat,
} from "./supabase-db";
import { buildActionPlan } from "./action-plan";

// ===========================================================
// Tool 定義（OpenAI function spec）
// ===========================================================

export const aiCloneReadTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_conversations",
      description:
        "過去の会話・打ち合わせ・面談ログを検索する。" +
        "ユーザーが「○○について話したやつ教えて」「今月のSlackのやり取り」「Aさんと最近何話した」など、" +
        "過去の会話を参照する必要がある時に使う。" +
        "【重要】「Aさんと何を話したか」のように特定の人物との会話を聞かれた場合は、" +
        "必ず person_name にその名前を入れること。query には名前を入れない。" +
        "会話本文には参加者の名前が載っていないことが多く、query（本文検索）では取りこぼすため。" +
        "person_name は人物リンク経由で確実に絞り込む（部分一致・敬称や全角半角スペースは自動吸収）。" +
        "query は『契約』『旅費』のような話題キーワード専用（要約・本文・次のアクションを横断 ilike）。" +
        "結果は最大10件、新しい順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "話題キーワード専用。要約・本文・次のアクションに横断 ilike。例：「契約」「旅費」「来週の見積」。" +
              "人物名はここに入れない（person_name を使う）。",
          },
          person_name: {
            type: "string",
            description:
              "登場人物の名前。指定するとその人との会話だけに人物リンク経由で絞る。" +
              "「Aさんと何話した？」型は必ずここに名前を入れる。敬称（さん/様 等）や全角半角スペースは自動で吸収される。",
          },
          date_from: {
            type: "string",
            description: "開始日 YYYY-MM-DD。「今月」「今週」「過去30日」等を絶対化",
          },
          date_to: {
            type: "string",
            description: "終了日 YYYY-MM-DD",
          },
          channels: {
            type: "array",
            items: { type: "string", enum: ["Slack", "LINE", "Email", "対面", "電話", "その他"] },
            description: "チャンネルで絞る",
          },
          importance: {
            type: "array",
            items: { type: "string", enum: ["S", "A", "B", "C"] },
            description: "重要度で絞る",
          },
          limit: {
            type: "number",
            description: "結果件数の上限。既定10。要約してから渡したい時は3〜5に絞っても良い",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description:
        "タスクを検索する。" +
        "「期限切れのタスク何ある？」「○○系のタスク残ってる？」「来週までに終わらせるべきものは？」など、" +
        "タスクを参照する必要がある時に使う。" +
        "結果は最大10件、期限近い順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "キーワード（タスク名・目的に横断 ilike）",
          },
          statuses: {
            type: "array",
            items: { type: "string", enum: ["未着手", "進行中", "完了", "保留"] },
            description: "状態で絞る",
          },
          priorities: {
            type: "array",
            items: { type: "string", enum: ["高", "中", "低"] },
            description: "優先度で絞る",
          },
          due_on_or_before: {
            type: "string",
            description: "この日付以前に期限が来るタスク（YYYY-MM-DD）",
          },
          overdue_only: {
            type: "boolean",
            description: "true で期限切れかつ未完了のタスクのみ",
          },
          limit: { type: "number", description: "結果件数の上限。既定10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_community_members",
      description:
        "特定の「会」（BNI / 守成クラブ / テツジン会 等）に紐づく人物の一覧を返す。" +
        "「BNIの人一覧」「守成クラブで会った人」「テツジン会のメンバー誰がいる？」など。" +
        "community_name に会の名前を渡す。",
      parameters: {
        type: "object",
        properties: {
          community_name: { type: "string", description: "会・コミュニティ名" },
        },
        required: ["community_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_people",
      description:
        "人物（人脈・顧客・パートナー）を検索する。" +
        "「○○系の業界の人いる？」「重要度Sの人ピックアップ」「○○さんから紹介された人」など、" +
        "人物リストを参照する必要がある時に使う。" +
        "結果は最大10件、最近更新順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "名前・会社名・役職に横断 ilike",
          },
          importance: {
            type: "array",
            items: { type: "string", enum: ["S", "A", "B", "C"] },
          },
          temperature: {
            type: "array",
            items: { type: "string", enum: ["熱い", "様子見", "冷えてる"] },
          },
          met_context: {
            type: "array",
            items: { type: "string" },
            description: "出会った場所（例：「◯◯セミナー」「△△サロン」）",
          },
          referrer_name: {
            type: "string",
            description: "紹介元の人物名（部分一致）。指定するとその人から紹介された人だけに絞る",
          },
          has_action: {
            type: "boolean",
            description: "true で「次のアクション」が登録されている人だけに絞る",
          },
          limit: { type: "number", description: "結果件数の上限。既定10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_decision_cases",
      description:
        "過去の判断事例ログを検索する（AI 五島の核）。" +
        "「過去に似た判断あった？」「同じような相談、前にも対応したことある？」など、" +
        "本人の過去の判断・対応・学びを参照する必要がある時に使う。" +
        "ユーザー確認済み（confirmed=true）の事例のみが対象（誤抽出ガード）。" +
        "結果は最大10件、新しい順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "キーワード（出来事・見立て・対応・結果・学び・意図・再利用条件を横断 ilike）。" +
              "例：「不安」「契約破棄」「断り方」「価格交渉」",
          },
          confirmed_only: {
            type: "boolean",
            description:
              "確認済み事例のみに絞るか。既定 true。AI 抽出だけで未確認のドラフトを含めたい時のみ false に",
          },
          date_from: { type: "string", description: "YYYY-MM-DD" },
          date_to: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number", description: "結果件数の上限。既定10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_action_plan",
      description:
        "「今日(または明日)は何をしたらいい？」「今日やるべきことは？」「明日の段取りは？」など、" +
        "その日の動きを能動的に提案してほしい時に使う。" +
        "右腕AIの看板機能＝忘れている売上・関係を掘り起こす。返り値に以下を束ねて返す：" +
        "salesActions=やるべき売上行動（ご無沙汰の重要人物への近況うかがい / 止まった商談の進捗確認 / 受注後の紹介依頼）、" +
        "dueTasks=期限が来ている未完タスク（overdueDays>0は超過）、staleTaskCount=3日以上滞留している件数、" +
        "anniversaries=その日の記念日・節目、openPromises=会話ログに残った『次の約束(next_action)』＝果たせていない約束、" +
        "quickWin=溜まる前にまず片付ける1件。" +
        "これらと（システムプロンプト側にある）カレンダー予定・経営コンテキストを突き合わせ、" +
        "優先順位をつけて『今日はこれをやりましょう』と具体的に提案すること。" +
        "openPromises があれば『○○さんへの△△、その後どうなっていますか？』と思い出させる。",
      parameters: {
        type: "object",
        properties: {
          day: {
            type: "string",
            enum: ["today", "tomorrow"],
            description:
              "対象日。『今日何したらいい？』なら today、『明日何したらいい？／明日の段取り』なら tomorrow。既定 today。",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description:
        "案件（プロジェクト/イベント）の一覧を返す。" +
        "「案件だして」「今の案件は？」「案件一覧」「進行中の案件」「○○の案件ある？」など、" +
        "登録済みの案件を見たい時に使う（新規作成 create_project とは別）。" +
        "返り値：name / status / dueDate（期限・開催日）/ nextAction / peopleNames（関係者）。期限が近い順。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "案件名で絞るキーワード（任意）" },
          statuses: {
            type: "array",
            items: {
              type: "string",
              enum: ["リード", "提案", "受注", "進行中", "完了", "失注"],
            },
            description: "ステータスで絞る（例：進行中だけ）。任意",
          },
          limit: { type: "number", description: "件数上限。既定20" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_silent_people",
      description:
        "「最後にやりとりしてから N 日以上たっている人（ご無沙汰の相手）」を返す。" +
        "「30日以上連絡してない人出して」「しばらく会ってない人は？」「ご無沙汰リスト」など。" +
        "最終接触日＝その人の会話ログ・活動ログの一番新しい日付（無ければ登録日）。" +
        "返り値：name / lastContact（最終接触日。null＝接触記録なし）/ days（経過日数）/ importance / nextAction。" +
        "days は経過が長い順。これは『次のアクションが残っている人』とは別物＝実際の接触日で絞っている。",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "この日数以上ご無沙汰の人を返す。既定30。「2ヶ月」なら60等に換算。",
          },
          limit: { type: "number", description: "結果件数の上限。既定30" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_referral_kpi",
      description:
        "紹介の週次KPI（頼んだ数 / 与えた数 / 生まれた数）を集計して返す。" +
        "「今週の紹介どれくらい？」「紹介KPI」「今週、紹介何件頼んだ？」など、" +
        "紹介の行動量を振り返る時に使う。" +
        "返り値: asked=紹介を頼んだ件数 / gave=自分が紹介した件数 / born=紹介経由で増えた人の件数。" +
        "date_from/date_to 未指定なら直近7日。",
      parameters: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: "開始日 YYYY-MM-DD。未指定なら直近7日の開始",
          },
          date_to: {
            type: "string",
            description: "終了日 YYYY-MM-DD。未指定なら今日",
          },
        },
      },
    },
  },
];

// JST の今日 YYYY-MM-DD
function todayJstStr(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

// YYYY-MM-DD から n 日前の YYYY-MM-DD
function minusDaysStr(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ===========================================================
// Executor
// ===========================================================

interface ReadToolContext {
  tenantId: string;
}

export async function executeReadTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ReadToolContext,
): Promise<unknown> {
  const str = (k: string): string | undefined => {
    const v = args[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const num = (k: string): number | undefined => {
    const v = args[k];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  const arr = (k: string): string[] | undefined => {
    const v = args[k];
    if (!Array.isArray(v)) return undefined;
    const cleaned = v.filter((x): x is string => typeof x === "string");
    return cleaned.length > 0 ? cleaned : undefined;
  };
  const bool = (k: string): boolean | undefined => {
    const v = args[k];
    return typeof v === "boolean" ? v : undefined;
  };

  switch (toolName) {
    case "list_community_members":
      return listCommunityMembers(ctx.tenantId, str("community_name") ?? "");
    case "search_conversations":
      return searchConversationsForChat(ctx.tenantId, {
        query: str("query"),
        personName: str("person_name"),
        dateFrom: str("date_from"),
        dateTo: str("date_to"),
        channels: arr("channels"),
        importance: arr("importance"),
        limit: num("limit"),
      });
    case "search_tasks":
      return searchTasksForChat(ctx.tenantId, {
        query: str("query"),
        statuses: arr("statuses"),
        priorities: arr("priorities"),
        dueOnOrBefore: str("due_on_or_before"),
        overdueOnly: bool("overdue_only"),
        limit: num("limit"),
      });
    case "search_people":
      return searchPeopleForChat(ctx.tenantId, {
        query: str("query"),
        importance: arr("importance"),
        temperature: arr("temperature"),
        metContext: arr("met_context"),
        referrerName: str("referrer_name"),
        hasAction: bool("has_action"),
        limit: num("limit"),
      });
    case "search_decision_cases":
      return searchDecisionCasesForChat(ctx.tenantId, {
        query: str("query"),
        confirmedOnly: bool("confirmed_only") ?? true,
        dateFrom: str("date_from"),
        dateTo: str("date_to"),
        limit: num("limit"),
      });
    case "get_referral_kpi": {
      const to = str("date_to") ?? todayJstStr();
      const from = str("date_from") ?? minusDaysStr(to, 6); // 直近7日（両端含む）
      return fetchReferralWeeklyKpi(ctx.tenantId, from, to);
    }
    case "list_projects":
      return listProjectsForChat(ctx.tenantId, {
        query: str("query"),
        statuses: arr("statuses"),
        limit: num("limit"),
      });
    case "list_silent_people": {
      const days = num("days") ?? 30;
      const limit = num("limit") ?? 30;
      return listSilentPeople(ctx.tenantId, todayJstStr(), days, limit);
    }
    case "get_action_plan": {
      const day = str("day") === "tomorrow" ? "tomorrow" : "today";
      // オンデマンドの即答では下書きは生成しない（遅くなるため）。
      // 本人が「下書きも」と望んだら別途、人物名で連絡文を作る運用。
      return buildActionPlan(ctx.tenantId, day);
    }
    default:
      return { error: `未知の read tool: ${toolName}` };
  }
}
