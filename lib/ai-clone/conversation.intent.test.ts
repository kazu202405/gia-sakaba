import { describe, it, expect } from "vitest";
import { classifyIntent } from "./conversation";

// ───────────────────────────────────────────────────────────────
// classifyIntent の characterization（スナップショット）テスト。
//
// 目的：今の振り分けの「挙動」を凍結する。リファクタや機能追加で、
//       通っていた振り分けが変わったら即検知できるようにする。
// 方針：ここで対象にするのは「AIフォールバックに到達しない決定論パス」
//       （プレフィックス / 早期検知の正規表現 / 25字未満→query）だけ。
//       AIフォールバック（gpt-4o-mini）に行く曖昧な長文は対象外。
//       stub クライアントは「呼ばれたら例外」にしてあるので、もし
//       フォールバックに到達したらテストが落ちて気づける。
// ※ 期待値は「現在の実装の挙動」。失敗したら、その変更が意図的かを判断する。
// ───────────────────────────────────────────────────────────────

// AIフォールバックに到達したら検知できるよう、呼ばれたら投げるダミークライアント。
const stubClient = {
  chat: {
    completions: {
      create: async () => {
        throw new Error(
          "[test] AIフォールバックに到達しました（このテストは決定論パスのみを対象）",
        );
      },
    },
  },
} as never;

const cases: { input: string; expect: string; note?: string }[] = [
  // --- ヘルプ ---
  { input: "?", expect: "help" },
  { input: "使い方", expect: "help" },

  // --- 明示プレフィックス ---
  { input: "名刺\n堂本 晃央\n看板 動画制作\n重要度A", expect: "businessCard" },
  { input: "案件: 7/3 紹介セミナー、くろちゃんとれんげちゃんが来る", expect: "projectNote" },
  { input: "プロジェクト: 新規アプリ開発", expect: "projectNote" },
  { input: "議事録\n参加者:田中 決定事項...", expect: "transcript" },
  { input: "リマインド: 6/10までに請求書送る", expect: "reminder" },
  { input: "振り返り: 今日はBNIに行った", expect: "reflection" },
  { input: "備考: 田中さんは慎重派", expect: "remark" },
  { input: "進捗: 山田さんにサロン提案した", expect: "pipelineUpdate" },
  { input: "タスク\n藤野さんにエアコンの価格表", expect: "taskCreate" },
  { input: "やること: 請求書を送る", expect: "taskCreate" },

  // --- 自然文ファネル更新 ---
  { input: "穴見さんにサロン提案した", expect: "pipelineUpdate" },

  // --- 想起・検索は query 優先 ---
  { input: "以前なに話したっけ", expect: "query" },

  // --- 未来の予定（アポ）→ reminder ---
  { input: "今週金曜11時に小林さんと補助金の話で会う", expect: "reminder" },
  { input: "来週打ち合わせ", expect: "reminder" },

  // --- 削除（体言止め含む）/ 個人属性の登録（mutate）---
  { input: "くろちゃん\n削除", expect: "mutate" },
  { input: "オプチャの資料作成を削除", expect: "mutate" },
  { input: "タスクのオプチャの資料作成を削除", expect: "mutate" },
  { input: "8のオプチャの資料作成のタスク削除して", expect: "mutate" },
  { input: "この案件削除お願い", expect: "mutate" },
  {
    input: "2. 紹介セミナー\n   ・関係者: れんげ、くろちゃん\nこれ削除お願い",
    expect: "mutate",
  },
  { input: "石原　さとし\n誕生日　1995/06/22", expect: "mutate" },

  // --- リスケ / 期限外す（mutate）---
  { input: "これの期限明日にのばせる？", expect: "mutate" },
  { input: "オプチャの資料、期限なしにして", expect: "mutate" },
  { input: "資料作成の期限外して", expect: "mutate" },

  // --- 再オープン ---
  { input: "MVVの資料やっぱりまだ終わってない", expect: "mutate" },
  {
    input: "完了したタスク、オプチャの資料作成を期限なしで未完了に戻して",
    expect: "mutate",
  },
  {
    // 実機の言い回し：完了と「戻したい」が改行＋長いタスク名で離れているケース
    input:
      "完了したタスク\n「オプチャやオンラインサロンで提供できる資料作成」\nこれを期限なしで戻したい",
    expect: "mutate",
  },

  // --- 優先度 / リネーム ---
  { input: "請求書の件、優先度上げて", expect: "mutate" },
  { input: "MVVの件、資料作成に直して", expect: "mutate" },

  // --- 復元 / アンドゥ ---
  { input: "さっきの取り消して", expect: "mutate" },
  { input: "全部取り消して", expect: "mutate" },
  { input: "間違えた", expect: "mutate" },

  // --- 会話ログ訂正 / 削除 ---
  { input: "さっきの会話、相手は田端さん", expect: "mutate" },
  { input: "さっきの会話記録消して", expect: "mutate" },

  // --- リマインド変更 / 停止 ---
  { input: "小林さんの誕生日3/30に直して", expect: "mutate" },
  { input: "この毎月のリマインドやめて", expect: "mutate" },

  // --- 紹介ログ訂正 ---
  { input: "さっきの紹介、頼んだじゃなく与えたに直して", expect: "mutate" },

  // --- 判断事例訂正 / 削除 ---
  { input: "さっきの判断事例の学び直して", expect: "mutate" },
  { input: "あの判断事例消して", expect: "mutate" },

  // --- 案件 / サービス ---
  { input: "みやこ案件を完了にして", expect: "mutate" },
  { input: "○○というサービス作って", expect: "mutate" },
  { input: "新規でテツジン案件立てて", expect: "mutate" },

  // --- 人物 統合 / 削除 / 重複掃除 ---
  { input: "山崎さんと山崎誠さん同じ人、統合して", expect: "mutate" },
  { input: "重複を全部掃除して", expect: "mutate" },
  { input: "テスト人物の田中さん削除して", expect: "mutate" },

  // --- 会（コミュニティ）---
  { input: "BNIを会に登録", expect: "mutate" },
  { input: "田中さんをBNIに追加", expect: "mutate" },

  // --- mutate OR（作成・完了・会話ログ・紹介）---
  { input: "MVVを整理した資料の作成は完了したよ", expect: "mutate" },
  { input: "田中さんと打合せ：旅費規定の話", expect: "mutate" },
  { input: "穴見さんに紹介を頼んだ", expect: "mutate" },

  // --- 名詞止め / 動詞のタスク（プレフィックス無し）---
  { input: "オンライン用の背景のLINEQRコードの修正", expect: "mutate" },
  { input: "藤野さんにエアコンの価格表完成させておくる", expect: "mutate" },

  // --- query（25字未満・読み取り・雑談）---
  { input: "今日何したらいい？", expect: "query" },
  { input: "山崎さんの誕生日教えて", expect: "query" },
  { input: "BNIの人一覧", expect: "query" },
  { input: "ありがとう", expect: "query" },
];

describe("classifyIntent characterization", () => {
  for (const c of cases) {
    it(`「${c.input.replace(/\n/g, "⏎")}」→ ${c.expect}`, async () => {
      const got = await classifyIntent(stubClient, c.input);
      expect(got).toBe(c.expect);
    });
  }
});
