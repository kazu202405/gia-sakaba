// AI Clone の会話処理エンジン。
//
// 入口:
//   generateReply(tenantId, userMessage) — Slack DM や将来の他チャネルから呼ばれる。
//   tenantId はチャネル層（例: Slack events route）で送信者→テナント解決済み。
//
// データ層:
//   旧: lib/ai-clone/notion-db.ts + lib/ai-clone/notion.ts（Notion 直接書込）
//   新: lib/ai-clone/supabase-db.ts（Supabase + 自前スキーマ）
//   Google Calendar は引き続き lib/ai-clone/google.ts を使用（カレンダー予定取得）。

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { fetchTodayEvents, fetchUpcomingEvents } from "./google";
import type { CalendarEvent } from "./types";
import { REFERRAL_KNOWLEDGE } from "./referral-knowledge";
import { withWeekday, resolveRelativeWeekday, resolveRelativeDate, todayJST } from "./date-utils";
import {
  fetchExecutiveContext,
  fetchReferralWorksheetText,
  setReferralWorksheetLinkEnabled,
  resolvePerson,
  createConversationLog,
  createNote,
  upsertJournalEntry,
  createPersonaTraitCandidate,
  fetchAdoptedPersonaTraits,
  PERSONA_TRAIT_CATEGORIES,
  type PersonaTraitCategory,
  findOrCreateCompany,
  createPersonDetailed,
  autoLinkCommunityByMetContext,
  createOrGetCommunity,
  linkPersonToCommunity,
  findPersonByEmail,
  findConversationLogByApproxSummaryAndDate,
  appendConversationLog,
  updatePersonPipeline,
  searchPeopleByName,
  fetchRecentConversationLogsForPerson,
  fetchRecentNotesForPerson,
  fetchPersonProfile,
  appendChatMessage,
  fetchRecentChatMessages,
  type ChatHistoryMessage,
  getTenantPrimaryCalendarId,
  findOpenTasks,
  getActivePendingAction,
  deletePendingAction,
  createTaskRecord,
  createProjectRecord,
  createOrUpdateTaskByName,
  createDatedReminderRecord,
  type PendingActionRow,
} from "./supabase-db";
import { dispatchMutateTools } from "./tools";
import { aiCloneReadTools, executeReadTool } from "./read-tools";

export type ChatChannel = "Slack" | "LINE" | "Web";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Slack/LINE 向けに応答を整える。AI が指示を破って Markdown の箇条書き記号
// （行頭の「- 」「* 」「+ 」）を出すことがあり、そのまま「- 石原さん」と表示されて
// 読みにくいので、行頭の箇条書き記号だけ「・」に正規化する。
// 文中のハイフン（日付 6-10 等）は行頭ではないので壊さない。
function sanitizeReplyForChat(text: string): string {
  return (
    text
      // 見出し（行頭 #, ##, ###）→ 記号だけ除去
      .replace(/^[ \t　]*#{1,6}\s+/gm, "")
      // 箇条書き（行頭 -, *, +）→ ・
      .replace(/^([ \t　]*)[-*+]\s+/gm, "$1・")
      // 強調 **text** / __text__ → 中身だけ残す（Slack/LINE で ** が生表示されるのを防ぐ）
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/__([^_\n]+)__/g, "$1")
      // 取り残した ** の保険
      .replace(/\*\*/g, "")
  );
}

// メイン：ユーザーメッセージにAIで応答
// 2026-05-17：externalUserId / channel を受け取り、曖昧マッチ確認の往復（pending_action）に対応。
//             既存呼び出しコードが externalUserId / channel を省略しても動くように引数はオプション化している。
export async function generateReply(
  tenantId: string,
  userMessage: string,
  externalUserId?: string,
  channel?: ChatChannel,
): Promise<string> {
  const client = getClient();
  if (!client) {
    return "（OpenAI APIキー未設定のため、現在は応答できません）";
  }

  // 直近の会話履歴を読み込む（channel + externalUserId があるときだけ）。
  // これで「さっきの○○さんの件」「あるよ」「その件」のような前後の文脈を保てる。
  const history: ChatHistoryMessage[] =
    externalUserId && channel
      ? await fetchRecentChatMessages(
          tenantId,
          channel,
          externalUserId,
          8,
        ).catch(() => [])
      : [];

  const rawReply = await routeReply(
    client,
    tenantId,
    userMessage,
    externalUserId,
    channel,
    history,
  );
  const reply = sanitizeReplyForChat(rawReply);

  // 今回のやり取りを履歴に追記（best-effort。失敗しても応答は返す）。
  if (externalUserId && channel) {
    try {
      await appendChatMessage(tenantId, channel, externalUserId, "user", userMessage);
      await appendChatMessage(tenantId, channel, externalUserId, "assistant", reply);
    } catch (e) {
      console.error("[ai-clone] 会話履歴の保存に失敗:", e);
    }
  }
  return reply;
}

// 実際のルーティング本体。generateReply から履歴つきで呼ばれる。
async function routeReply(
  client: OpenAI,
  tenantId: string,
  userMessage: string,
  externalUserId: string | undefined,
  channel: ChatChannel | undefined,
  history: ChatHistoryMessage[],
): Promise<string> {
  // 0a) 紹介コーチ連携（ワークシート読込）の ON/OFF コマンドを最優先で処理
  const linkCmd = matchReferralLinkCommand(userMessage);
  if (linkCmd !== null) {
    const ok = await setReferralWorksheetLinkEnabled(tenantId, linkCmd);
    if (!ok) return "紹介連携の切替に失敗しました。少し時間をおいて試してください。";
    return linkCmd
      ? "紹介コーチ連携をオンにしました。紹介の相談には、あなたがワークシートに書いた紹介設計（USP・ボトルネック・今月のアクション等）を踏まえて答えます。"
      : "紹介コーチ連携をオフにしました。紹介の相談には汎用の紹介ノウハウのみで答えます。";
  }

  // 0) ペンディング（曖昧確認の返答待ち）があれば優先処理
  if (externalUserId && channel) {
    const pending = await getActivePendingAction(tenantId, channel, externalUserId);
    if (pending) {
      const resolved = await handlePendingAction(
        tenantId,
        externalUserId,
        channel,
        pending,
        userMessage,
      );
      if (resolved !== null) return resolved;
      // null = pending を解決する返答ではなかった → 通常フローへ。
      // 候補番号を待ち続ける必要があるため pending は残す。
    }
  }

  // 紹介ワークシートを「磨きたい」系（A-2）：右腕AI（Slack/LINE/Web）では対話磨きはできない。
  // 一般論を吐かず、磨きフローのある紹介コーチのチャットへ誘導する。
  if (wantsCoachWorksheetPolish(userMessage, history)) {
    return coachPolishRedirectReply();
  }

  const intent = await classifyIntent(client, userMessage);

  switch (intent) {
    case "help":
      return handleHelp();
    case "transcript":
      return await handleTranscript(client, tenantId, userMessage);
    case "businessCard":
      return await handleBusinessCard(client, tenantId, userMessage);
    case "projectNote":
      return await handleProjectNote(client, tenantId, userMessage);
    case "reminder":
      return await handleReminder(client, tenantId, userMessage);
    case "reflection":
      return await handleReflection(client, tenantId, userMessage);
    case "remark":
      return await handleRemark(client, tenantId, userMessage);
    case "pipelineUpdate":
      return await handlePipelineUpdate(client, tenantId, userMessage);
    case "taskCreate":
      return await handleTaskCreate(tenantId, userMessage);
    case "mutate":
      return await handleMutate(
        client,
        tenantId,
        userMessage,
        externalUserId,
        channel,
        history,
      );
    default:
      return await handleQuery(client, tenantId, userMessage, history);
  }
}

// =============================================
// PendingAction の解決（曖昧マッチ確認の往復）
// =============================================

// pending を解決できれば最終応答テキストを返す。
// 解決できる返信ではなかった場合（通常メッセージ等）は null を返し、通常フローへ。
async function handlePendingAction(
  tenantId: string,
  externalUserId: string,
  channel: ChatChannel,
  pending: PendingActionRow,
  userMessage: string,
): Promise<string | null> {
  const trimmed = userMessage.trim();

  // キャンセル系：明示的に「キャンセル」「やめる」と言われたら pending 破棄
  if (/^(キャンセル|やめる|中止|cancel)$/i.test(trimmed)) {
    await deletePendingAction(pending.id);
    return "キャンセルしました。";
  }

  if (pending.actionKind === "log_conversation_disambiguate") {
    return await resolveLogConversationDisambig(
      tenantId,
      pending,
      trimmed,
    );
  }

  // 未知の action_kind は無視（通常フローへ）
  return null;
}

async function resolveLogConversationDisambig(
  tenantId: string,
  pending: PendingActionRow,
  userInput: string,
): Promise<string | null> {
  const payload = pending.payload as {
    toolArgs?: Record<string, unknown>;
    resolvedPersonIds?: string[];
    resolvedNames?: string[];
    newlyCreated?: string[];
    ambiguousName?: string;
    candidates?: Array<{ id: string; name: string; companyHint: string }>;
  };
  const candidates = payload.candidates || [];
  if (candidates.length === 0) {
    await deletePendingAction(pending.id);
    return null;
  }

  // 番号で選択（半角・全角どちらも）
  let chosen: { id: string; name: string } | null = null;
  const normalized = userInput.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  if (/^[0-9]+$/.test(normalized)) {
    const n = Number(normalized);
    if (n >= 1 && n <= candidates.length) {
      chosen = { id: candidates[n - 1].id, name: candidates[n - 1].name };
    }
  }

  // 名前で選択（候補内の完全一致 or 部分一致）
  if (!chosen) {
    const target = userInput.toLowerCase().replace(/\s+/g, "");
    const exact = candidates.find(
      (c) => c.name.toLowerCase().replace(/\s+/g, "") === target,
    );
    if (exact) {
      chosen = { id: exact.id, name: exact.name };
    } else if (target.length >= 2) {
      const partial = candidates.find((c) => {
        const cname = c.name.toLowerCase().replace(/\s+/g, "");
        return cname.includes(target) || target.includes(cname);
      });
      if (partial) chosen = { id: partial.id, name: partial.name };
    }
  }

  if (!chosen) {
    // 解釈できなければ候補リストを再掲して promptし続ける。
    // ただし他意図のメッセージかもしれないので、すごく短い入力でなければ
    // 通常フローに譲る（null を返す）。
    if (userInput.length > 20) return null;
    const list = candidates
      .map(
        (c, i) =>
          `${i + 1}) ${c.name}${c.companyHint ? `（${c.companyHint}）` : ""}`,
      )
      .join("\n");
    return `「${payload.ambiguousName ?? "対象人物"}」の候補が複数あります。番号で返信してください：\n${list}\n\nやめる場合は「キャンセル」と返信してください。`;
  }

  // chosen 確定。元の log_conversation を実行する。
  const toolArgs = (payload.toolArgs ?? {}) as Record<string, unknown>;
  const summary = typeof toolArgs.summary === "string" ? toolArgs.summary : "";
  const content = typeof toolArgs.content === "string" ? toolArgs.content : "";
  if (!summary || !content) {
    await deletePendingAction(pending.id);
    return "ペンディングデータが不正だったため処理を中断しました。もう一度同じ内容を送ってください。";
  }

  const personIds = [...(payload.resolvedPersonIds ?? []), chosen.id];
  const allNames = [...(payload.resolvedNames ?? []), chosen.name];

  const created = await createConversationLog(tenantId, {
    summary,
    content,
    channel: typeof toolArgs.channel === "string" ? toolArgs.channel : "対面",
    nextAction:
      typeof toolArgs.next_action === "string" && toolArgs.next_action.trim()
        ? toolArgs.next_action.trim()
        : undefined,
    importance:
      typeof toolArgs.importance === "string"
        ? (toolArgs.importance as "S" | "A" | "B" | "C")
        : undefined,
    personIds,
  });

  await deletePendingAction(pending.id);

  if (!created) {
    return `「${chosen.name}」で確定しましたが、会話ログ作成に失敗しました。`;
  }

  return `✅ 会話ログを記録しました：「${summary}」\n   関係者: ${allNames.join(" / ")}`;
}

// 「紹介(コーチ/設計)連携 オン/オフ」コマンドを判定。
// true=オン / false=オフ / null=コマンドでない（通常処理へ）。
function matchReferralLinkCommand(text: string): boolean | null {
  const t = text.trim().replace(/[\s　]+/g, "");
  // 「紹介連携」「紹介コーチ連携」「紹介設計連携」のいずれかを含むときだけ対象
  if (!/紹介(コーチ|設計)?連携/.test(t)) return null;
  if (/(オン|オンに|on|有効|つけて|繋いで|つないで)/i.test(t)) return true;
  if (/(オフ|オフに|off|無効|切って|止めて|外して)/i.test(t)) return false;
  return null;
}

// =============================================
// 意図分類
// =============================================

type Intent =
  | "help"
  | "transcript"
  | "businessCard"
  | "projectNote"
  | "reminder"
  | "reflection"
  | "remark"
  | "pipelineUpdate"
  | "taskCreate"
  | "mutate"
  | "query";

// 紹介ワークシートの「対話で磨く」依頼を検知する（A-2）。
// メッセージにコーチ／ワークシート文脈＋磨く語があれば真。
// 「磨きたい」「磨けない？」のような磨く語だけの短文は、直近履歴がコーチ文脈なら真。
function wantsCoachWorksheetPolish(
  userMessage: string,
  history: ChatHistoryMessage[] = [],
): boolean {
  const t = userMessage.trim();
  const polishVerb = /(磨|ブラッシュ|練り直|見直)/;
  const coachTopic = /(コーチ|ワークシート|紹介(の)?設計|紹介シート)/;
  if (polishVerb.test(t) && coachTopic.test(t)) return true;
  // 磨く語だけの短文（「磨きたい」「磨けない？」等）は履歴の文脈で判断する。
  if (/^.{0,8}(磨きたい|磨けない|磨いて|磨ける|磨く|磨いてほしい)[\s。、.!！?？かのよ]*$/.test(t)) {
    const recent = history
      .slice(-4)
      .map((h) => h.content)
      .join("\n");
    if (coachTopic.test(recent)) return true;
  }
  return false;
}

function coachPolishRedirectReply(): string {
  return [
    "紹介の設計を磨くのは「紹介設計」ページでできます。",
    "各項目の「コーチと磨く」を押すと、深掘りの問いと改善案が出て、その場で直して保存できます。",
    "→ https://gia2018.com/members/app/worksheet",
    "（じっくり対話で磨きたいときは、紹介コーチのチャットでも磨けます）",
  ].join("\n");
}

// テスト（characterization）から呼べるよう export。挙動は変えない。
export async function classifyIntent(client: OpenAI, text: string): Promise<Intent> {
  const trimmed = text.trim();

  if (trimmed.length < 1) return "query";

  // ヘルプ系（短文一致）
  if (/^(\?|？|help|ヘルプ|コマンド|使い方)$/i.test(trimmed)) return "help";

  // 明示プレフィックス（最優先）
  if (/^(議事録|面談|memo|meeting)[:：\s]/i.test(trimmed)) return "transcript";
  if (/^(名刺|business[\s-]?card|card)[:：\s]/i.test(trimmed))
    return "businessCard";
  if (/^(案件|プロジェクト|案件登録|project)[:：\s]/i.test(trimmed))
    return "projectNote";
  // リマインド系（口語の言い回しも同じ意味で受ける）。中身の締切/記念日は handleReminder 内で AI 判別。
  if (/^(リマインド|覚えといて|覚えといて|思い出させて|思い出して|reminder)[:：\s]/i.test(trimmed))
    return "reminder";
  if (/^(振り返り|日報|日誌|reflection)[:：\s]/i.test(trimmed))
    return "reflection";
  if (/^(備考|人物メモ|note)[:：\s]/i.test(trimmed)) return "remark";
  if (/^(進捗|ファネル|pipeline)[:：\s]/i.test(trimmed))
    return "pipelineUpdate";
  // タスク明示プレフィックス：「タスク\n○○」「やること: ○○」→ 確実にタスク作成
  if (/^(タスク|やること|todo|to-?do)[:：\s]/i.test(trimmed)) return "taskCreate";

  // 自然文でのファネル更新（プレフィックスなし）
  if (
    /(さん|氏|様)[にがへ]?(.{0,10}(サロン|アプリ).{0,5}(提案|参加|入会|商談|受注|契約)|提案した|参加した|入会した|商談した|受注した)/.test(
      trimmed,
    )
  ) {
    return "pipelineUpdate";
  }

  // 想起・検索の質問は、mutate（記録）より優先して query に倒す。
  // 「以前なに話したっけ」「○○の打ち合わせあるでしょ？」等を会話ログ記録と誤判定し、
  // 検索せずに「記録に残っていません」と即答してしまうのを防ぐ。
  if (
    /(っけ|あるでしょ|あったでしょ|あったよね|覚えてる|何を?話した|何話した|(以前|過去)に?.{0,12}(話|打ち合わせ|打合せ|会っ|相談|議事録|やり取り))/.test(
      trimmed,
    )
  ) {
    return "query";
  }

  // 未来の予定（アポ）の早期検知 → reminder（過去の会話ログにせず、予定として登録する）。
  //   例:「今週金曜11時に小林さんと補助金の話で会う」「来週打ち合わせ」「明日アポ」
  //   右腕AI＝忘れさせない、の看板。未来の予定が過去の会話ログに沈むと前日配信に乗らず忘れる。
  //   ・未来の日時マーカー（今週/来週/明日/曜日/N時 等）があり、
  //   ・予定の動詞（会う/アポ/打ち合わせ/訪問 等）が「未来形・非過去」のときだけ拾う。
  //   過去形（会った/打合せした 等）は従来どおり下の会話ログ（mutate）へ。
  {
    const hasFutureTime =
      /(今週|来週|再来週|今度|明日|あした|明後日|あさって|今夜|今晩|来月|\d+日後|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日|[月火水木金土日]曜|\d{1,2}時|午前|午後)/.test(
        trimmed,
      );
    const hasApptVerb =
      /(会う|お会い|会います|会いに行く|アポ|打ち合わせ|打合せ|ミーティング|面談|訪問|来社|伺う|伺います|商談予定)/.test(
        trimmed,
      );
    const isPastAppt =
      /(会った|会いました|会えた|打合せした|打ち合わせした|済んだ|済ませた|終わった|終わりました|でした|だった|行ってきた|行ってきました)/.test(
        trimmed,
      );
    if (hasFutureTime && hasApptVerb && !isPastAppt) {
      return "reminder";
    }
  }

  // 既存タスクのリスケ（期限変更）→ mutate（reschedule_task ツールが拾う）。
  //   例:「これの期限明日にのばせる？」「○○を来週にずらして」「△△リスケ」
  //   「明日」等の未来日 + 期限変更語があると AI fallback が新規 reminder に倒し、
  //   期限が変わらないまま別のリマインドを作ってしまうのを防ぐ。
  if (
    /リスケ/.test(trimmed) ||
    (/(期限|期日|締切|納期|デッドライン)/.test(trimmed) &&
      /(のば|延ば|伸ば|ずら|遅らせ|前倒し|早め|変更|変えて|変えられ|外し|外す|外して|なしに|無しに|消し|消す|取っ|クリア|要らない|いらない)/.test(
        trimmed,
      ))
  ) {
    return "mutate";
  }

  // タスクの再オープン / 優先度変更 / 名前修正 → mutate（短文を取りこぼさない）。
  //   再開:「やっぱりまだ終わってない」「完了取り消して」「○○再開」
  //   優先度:「○○優先度上げて」「緊急で」「最優先」
  //   リネーム:「○○の件、△△に直して」「名前を××に変えて」
  if (
    /(まだ終わって(い)?ない|やっぱり.{0,10}(終わってない|戻して?|未完了)|完了.{0,4}(取り消|取消)|再開した?い?|未完了に戻)/.test(trimmed) ||
    // 「完了したタスク … これを（期限なしで）戻したい」のように、完了と「戻す」が
    // 改行や長いタスク名で離れているケースも拾う（[\s\S] で改行も跨ぐ）。
    /完了[\s\S]{0,80}(戻[しすせ]|復活)/.test(trimmed) ||
    /(優先(度|順位)).{0,6}(上げ|下げ|高く|低く|変え|に)|緊急(で|に|にして)|最優先/.test(trimmed) ||
    /(の件|タスク|名前|タイトル).{0,12}(に直して|を直して|に変えて|を変えて|に変更|へ変更|にして)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 削除タスクの復元 / 直前操作のアンドゥ → mutate。
  //   復元:「○○戻して」「△△復元して」「ゴミ箱から戻して」
  //   アンドゥ:「さっきの取り消して」「間違えた」「今のなし」「元に戻して」
  if (
    /(復元|ゴミ箱.{0,5}戻|削除.{0,4}(取り消|取消|戻)|消したの.{0,4}戻)/.test(trimmed) ||
    /(さっき|今の|直前).{0,8}(取り消|取消|なし|戻して|無し)|間違えた|元に戻して|やっぱりなし|今のなし/.test(trimmed) ||
    /(全部|まとめて|さっき.{0,6}全部|今の.{0,6}全部).{0,6}(取り消|取消|戻して|消して|なし)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 会話ログ（記録）の訂正・削除 → mutate。
  //   訂正:「さっきの会話、相手は△△さん」「あの記録の要約直して」「次のアクション変えて」
  //   削除:「さっきの会話記録消して」「あの記録いらない・削除して」
  if (
    /(会話|やり取り|記録|ログ|打合せ|打ち合わせ).{0,12}(消して|削除|いらない|不要|取り消|取消)/.test(trimmed) ||
    /(さっき|あの|その|直近|先(の|ほど))(の)?(会話|やり取り|記録|ログ|打合せ|打ち合わせ).{0,24}(直して|訂正|変えて|に変更|相手は|要約を?|次の?アクション)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 既存リマインド（記念日・誕生日・周年・定例）の変更・削除・停止 → mutate。
  //   新規リマインド登録(reminder)に倒れて二重作成されるのを防ぐ。
  if (
    /(記念日|誕生日|リマインド|周年|定例|毎月|毎年).{0,14}(消して|削除|いらない|不要|やめ|停止|止めて|もう通知|通知しない|オフ|直して|変えて|に変更|ずらして|のばして)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 紹介ログの訂正・削除 → mutate（新規 log_referral への誤倒し防止）。
  //   「やっぱり紹介してない」「さっきの紹介、二重に記録した・消して」「あれは頼んだじゃなく与えた」
  if (
    /紹介.{0,12}(消して|削除|してない|二重|間違え|取り消|取消|直して|訂正|じゃなく|ではなく)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 判断事例の訂正・削除 → mutate（新規 log_decision_case への誤倒し防止）。
  if (
    /(判断事例|事例ログ|判断ログ).{0,12}(消して|削除|いらない|不要|取り消|取消|直して|訂正|変えて|に変更)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 「会」（コミュニティ）の登録・人物紐付け → mutate。
  //   登録:「BNIを会に登録」「守成クラブ登録」 紐付け:「○○さんをBNIに追加」「△△さんはBNIの人」
  if (
    /(会|コミュニティ|交流会|勉強会|例会|サロン).{0,6}(に)?(登録|追加|紐付)/.test(trimmed) ||
    /さん.{0,10}(を|は).{0,10}(に追加|に紐付|の(会|メンバー|人))/.test(trimmed)
  ) {
    return "mutate";
  }

  // 案件・サービスの作成/改名/クローズ → mutate。
  if (
    /(案件|プロジェクト).{0,12}(立てて|作って|作成|新規|追加|改名|名前.{0,4}変えて|完了|受注|失注|進行中|提案|リード|終了|クローズ|に変更)/.test(trimmed) ||
    /(サービス|メニュー).{0,12}(作って|作成|追加|新規|改名|名前.{0,4}変えて)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 人物の統合・削除 → mutate。
  //   統合:「○○さんと△△さん同じ人、統合して／まとめて」 削除:「○○さん削除して／消して」
  if (
    /(同じ人|同一人物|重複).{0,12}(統合|まとめ|一つに|ひとつに|掃除|整理|消して)|人物.{0,6}(統合|まとめ)|統合して|重複.{0,6}(掃除|整理|まとめ)/.test(trimmed) ||
    /(さん|氏|様)?(を|は)?\s*(削除して|消して)/.test(trimmed)
  ) {
    return "mutate";
  }

  // 削除（体言止め・「を削除」・「削除お願い」含む）→ mutate。
  //   「くろちゃん\n削除」「オプチャの資料作成を削除」「○○のタスク削除して」
  //   「この案件削除お願い」など、削除系の語＋（任意の依頼語）で終わる場合に拾う。
  //   一覧を貼って末尾で消す指示も拾えるよう長さ上限は広めに取る（末尾アンカーで誤爆抑制）。
  //   どの対象を消すかは mutate 側の tool 選択（delete_person / delete_task / delete_project 等）に委ねる。
  //   ※ 否定（削除しないで）・疑問（削除できる？）は末尾が削除系で終わらないので拾わない。
  if (
    trimmed.length <= 200 &&
    /(削除|消去|消して|消す|けして)(して|しといて|しといて|してください|します|お願いします|お願い|おねがい|頼む|たのむ|よろしく|で|ね|よ)?[\s　。、.!！]*$/.test(
      trimmed,
    )
  ) {
    return "mutate";
  }

  // 人物の個人属性の登録（誕生日・生年月日・出身・業種・性別）→ mutate（update_person）。
  //   例:「石原さとし 誕生日 1995/06/22」「○○の生年月日は1990年3月3日」「△△ 出身 大阪」
  if (
    /(誕生日|生年月日|バースデー).{0,12}\d{1,4}\s*[\/年.\-]\s*\d{1,2}/.test(trimmed) ||
    /(出身|出生地|生まれ)(は|が|:|：|\s|　)/.test(trimmed) ||
    /(業種)(は|が|:|：|\s|　).{0,20}$/.test(trimmed)
  ) {
    return "mutate";
  }

  // 自然文での mutate（人物属性更新 / タスク追加・完了 / 会話ログ記録）の早期検知。
  // ファネル更新と被らない範囲で、明らかな書込み意図のパターンだけ拾う。
  // 紹介関係 / 関心ごと追加 / 関係性・温度感・重要度 / タスク追加・完了 / 会話ログ記録
  if (
    /(紹介(元|先)|紹介された|紹介してもら|紹介してくれ|紹介される|から紹介|を紹介|紹介を?(頼|依頼|お願い)|紹介しといた|紹介しときました|引き合わせ|繋い(で|だ)|つない(で|だ))/.test(trimmed) ||
    /(関心|興味)(に|として|として).{0,15}(追加|加え|入れ)/.test(trimmed) ||
    /(重要度|温度感|関係性|信頼度|信用度)[をはが].{0,10}(に|へ)/.test(trimmed) ||
    /(タスク|やること|TODO|todo)[にをへ].{0,10}追加/i.test(trimmed) ||
    // タスク作成・完了。末尾は口語の終助詞（よ/で/わ/ね/な/ぞ）・句読点・絵文字を許容。
    //   「MVV整理した資料の作成は完了したよ」のように「〜したよ」で終わると
    //   末尾固定マッチを外して query に倒れ、完了処理が発火しないのを防ぐ。
    /(.{1,40})(やる|やります|やった|やりました|終わった|終わりました|済んだ|済ませた|完了|完了した|完了しました|done)(よ|で|わ|ね|な|ぞ|もう|ました)?[\s。、.!！…ｗw]*$/i.test(
      trimmed,
    ) ||
    // 会話ログ系：「○○さんと話した」「○○と打合せ」「○○と電話」「○○とランチ」「○○に相談」など
    /(さん|氏|様|くん|ちゃん)?[とに](.{0,15})?(話した|話しした|話して|打合せ|打ち合わせ|ミーティング|電話[しを]|ランチ|食事|会食|お茶|飲み|会った|会いに|相談|伝え|連絡[しを])/.test(
      trimmed,
    ) ||
    // 判断事例ログ系：本人の判断・学び・気づき・対応を語る自然文
    //   「学びとして」「気づいた」「分かった」「判断した」「と思った」「対応した」
    //   「本当は」「本質的に」「原則として」など
    /(学び(として|だった|として)|気づい(た|て)|分かった|判断(した|として|は)|対応(した|して)|本(質的に|当は|当に)は|原則(として|は)|教訓|反省|今なら|次は)/.test(
      trimmed,
    )
  ) {
    return "mutate";
  }

  // プレフィックス無しの「タスクっぽいフレーズ」も作成に乗せる（query で案内だけして終わるのを防ぐ）。
  //   名詞止め（「○○の修正」「資料作成」）／動詞（「○○を送る」「藤野さんに連絡」）。
  //   疑問文（？で終わる）は除外、過去の完了文は上の完了パターンが既に拾う。
  if (
    !/[?？]\s*$/.test(trimmed) &&
    trimmed.length <= 60 &&
    /(の)?(修正|作成|対応|確認|準備|連絡|送付|提出|発注|申請|更新|設定|整理|見直し|チェック|フォロー|手配|予約|まとめ|作成しておく)[\s。、!！…]*$|(を|に)[^。\n]{0,30}(送る|おくる|作る|つくる|出す|返す|直す|まとめる|手配する|予約する|確認する|連絡する|準備する)[\s。、!！…]*$/.test(
      trimmed,
    )
  ) {
    return "mutate";
  }

  // 短いメッセージは会話扱い
  if (trimmed.length < 25) return "query";

  // AI fallback（曖昧な長文）
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `次のテキストを分類してください。JSON: { "intent": "transcript" | "businessCard" | "reminder" | "reflection" | "remark" | "pipelineUpdate" | "mutate" | "query" }

- transcript: 会議の議事録・面談記録（参加者と話した内容、決定、ToDoが含まれる）
- businessCard: 名刺の文字情報（氏名・会社・役職・メール・電話の羅列）
- reminder: 後で思い出したい予定。締切（「○日までに」）／**未来のアポ・予定（「○○さんと金曜に会う」「来週打ち合わせ」など、まだ起きていない会う約束）**／記念日・特定日（誕生日・周年・サービス開始◯ヶ月・毎年/毎月）を覚えさせる依頼。※「○○さんと会った／打合せした」のような既に起きた過去の記録は mutate（会話ログ）であって reminder ではない。※**既に存在するタスクの期限を変える依頼（「これの期限を明日にのばせる？」「○○を来週にずらして」「リスケ」）は mutate（期限変更）であって reminder ではない**（新しいリマインドを作るのではなく既存タスクの期限を更新する）
- reflection: 1日や数日の振り返り・日報・気づきまとめ
- remark: 特定人物への短い気づき・観察メモ（「○○さんは〜」型の1〜2文）
- pipelineUpdate: 営業ファネルの状態更新（「〇〇さんにサロン提案した」「〇〇さんがアプリ受注した 30万」等の短文・状態通知）
- mutate: データ書き換えを直接指示している短文。下記いずれか：
    * 人物属性の追加更新（例:「田中さんの紹介元は山田さん」「○○の関心に新規開拓追加」）
    * タスク作成・完了（例:「○○やる」「○○終わった」）
    * 既存タスクの期限変更・リスケ（例:「○○を明日に」「△△の期限を来週まで延ばして」「□□リスケ」）
    * 既存タスクの期限を外す＝期限なしで残す（例:「○○の期限外して」「締切なしにして」。完了でも削除でもない）
    * 完了タスクの再オープン（例:「○○やっぱりまだ終わってない」「完了取り消して」「再開」）
    * タスクの優先度変更（例:「○○優先度上げて」「緊急で」「最優先」）
    * タスク名の修正（例:「○○の件、△△に直して」「名前を××に変えて」）
    * 削除タスクの復元（例:「○○戻して」「△△復元して」）
    * 直前操作の取り消し（例:「さっきの取り消して」「間違えた」「今のなし」「元に戻して」）
    * 会話ログ記録（例:「○○さんと打合せ：…」）
    * 既存の会話ログの訂正・削除（例:「さっきの会話、相手は△△さん」「あの記録の要約直して」「さっきの会話記録消して」）
    * 既存の日付リマインド（記念日・誕生日等）の変更・停止・削除（例:「○○の誕生日3/30に直して」「この毎月のやめて／もう通知しないで」「記念日もういらない」）
    * 既存の紹介ログの訂正・削除（例:「あれは頼んだじゃなく与えた」「やっぱり紹介してない・消して」「二重に記録した」）
    * 既存の判断事例の訂正・削除（例:「さっきの判断事例の学び直して」「あの判断事例消して」）
    * 案件・サービスの作成/改名/クローズ（例:「○○案件立てて」「△△案件を完了にして」「□□サービス作って」）
    * 人物の統合・削除・重複掃除（例:「○○さんと△△さん同じ人、統合して」「○○さん削除して」「○○の重複をまとめて」「重複を全部掃除して」）
    * 「会」（BNI/守成クラブ/テツジン会等のコミュニティ）の登録・人物紐付け（例:「BNIを会に登録」「○○さんをBNIに追加」「△△さんはBNIの人」）
    * 判断事例ログ（例:「今日◯◯あって、こう判断した。学びは…」「本質は××と思って△△した。前向きになった」）
- query: 質問・相談・依頼・雑談・「どうやって○○する？」「○○できる？」など使い方/機能の問い合わせ`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const valid: Intent[] = [
      "transcript",
      "businessCard",
      "reminder",
      "reflection",
      "remark",
      "pipelineUpdate",
      "mutate",
      "query",
    ];
    return valid.includes(parsed.intent) ? parsed.intent : "query";
  } catch {
    return "query";
  }
}

// =============================================
// ヘルプ
// =============================================

function handleHelp(): string {
  return `利用できるコマンド：

📝 議事録: → 会議の議事録を保存
   例: 議事録: 山口さんとの面談
       [内容]
   ※ 複数会議を1メッセージにまとめて投げてもOK
     （# タイトル ヘッダーで分割）
   ※ 本文にURLがあれば中身を自動取得して要約を議事録に統合します

🎴 名刺: → 会った人をPeopleに登録（口語メモでOK）
   例: 名刺: 山田太郎 株式会社ABC 03-1234-5678
       名刺: 宮下桃子 スーツ屋さん、テツジン会で会った
       名刺: 足立麻衣 勉強会で会った、お酒好き、天満で飲む約束

📁 案件: → 案件を作成（日付・来る人も一緒に登録）
   例: 案件: 7/3 紹介セミナー、くろちゃんとれんげちゃんが来る
       案件: 8月 みやこ不動産アプリ提案 田中さん
   ※ 出会い・仕事・関心・約束まで拾って人物に保存します

🔔 リマインド: → 後で思い出したいことを登録（締切/記念日をAIが判別）
   例: リマインド: 6/10までに請求書送る        … 期限管理に登録
       リマインド: 田中さん誕生日 3/29 毎年      … 日付管理に登録
       リマインド: ○○社 サービス開始 5/1、3ヶ月と6ヶ月で … 節目で通知
   ※「覚えといて:」「思い出して:」でも同じです
   ※ 前日19時の夜の配信で「明日その日が来ます」と通知します

💭 振り返り: → 日々の振り返りを「日付ごとに1ノート」で保存
   例: 振り返り:
       ## 2026-05-01
       [今日の気づき・出来事・心情を自由記述]
   ※ 複数日まとめてもOK（## YYYY-MM-DD ヘッダーで分割）
   ※ 1日 = 1ノート（本文＋AI要約）として保存
   ※ 「明日やる」系の具体アクションはActionノートに切り出し
   ※ AIがその日の「核」を最大2件まで Decision/Hypothesis/Learning として独立保存（後で月次集計に使う）

📌 備考: → 人物メモ・短い気づきを残す
   例: 備考: 田中さん 新規より既存に愛着強い
   ※ 中身に名前があれば自動で人物に紐づけ

📈 ファネル更新: → 営業の状態を更新（プレフィックス不要）
   例: 山口さんにサロン提案した
       田中さんがアプリ受注した 30万
       鈴木さん商談した
   ※ 提案/参加/商談/受注 を検知して People の日付列を更新

✏️ 人物・タスク 自然文更新（プレフィックス不要）
   例: 田中さんの紹介元は山田さん
       山口さんの関心に新規開拓追加
       佐藤さんの温度感を高に
       資料の準備やる（明日まで）
       金曜の請求書送付 完了
   ※ 人物属性（紹介元 / 関心 / 関係性 / 重要度 / 温度感 / 信頼度 / 次のアクション 等）
     とタスクの作成・完了をAIが判定して反映

🗣️ 会話ログ（プレフィックス不要）
   例: 田中さんと旅費規定の話をした
       石橋さんと打合せ、共同開発の話
       山口さんと電話、来週会うことに
       穴見さんと佐藤さんとランチ、紹介の話
   ※ 「○○と話した」「○○と打合せ」「○○と電話」「○○とランチ」など自然文でOK
   ※ 複数人を書けば全員にリンクされる
   ※ 同名複数のときは候補が返るのでフルネームで再送

🤝 紹介ログ（プレフィックス不要）
   例: 山口さんに紹介を頼んだ           … 「頼んだ」を記録
       穴見さんを佐藤さんに紹介した       … 「与えた」を記録
   ※ 紹介は「頼んだ数 × 与えた数」で増える。その行動を記録します
   ※ 「今週の紹介KPI」と聞くと 頼んだ/与えた/生まれた を集計して返します

📋 タスク照会
   例: 今のタスク / 未完タスク / TODOは？
   ※ ai_clone_task の未完件を一覧で返す

🔗 紹介連携 オン/オフ → 紹介相談で、自分の紹介設計(ワークシート)を踏まえるか切替
   例: 紹介連携オン / 紹介連携オフ
   ※ オンにすると紹介の相談に、あなたの紹介設計（USP・ボトルネック等）を踏まえて答えます

❓ ヘルプ：このコマンド一覧を表示
   例: ヘルプ / ? / コマンド

その他のメッセージはそのまま質問・相談として答えます。`;
}

// =============================================
// Mutate モード（人物属性更新・タスク作成完了 等を tool calling で実行）
// =============================================

async function handleMutate(
  client: OpenAI,
  tenantId: string,
  userMessage: string,
  externalUserId?: string,
  channel?: ChatChannel,
  history: ChatHistoryMessage[] = [],
): Promise<string> {
  const result = await dispatchMutateTools(client, tenantId, userMessage, {
    externalUserId,
    channel,
  });
  if (!result.executed) {
    // ツールが選ばれなかった = mutate ではなく query 扱いにフォールバック
    return await handleQuery(client, tenantId, userMessage, history);
  }

  const reports = result.reports;
  if (reports.length === 0) {
    return "更新を試みましたが、何も反映されませんでした。もう少し具体的に書いてください。";
  }

  const lines: string[] = [];
  const okCount = reports.filter((r) => r.ok).length;
  const ngCount = reports.length - okCount;

  if (ngCount === 0) {
    lines.push(`✅ ${okCount}件 反映しました`);
  } else if (okCount === 0) {
    lines.push(`⚠️ 反映できませんでした（${ngCount}件）`);
  } else {
    lines.push(`✅ ${okCount}件反映 / ⚠️ ${ngCount}件失敗`);
  }
  for (const r of reports) {
    lines.push(`${r.ok ? "・" : "✗"} ${r.summary}`);
  }
  if (result.aiNote) {
    lines.push("");
    lines.push(result.aiNote);
  }
  return lines.join("\n");
}

// =============================================
// 会話モード
// =============================================

async function handleQuery(
  client: OpenAI,
  tenantId: string,
  userMessage: string,
  history: ChatHistoryMessage[] = [],
): Promise<string> {
  // ユーザーの質問に登場する人物名を抽出（「山口さん」「田中氏」「鈴木様」等）
  const personNames = extractPersonNames(userMessage);

  // テナントに紐付いた Google Calendar ID を解決（未連携時は env フォールバック）
  const calendarId = (await getTenantPrimaryCalendarId(tenantId)) ?? undefined;
  const calendarConfigured = !!(calendarId || process.env.GOOGLE_CALENDAR_ID);
  // カレンダー取得が「空」だったのか「失敗」だったのかを区別する。失敗を「予定なし」と
  // 言い切らせないため（未共有・ID誤りで AI が堂々と「予定ありません」と嘘をつくのを防ぐ）。
  let calendarFetchFailed = false;
  const guardCalendar = (p: Promise<CalendarEvent[]>) =>
    p.catch((e) => {
      calendarFetchFailed = true;
      console.error("[ai-clone] reply時カレンダー取得失敗:", (e as Error)?.message || e);
      return [] as CalendarEvent[];
    });

  // 並列取得：経営コンテキスト / 今日の予定 / 今後7日の予定 / 該当人物の蓄積 / 未完タスク
  //          / 採択済み persona_trait（本人の観察された傾向）
  const [
    context, todayEvents, upcomingEvents, personDigests, openTasks,
    adoptedPersonaTraits, referralWorksheet,
  ] = await Promise.all([
    fetchExecutiveContext(tenantId),
    guardCalendar(fetchTodayEvents(calendarId)),
    guardCalendar(fetchUpcomingEvents(7, calendarId)),
    Promise.all(personNames.map((name) => buildPersonDigest(tenantId, name))),
    findOpenTasks(tenantId, 20).catch(() => []),
    fetchAdoptedPersonaTraits(tenantId).catch(
      () => ({}) as Record<string, { trait: string; detail: string | null }[]>,
    ),
    fetchReferralWorksheetText(tenantId).catch(() => ""),
  ]);

  // 予定が無いときの注記：本当に空なのか / 未連携なのか / 取得失敗なのかを書き分ける。
  // AI が「予定ありません」と断定して嘘をつかないようにするため。
  const emptyCalendarNote = calendarFetchFailed
    ? "（カレンダー取得に失敗。連携の共有設定・カレンダーIDを確認してください。予定の有無は断定しない）"
    : !calendarConfigured
      ? "（Googleカレンダー未連携。予定の有無は分かりません。設定画面で連携を案内する）"
      : null;

  const todayList = todayEvents.length
    ? todayEvents
        .map(
          (e) =>
            `- ${formatTime(e.start)} ${e.summary}${e.location ? `（${e.location}）` : ""}`,
        )
        .join("\n")
    : emptyCalendarNote ?? "（今日の予定なし）";

  // 未来予定：今日の終わり以降のものだけ拾う（既に終わった本日分は除外）
  const nowMs = Date.now();
  const futureEvents = upcomingEvents.filter((e) => {
    const t = new Date(e.start).getTime();
    return Number.isFinite(t) && t > nowMs;
  });
  const upcomingList = futureEvents.length
    ? futureEvents
        .slice(0, 10)
        .map((e) => `- ${formatDateTime(e.start)} ${e.summary}`)
        .join("\n")
    : emptyCalendarNote ?? "（今後1週間の予定なし）";

  // 人物別の蓄積情報
  const personSection = personDigests
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => {
      // 基本情報（誕生日・会社・重要度など）。同名複数なら全員分を個別に列挙する
      // （誕生日は人によって違うため。「○○さんの誕生日教えて」にここで答えられる）。
      const profileBlock = d.profiles.length
        ? d.profiles
            .map((p) => {
              const parts: string[] = [];
              if (p.companyHint) parts.push(p.companyHint);
              if (p.birthday)
                parts.push(
                  `誕生日 ${p.birthday}${p.birthHour != null ? ` ${p.birthHour}時頃` : ""}`,
                );
              if (p.birthplace) parts.push(`出身 ${p.birthplace}`);
              if (p.importance) parts.push(`重要度 ${p.importance}`);
              if (p.temperature) parts.push(`温度感 ${p.temperature}`);
              if (p.metContext) parts.push(`出会い ${p.metContext}`);
              return `- ${p.name}${parts.length ? `：${parts.join(" / ")}` : "（属性未登録）"}`;
            })
            .join("\n")
        : "";

      const meetingsBlock = d.conversationLogs.length
        ? d.conversationLogs
            .map((l) => {
              const head = `- ${l.occurredAt ? l.occurredAt.slice(0, 10) : "日付不明"}：${l.summary}`;
              const body = l.content
                ? `\n  内容：${truncate(l.content, 400)}`
                : "";
              const next = l.nextAction
                ? `\n  次：${truncate(l.nextAction, 200)}`
                : "";
              return head + body + next;
            })
            .join("\n")
        : "（過去の会話記録なし）";

      const notesBlock = d.notes.length
        ? d.notes
            .map(
              (n) =>
                `- [${n.kind}] ${n.date || "日付不明"} ${n.title}${
                  n.content ? `：${truncate(n.content, 200)}` : ""
                }`,
            )
            .join("\n")
        : "（紐付くNotesなし）";

      return `## ${d.label}
### 基本情報
${profileBlock || "（属性未登録）"}

### 過去のミーティング
${meetingsBlock}

### 関連Notes（Decision/Hypothesis/Action/Learning/Event）
${notesBlock}`;
    })
    .join("\n\n");

  // 採択済み persona_trait のセクション。category 別に bullet で並べる。
  // ユーザーが /clone/<slug>/core-os/persona-traits で「採択」した傾向だけが
  // 反映されるので、応答時の人格付けに使う材料はここに集約される。
  const personaTraitsSection = (() => {
    const categories = Object.keys(adoptedPersonaTraits);
    if (categories.length === 0) return "";
    const blocks = categories.map((cat) => {
      const lines = adoptedPersonaTraits[cat]
        .map((t) => {
          const head = `- ${t.trait}`;
          return t.detail ? `${head}\n  （${t.detail}）` : head;
        })
        .join("\n");
      return `### ${cat}\n${lines}`;
    });
    return blocks.join("\n\n");
  })();

  // 未完タスクセクション（"今のタスク"/"TODO"系を聞かれたときに使う最重要セクション）
  const openTaskList = openTasks.length
    ? openTasks
        .slice(0, 20)
        .map((t) => {
          const head = `- ${t.name}`;
          const meta: string[] = [];
          if (t.status) meta.push(t.status);
          if (t.priority) meta.push(`優先度:${t.priority}`);
          if (t.dueDate) meta.push(`期限:${t.dueDate}`);
          const tail = meta.length > 0 ? `（${meta.join(" / ")}）` : "";
          return head + tail;
        })
        .join("\n")
    : "（未完タスクなし）";

  const systemPrompt = `あなたはユーザー本人の経営判断を補佐する「Executive AI Clone」です。
返答は端的で、ユーザーの判断軸に沿って助言してください。
重要KPI・ミッション・判断基準は下記「経営コンテキスト」から読み取ってください。
口調は落ち着いた相棒トーン。絵文字は使わない。長くなる場合は箇条書きで。
人物に言及するときは名前に「さん」を付ける（例「井上ともよしさん」「黒川さん」）。ただし
①ニックネーム（◯◯ちゃん／◯◯くん）はそのまま付けない（「くろちゃんさん」はNG）
②既に敬称・肩書きが付いている場合（◯◯社長／◯◯先生／◯◯様 等）は二重に付けない
③会社名・サービス名・本人（このユーザー自身）には付けない。
データ上の名前は敬称なしで保存されているが、表示・会話では上記ルールで「さん」を補う。
返信は Slack や LINE にそのまま送られます。**（太字）や #（見出し）などの Markdown 記法は使わないこと。記号がそのまま表示されて読みにくくなります。強調は記号で囲まず、言葉で伝えること。箇条書きは「・」や「1.」で書く。

# あなたができる書き込み操作（聞かれたら案内する。自然文1メッセージで自動発火）
- 人物の属性更新：「〇〇さんの紹介元は△△さん」「○○の関心に新規開拓を追加」「○○の温度感を熱いに」など
- タスク作成：「◯◯やる」「△△を来週までに」など
- タスク完了：「○○終わった」「△△完了」など
- 会話ログ記録：「○○さんと打合せ：旅費規定の話。次回見積出す」「△△と電話、来週ランチ」など
- 紹介ログ記録：「○○さんに紹介を頼んだ」（頼んだ）／「○○さんを△△さんに紹介した」（与えた）。紹介KPIの母数になる
- 判断事例ログ：「今日◯◯あって、こう判断した。結果△△、学びは□□」のように、本人の判断・対応・結果・学びが入った自然文を送ると、Web の「判断基準 > 事例ログ」に仮登録される（その後 Web で「確認する」を押すと正本化）

「どうやって○○を入れる？」「○○できる？」と聞かれたら、上記の中から該当する操作を 1〜2 行で案内し、具体例文を 1 つ示すこと。実在しない機能を勝手に発明しないこと。

# 機能外の依頼への対応（一般論で埋めない）
- 本AIにできない操作（例：紹介ワークシートを対話で磨く・項目を書き換える）を頼まれたら、汎用ノウハウの箇条書きを並べてはいけない。できる場所を1〜2行で案内する：「紹介設計を磨くのは「紹介設計」ページの各項目『コーチと磨く』でできます → https://gia2018.com/members/app/worksheet」。
- どんな相談でも、教科書的な一般論リストでお茶を濁さない。必ず本人の経営コンテキスト・人物・タスク・紹介設計の実データに紐づけて具体的に答える。データが無ければ正直に「まだ記録がない」と言い、憶測の一般論で埋めない。

# 過去データの参照（search_* tools）
- 過去の会話・タスク・人物・判断事例について聞かれたら、関連する search_* ツールを呼んで実データを引っ張る。
  * 「○○について話したやつ教えて」「Aさんと最近何話した」→ search_conversations
  * 「期限切れタスク」「○○系のタスク残ってる？」→ search_tasks
  * 「○○系の業界の人」「重要度Sの人」「○○さんから紹介された人」→ search_people
  * 「過去に似た判断あった？」「同じような相談、前にどう対応した？」→ search_decision_cases
  * 「今週の紹介どれくらい？」「紹介KPI」「何件紹介頼んだ？」→ get_referral_kpi（頼んだ/与えた/生まれた を返す。上2つが0なら「今週まだ頼んでない」と率直に促す）
  * 「今日(明日)何したらいい？」「今日やるべきことは？」「明日の段取りは？」→ get_action_plan（day=today/tomorrow）。右腕AIの看板。必ずこれを呼んで実データで提案する。
  * 「BNIの人一覧」「守成クラブで会った人」「テツジン会のメンバー誰がいる？」→ list_community_members（会＝コミュニティに紐づく人物一覧）。
  * 「案件だして」「案件一覧」「今の案件は？」「進行中の案件」「○○の案件ある？」→ list_projects（登録済み案件の一覧。新規作成ではない）。一覧をそのまま返し、勝手に「何を登録する？」と聞き返さない。
  * 「30日（◯日／◯ヶ月）以上やりとりしてない人」「しばらく連絡してない人」「ご無沙汰の相手」→ list_silent_people（days に日数。実際の最終接触日で絞る）。
    これは search_people（次のアクションが残ってる人）とは別物。接触日で聞かれたら必ず list_silent_people を使い、最近やりとりした人を含めない。
- get_action_plan の使い方（オンデマンドの能動提案。LINE/Slack どちらでも。これは右腕AIの看板＝Slackの夜配信と同じ中身をその場で返す機能）：
  * 【最重要・網羅性】返ってきたフィールドのうち**中身があるものは、簡潔さを理由に省略してはいけない**。
    毎回ほぼ同じ並びで「セクション見出し＋短い箇条書き」にして、内容のあるセクションは全部出す（LINEでも読める長さに各行は短く）。
    順番は固定：①まず1件（quickWin）→②売上行動（salesActions）→③期限（dueTasks）→④果たせていない約束（openPromises）→⑤記念日（anniversaries）→⑥棚卸し（staleTaskCount）。
  * ① quickWin があれば冒頭で「まずこの1件だけ片付けましょう：◯◯」と背中を押す（溜まる前に処理）。
  * ② salesActions は「🎯 やるべき売上行動」見出しで各件 “誰に何を／なぜ今か(reason)” を1行ずつ。最大3件。経営コンテキストのKPI・判断基準に紐づけて根拠を一言添える。
  * ③ dueTasks は「🔔 期限」見出しで、overdueDays>0 は「⚠️ ◯日超過」を付ける。優先度があれば添える。
  * ④ openPromises があれば「📌 果たせていない約束」見出しで「○○さんへの『△△』、その後どうなっていますか？」と必ず思い出させる。滞っていそうなら率直に促す。
    この約束は会話ログの『次のアクション』が元。ユーザーが「もう話した／対応した／済んだ／議事録に入れた」と返したら complete_task を呼んで閉じる
    （task_query に相手の名前か約束内容を入れる。タスクが無くても会話の約束をクローズする）。「タスクが見つかりません」で突き放さない。
  * ⑤ anniversaries があれば「🎂 記念日・節目」で出す。
  * ⑥ staleTaskCount が多いときは個別に羅列せず「🗂️ 期限切れが◯件たまっています、やる・リスケ・やめるを1件ずつ」と1行で促す（鳴らし続けない）。
  * 全セクションが空＝候補が薄い日は正直に「今日は掘り起こし候補が少ないので、新規接点づくり・種まきに使える日です」と伝える。嘘の用事を作らない。
  * このリストは「今のアクション」を1つに束ねたもの（タスクも約束も同じ場所）。各項目は、本人が「○○もう済んだ／対応した／やった」と言えば complete_task で閉じられる。締めで「終わったものは『○○済んだ』と言えば消せます」と一言添える。
  * 締めに加えて「各件の連絡文の下書きも作れます。『○○さんの下書き』と言ってください」と案内する（下書きはこの場では自動生成しない＝速度優先のため、本人が望んだら相手名で search_conversations を引いて自然な連絡文を提案する）。
- **「Aさんと何を話したか」のように人物が主語の会話検索では、search_conversations の person_name にその名前を入れる（query には入れない）。会話本文に名前が載っていないことが多く、キーワード検索だと取りこぼすため。**
- 「関連人物の蓄積情報」セクションに既にその人物の会話が載っている場合は、ツールを呼ばずそれを使ってよい。逆にツールが「該当なし」でも、このセクションに情報があればそちらを正とする。
- 一般論で答えず、検索結果に基づいて具体的に答える。本当にどこにも無い時だけ「該当なし」と言う（嘘を作らない）。
- **【厳守】この応答経路は記録・保存・登録・更新・削除を一切行えない（読み取り専用）。** だから「記録しました」「保存しました」「登録しました」「タスクに追加しました」等、実際にやっていない書き込みを完了したかのように言ってはいけない。ユーザーが何かを記録・登録したそうな発話（「○○さんに紹介してもらうことになった」「○○の件メモして」等）をしたのに、ここで保存処理が走っていない場合は、保存できたフリをせず「まだ保存していません。記録するには『○○さんと□□：…』のように送ってください」と正直に促す（または会話ログ/タスク/紹介ログ等のどの形で残すかを1行で案内する）。やってもいない反映を報告するのは厳禁。
- **過去の会話・人物・打ち合わせ・議事録について聞かれたら、まず search_* を必ず1回は呼ぶこと。一度も検索せずに「記録に残っていません」「ありません」と答えてはならない。** 人物が主語なら person_name、話題（みやこ不動産企画 等）なら query を使う。
- **直前のやり取り（この会話の履歴）を必ず踏まえる。** 「さっきの人」「あるよ」「その件」「○○さん（直前に出た人）」などは履歴から対象を特定する。**履歴にも検索結果にも出ていない人物名を、推測で作って答えてはならない**（実在の別人と取り違える原因になる）。直前の話題の人物が誰か曖昧なら、その名前で search_conversations を呼んで確かめる。
- 「今日」「今週」「過去30日」などの相対表現は日付に絶対化してから引数に渡す。

ユーザーの質問に特定の人物名が含まれている場合は、必ず下記「関連人物の蓄積情報」を最優先で参照し、
過去のミーティング内容・Notesを踏まえて具体的に答えてください。一般論のテンプレ回答は禁止。

紹介・関係性・人物との接点に関する相談が来た場合は、下記「紹介ノウハウ（GIA 方法論）」の
枠組み（ボトルネック診断5問 / 紹介5条件 / 仕組み化4レイヤー）に沿って答えてください。
このとき、下記「あなたの紹介設計」セクションがあれば、汎用論より本人が記入した紹介設計を最優先で踏まえ、
本人の言葉・USP・ボトルネック・今月のアクションに紐づけて具体的に助言してください。

**特定の人物（「○○さんから紹介をもらうには？」等）についての相談では、5条件の一般論を並べるだけで終わらせないこと。**
その人物の「関連人物の蓄積情報」（基本情報・過去の会話ログ・温度感・関係性）を必ず読み、その人との具体的な経緯に紐づけて
「次にこの人へ何を言う/送る/会う」のレベルまで具体化する。会話ログが薄ければ search_conversations を person_name で引いてから答える。
過去にやり取りがあるのに『一般論のステップ』だけ返すのは禁止（記憶している右腕として、その人との実際の経緯を踏まえる）。
同名が複数いる場合は、記録のある人を優先しつつ「どちらの○○さんですか」と必要なら確認する。

「タスク一覧」「未完タスク（を全部）」「TODO一覧」「登録してるタスク見せて」のように “登録済みの一覧をそのまま確認したい” 場合だけは、
「未完タスク一覧」セクションをそのまま番号付きで返してください。優先度・期限がついているものを先に。ここでは一般論や提案は混ぜないこと。
ただし「今日やることある？」「今日/明日 何やる？」「今日なにあったっけ？」のように “その日の動き” を聞かれた場合は、
これは一覧の読み上げではなく能動提案なので、必ず get_action_plan を呼んで上記の網羅フォーマットで返すこと（プレーンなタスク一覧で済ませない）。

ただし「何を優先すべき？」「今どう動くべき？」「何からやる？」「今日は何をやろう」のように “判断・優先順位づけ” を
求められたときは、タスクの登録優先度をそのまま読み上げてはいけません。必ず下記「経営コンテキスト」の
KPI・判断基準・3年計画・ミッションに照らして並べ替え、各タスクに「なぜ今これか（どのKPI・判断基準に効くか）」を
一言添えてください。判断の根拠は本人の言葉（経営コンテキストの中身）で示すこと。
さらに、未完タスクの中に KPI（特に売上）に直結する動きが見当たらない場合は、それを率直に指摘し、
判断基準に沿った「次の一手」を提案してください（記憶している右腕として、本人が忘れている売上・接点・放置案件の
掘り起こしを促す）。タスク一覧の機械的な読み上げで終わらせないこと。

【予定とやることは別物】「予定」「スケジュール」「カレンダー」「アポ」を聞かれたら、それは “カレンダーの質問” です。
「今日の予定」「今後1週間の予定」セクション（＝Googleカレンダー）だけを根拠に答えてください。
このとき get_action_plan（やること・売上行動・タスク・約束）で代用・埋め合わせをしてはいけません。
カレンダーに該当がなければ「カレンダー上は予定なし」と答え、勝手にタスクや約束の話にすり替えない。
逆に「やること」「何したらいい」「段取り」は get_action_plan です（予定ではない）。両者を混同しないこと。
「次回」「次の予定」を聞かれたときは、「今後1週間の予定」セクションから今より後の最も近い予定を答えてください。
今日の終わったミーティングを「次回」と呼ばないでください。
予定のセクションに「未連携」「取得に失敗」という注記がある場合は、予定が無いと断定してはいけません。
「カレンダーがまだ連携できていない（または読み取れていない）ので予定を確認できない」と正直に伝え、
設定画面でのGoogleカレンダー連携（共有設定とカレンダーIDの確認）を案内してください（タスクや約束で埋め合わせない）。

# 経営コンテキスト
${context}
${personaTraitsSection ? `\n# あなたの傾向（観察された本人のクセ。応答のトーンや判断のクセに反映してよい）\n${personaTraitsSection}\n` : ""}
${REFERRAL_KNOWLEDGE}
${referralWorksheet ? `\n# あなたの紹介設計（本人が紹介コーチのワークシートに記入したもの。紹介相談ではこれを最優先で踏まえる）\n${referralWorksheet}\n` : ""}

# 今日の予定（既に終わった分も含む）
${todayList}

# 今後1週間の予定（現在時刻より後のもの）
${upcomingList}

# 未完タスク一覧（ai_clone_task より、最大20件）
${openTaskList}
${personSection ? `\n# 関連人物の蓄積情報\n${personSection}\n` : ""}`;

  // tool calling 対応：AI が search_* を呼びたければ呼ぶ → 結果を context に
  // 追加 → 最終応答生成、の2段階パターン。tool call が無ければ 1 回で終わる。
  // 直前の会話履歴を system と現在の発話の間に積む（長文の貼り付けは要約用に切り詰め）。
  const historyMessages: ChatCompletionMessageParam[] = history.map((h) =>
    h.role === "assistant"
      ? { role: "assistant", content: truncate(h.content, 800) }
      : { role: "user", content: truncate(h.content, 800) },
  );
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: userMessage },
  ];

  try {
    // Step 1：tools 渡しで初回呼び出し。AI が必要と判断したら tool_calls を返す。
    // mini は tool_choice="auto" で検索を渋り「ない」と即答しがちだったため、
    // 過去データ参照の判断が要るこの経路だけ gpt-4o に上げて検索発火の信頼性を確保する。
    const res1 = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: aiCloneReadTools,
      tool_choice: "auto",
      max_tokens: 800,
    });
    const msg1 = res1.choices[0]?.message;
    if (!msg1) return "（応答なし）";

    // tool_calls が無ければそのまま返す（通常の query）
    if (!msg1.tool_calls || msg1.tool_calls.length === 0) {
      return msg1.content?.trim() || "（応答なし）";
    }

    // Step 2：tool_calls を実行 → 結果を messages に append → 最終応答生成
    messages.push({
      role: "assistant",
      content: msg1.content ?? "",
      tool_calls: msg1.tool_calls,
    });

    const toolResults = await Promise.all(
      msg1.tool_calls.map(async (tc) => {
        if (tc.type !== "function") {
          return { tool_call_id: tc.id, name: "unknown", result: null };
        }
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || "{}");
        } catch (e) {
          console.error("[ai-clone] tool args parse 失敗:", e);
        }
        const result = await executeReadTool(tc.function.name, parsedArgs, {
          tenantId,
        });
        return {
          tool_call_id: tc.id,
          name: tc.function.name,
          result,
        };
      }),
    );

    for (const tr of toolResults) {
      messages.push({
        role: "tool",
        tool_call_id: tr.tool_call_id,
        content: JSON.stringify(tr.result),
      });
    }

    const res2 = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 800,
      // 2回目では tools を渡さない（無限ループ防止 & 確実に最終応答に集中させる）
    });
    return res2.choices[0]?.message?.content?.trim() || "（応答なし）";
  } catch (err) {
    console.error("[ai-clone] 応答生成失敗:", err);
    return "（応答生成中にエラーが起きました）";
  }
}

// ───────────────────────────────────────────────
// 人物検索ユーティリティ（handleQuery 用）
// ───────────────────────────────────────────────

// 「〇〇さん」「〇〇氏」「〇〇様」等を userMessage から抽出
function extractPersonNames(text: string): string[] {
  const pattern = /([一-龠ぁ-んァ-ヴー々a-zA-Z]+)(さん|氏|様|くん|ちゃん)/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const base = m[1];
    if (base.length >= 2) found.add(base);
  }
  return Array.from(found);
}

// 1人物名 → person を引いて ConversationLogs + Notes を集約
async function buildPersonDigest(
  tenantId: string,
  name: string,
): Promise<{
  label: string;
  profiles: Array<{
    name: string;
    companyHint: string;
    birthday: string | null;
    birthHour: number | null;
    birthplace: string | null;
    importance: string | null;
    temperature: string | null;
    metContext: string | null;
  }>;
  conversationLogs: Awaited<ReturnType<typeof fetchRecentConversationLogsForPerson>>;
  notes: Awaited<ReturnType<typeof fetchRecentNotesForPerson>>;
} | null> {
  const candidates = await searchPeopleByName(tenantId, name).catch(() => []);
  if (candidates.length === 0) return null;

  // 同姓・同名が複数いる場合、先頭1人だけ見ると「記録を持つ別人」を取りこぼす。
  // 例：「山崎」で 山崎啓子(ログ0件) を掴み、山崎誠の議事録を見逃して「記録なし」と誤答。
  // → 候補（最大5人）全員のログ・Notes・基本プロフィールを取得して統合する。
  const targets = candidates.slice(0, 5);
  const fetched = await Promise.all(
    targets.map(async (p) => ({
      candidate: p,
      profile: await fetchPersonProfile(tenantId, p.id).catch(() => null),
      logs: await fetchRecentConversationLogsForPerson(tenantId, p.id, 5).catch(
        () => [],
      ),
      notes: await fetchRecentNotesForPerson(tenantId, p.id, 10).catch(() => []),
    })),
  );

  // 基本プロフィール（誕生日・会社・重要度など）。同名複数なら全員分を個別に残す
  // （誕生日は人によって違うので統合せず、候補ごとに出して AI が答えられるようにする）。
  const profiles = fetched.map((f) => ({
    name: f.profile?.name || f.candidate.name,
    companyHint: f.candidate.companyHint || f.profile?.companyName || "",
    birthday: f.profile?.birthday ?? null,
    birthHour: f.profile?.birthHour ?? null,
    birthplace: f.profile?.birthplace ?? null,
    importance: f.profile?.importance ?? null,
    temperature: f.profile?.temperature ?? null,
    metContext: f.profile?.metContext ?? null,
  }));

  // 記録を持つ候補だけに絞れるなら絞る（空の同名を混ぜない）。全員空ならそのまま。
  const withRecords = fetched.filter(
    (f) => f.logs.length > 0 || f.notes.length > 0,
  );
  const used = withRecords.length > 0 ? withRecords : fetched;

  const conversationLogs = used
    .flatMap((f) => f.logs)
    .sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""))
    .slice(0, 5);
  const notes = used
    .flatMap((f) => f.notes)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 10);

  const label =
    candidates.length > 1
      ? `${name}さん（同名${candidates.length}人）`
      : `${name}さん`;

  return { label, profiles, conversationLogs, notes };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const j = new Date(d.getTime() + jstOffsetMs);
  const m = j.getUTCMonth() + 1;
  const day = j.getUTCDate();
  const hh = String(j.getUTCHours()).padStart(2, "0");
  const mm = String(j.getUTCMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

// ───────────────────────────────────────────────
// URL読み取り（handleTranscript 用）
// 議事録に貼られたURLを fetch → 簡易要約して本文に統合する
// ───────────────────────────────────────────────

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"'`)（）「」『』、。]+/g) || [];
  return Array.from(new Set(matches));
}

async function enrichTextWithUrlSummaries(
  client: OpenAI,
  text: string,
): Promise<string> {
  const urls = extractUrls(text);
  if (urls.length === 0) return text;

  // URL多すぎると遅くなる/コストかかるので最大5件まで
  const targets = urls.slice(0, 5);
  const summaries = await Promise.all(
    targets.map(async (url) => ({
      url,
      summary: await fetchAndSummarizeUrl(client, url),
    })),
  );
  const valid = summaries.filter(
    (s): s is { url: string; summary: string } => s.summary !== null,
  );
  if (valid.length === 0) return text;

  const block = valid
    .map((s) => `### ${s.url}\n${s.summary}`)
    .join("\n\n");

  return `${text}\n\n## 参考URL要約（自動取得）\n${block}`;
}

async function fetchAndSummarizeUrl(
  client: OpenAI,
  url: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AICloneFetcher/1.0; +https://gia2018.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ctype) && !ctype.startsWith("text/"))
      return null;

    const html = await res.text();

    // 簡易テキスト抽出
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    if (cleaned.length < 100) return null;

    const summary = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "次のWebページの内容を要約してください。形式：\n1. 一行サマリ（このページが何か）\n2. 事業内容・サービス・人物・連絡先など、後で人物プロフィールと突き合わせると役立つ情報を箇条書きで\n3. ToDoや行動の手がかりがあれば最後に。\n簡潔に、推測で書かない。記載がない項目は省略。",
        },
        { role: "user", content: `URL: ${url}\n\n${cleaned}` },
      ],
      max_tokens: 500,
    });

    return summary.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[ai-clone] URL読み取り失敗:", url, err);
    return null;
  }
}

// =============================================
// 議事録モード（複数会議対応）
// =============================================

interface MeetingItem {
  meetingTitle: string;
  date?: string;
  participants: { name: string }[];
  agenda?: string;
  summary: string;
  nextActions?: string;
  decisions: { content: string }[];
  hypotheses: { content: string }[];
  actions: { content: string }[];
  learnings: { content: string }[];
  events: { content: string }[];
}

async function handleTranscript(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  // 本文中にURLがあればその中身を取得して要約し、本文に統合してから抽出する
  const enrichedText = await enrichTextWithUrlSummaries(client, text);

  const meetings = await extractMeetings(client, enrichedText);
  if (!meetings || meetings.length === 0) {
    return "議事録として保存しようとしましたが、内容の抽出に失敗しました。";
  }

  // 全会議の参加者を一括解決して、曖昧があれば事前にまとめて警告
  const allNames = Array.from(
    new Set(meetings.flatMap((m) => m.participants.map((p) => p.name))),
  );
  const resolutions = await Promise.all(
    allNames.map(async (n) => ({
      name: n,
      result: await resolvePerson(tenantId, n),
    })),
  );
  const ambiguous = resolutions.filter((r) => r.result?.state === "ambiguous");
  if (ambiguous.length > 0) {
    return buildAmbiguousWarning(
      ambiguous.map((a) => ({
        query: a.name,
        candidates:
          a.result?.state === "ambiguous" ? a.result.candidates : [],
      })),
    );
  }

  // name → personId マップ作成
  const nameToId = new Map<string, { id: string; name: string; created: boolean }>();
  for (const r of resolutions) {
    if (r.result?.state === "single") {
      nameToId.set(r.name, {
        id: r.result.id,
        name: r.result.name,
        created: r.result.created,
      });
    }
  }

  // 各会議を保存
  const reports: string[] = [];
  for (const m of meetings) {
    const peopleIds = m.participants
      .map((p) => nameToId.get(p.name)?.id)
      .filter((id): id is string => !!id);

    const meetingDate = m.date || todayJST();

    // 同じ日に近い summary の ConversationLog があれば追記、無ければ新規作成。
    // 旧 ai_clone_meeting は 0030 で会話ログに統合済み（議題は本文の冒頭にマージ）。
    const existingShell = await findConversationLogByApproxSummaryAndDate(
      tenantId,
      m.meetingTitle,
      meetingDate,
    );
    const summaryWithAgenda =
      m.agenda && m.agenda.trim().length > 0
        ? `${m.meetingTitle}\n\n[議題]\n${m.agenda}`
        : m.meetingTitle;
    let meetingId: string | null = null;
    let appendedToShell = false;
    if (existingShell) {
      const ok = await appendConversationLog(tenantId, existingShell.id, {
        content: enrichedText,
        nextAction: m.nextActions,
        addPersonIds: peopleIds,
      });
      if (ok) {
        meetingId = existingShell.id;
        appendedToShell = true;
      }
    }
    if (!meetingId) {
      const created = await createConversationLog(tenantId, {
        summary: summaryWithAgenda,
        content: enrichedText,
        occurredAt: `${meetingDate}T12:00:00+09:00`,
        channel: "対面",
        nextAction: m.nextActions,
        personIds: peopleIds,
      });
      meetingId = created?.id || null;
    }
    const meeting = meetingId ? { id: meetingId } : null;

    const noteJobs: Promise<any>[] = [];
    const pushNotes = (
      kind: "Decision" | "Hypothesis" | "Action" | "Learning" | "Event",
      items: { content: string }[],
    ) => {
      for (const item of items) {
        noteJobs.push(
          createNote(tenantId, {
            title: item.content.slice(0, 60),
            date: m.date || todayJST(),
            kind,
            content: item.content,
            peopleIds,
          }),
        );
      }
    };
    pushNotes("Decision", m.decisions);
    pushNotes("Hypothesis", m.hypotheses);
    pushNotes("Action", m.actions);
    pushNotes("Learning", m.learnings);
    pushNotes("Event", m.events);
    await Promise.all(noteJobs);

    const participantNames = m.participants
      .map((p) => nameToId.get(p.name)?.name || p.name)
      .join(", ");
    const newlyCreatedNames = m.participants
      .map((p) => nameToId.get(p.name))
      .filter((p) => p?.created)
      .map((p) => p!.name);

    const lines: string[] = [];
    lines.push(`✅「${m.meetingTitle}」`);
    const meetingStatus = meeting?.id
      ? appendedToShell
        ? "1件（既存に追記）"
        : "1件（新規）"
      : "失敗";
    lines.push(`  会話ログ: ${meetingStatus}`);
    if (participantNames) lines.push(`  参加者: ${participantNames}`);
    if (newlyCreatedNames.length > 0) {
      lines.push(`    ↳ 新規作成: ${newlyCreatedNames.join(", ")}`);
    }
    if (m.nextActions) {
      lines.push(`  📌 次: ${m.nextActions}`);
    }
    reports.push(lines.join("\n"));
  }

  return `議事録を保存しました（${meetings.length}件）：\n\n${reports.join("\n\n")}`;
}

async function extractMeetings(
  client: OpenAI,
  text: string,
): Promise<MeetingItem[] | null> {
  const prompt = `以下の議事録から、会議ごとに分割して構造化抽出してください。
1メッセージに複数会議が含まれる場合があります（# タイトル等で区切られる）。
1会議だけなら配列に1要素入れてください。

# 議事録
${text}

# 出力JSON
{
  "meetings": [
    {
      "meetingTitle": "会議のタイトル（明示なければ参加者名や論点から命名）",
      "date": "YYYY-MM-DD or null",
      "participants": [{ "name": "氏名（自分は含めない）" }],
      "agenda": "議題1〜2行 or null",
      "summary": "要点を1段落",
      "nextActions": "ToDoの連結 or null",
      "decisions": [{ "content": "決定事項" }],
      "hypotheses": [{ "content": "仮説・検討中アイデア" }],
      "actions": [{ "content": "個別ToDo・依頼" }],
      "learnings": [{ "content": "学び・気づき" }],
      "events": [{ "content": "起きた事実・接触履歴" }]
    }
  ]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!Array.isArray(parsed.meetings)) return null;
    return parsed.meetings.map((m: any) => normalizeMeetingItem(m));
  } catch (err) {
    console.error("[ai-clone] 議事録抽出失敗:", err);
    return null;
  }
}

function normalizeMeetingItem(m: any): MeetingItem {
  return {
    meetingTitle: m.meetingTitle || "（タイトル未抽出）",
    date: m.date || undefined,
    participants: Array.isArray(m.participants)
      ? m.participants.filter((p: any) => p?.name)
      : [],
    agenda: m.agenda || undefined,
    summary: m.summary || "",
    nextActions: m.nextActions || undefined,
    decisions: ensureContentArray(m.decisions),
    hypotheses: ensureContentArray(m.hypotheses),
    actions: ensureContentArray(m.actions),
    learnings: ensureContentArray(m.learnings),
    events: ensureContentArray(m.events),
  };
}

// =============================================
// 振り返りモード（複数日対応）
// =============================================

interface ReflectionItem {
  date: string;
  summary: string;
  rawText: string;
  actions: { content: string }[];
  highlights: {
    kind: "Decision" | "Hypothesis" | "Learning";
    content: string;
  }[];
  // 「五島さんはこういう人」候補。本人モデル抽出（軽め）。
  // 採択は /clone/<slug>/core-os/persona-traits でユーザーが行う。
  personaTraits: {
    category: PersonaTraitCategory;
    trait: string;
    detail?: string;
  }[];
}

// 振り返り → レビュー(判断履歴/ナレッジ候補)への自動流入フラグ。
// 2026-06-24 一旦停止：自動抽出される「決定/学び」が日記グレードで溢れ、
// レビュー候補が滞留＆Core OS が汚れる懸念があるため。再開するなら true に戻す。
// （日記 journal と本人特性候補 persona_trait はこれとは別で継続）
const REVIEW_INTAKE_FROM_REFLECTION = false;

async function handleReflection(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const reflections = await extractReflections(client, text);
  if (!reflections || reflections.length === 0) {
    return "振り返りとして抽出できませんでした。";
  }

  const reports: string[] = [];
  for (const r of reflections) {
    // 振り返り本文は ai_clone_journal に UPSERT。同日複数回投稿は追記される。
    // ハイライトや Action は引き続き knowledge_candidate / decision_log / task に分配。
    const journalRawText = r.rawText || text;
    const journalResult = await upsertJournalEntry(tenantId, {
      date: r.date,
      rawText: journalRawText,
      summary: r.summary || null,
    });

    // 振り返りからの自動タスク化は廃止（2026-06-09）。
    // 「予定を動くことをベースに組む」「鑑定を控える」等の気づき・心情まで
    // LLM が誤って action と判定し、過去日の期限付きで ai_clone_task に登録され、
    // 毎晩の超過リマインドのノイズになっていた。振り返りでは ai_clone_task を
    // 一切作らない。明日以降の具体的予定は「リマインド: ○○を△日までに」で
    // 明示登録してもらう運用に切り替える。
    const sideJobs: Promise<any>[] = [];

    // ハイライト（その日の核となる Decision/Hypothesis/Learning を最大2件）
    const highlightLabel: Record<
      "Decision" | "Hypothesis" | "Learning",
      string
    > = {
      Decision: "決定",
      Hypothesis: "仮説",
      Learning: "学び",
    };
    if (REVIEW_INTAKE_FROM_REFLECTION) {
      for (const h of r.highlights) {
        sideJobs.push(
          createNote(tenantId, {
            title: `[${r.date}] ${highlightLabel[h.kind]}: ${h.content.slice(0, 40)}`,
            date: r.date,
            kind: h.kind,
            content: h.content,
          }),
        );
      }
    }

    // 本人特性候補（persona_trait）を candidate として保存。
    // source_journal_id で日記にトレース可能。重複は createPersonaTraitCandidate が抑える。
    let traitNewCount = 0;
    for (const t of r.personaTraits) {
      const res = await createPersonaTraitCandidate(tenantId, {
        category: t.category,
        trait: t.trait,
        detail: t.detail ?? null,
        sourceJournalId: journalResult?.id ?? null,
      });
      if (res && !res.isDuplicate) traitNewCount++;
    }

    await Promise.all(sideJobs);

    const tails: string[] = [];
    if (REVIEW_INTAKE_FROM_REFLECTION && r.highlights.length > 0) {
      tails.push(`ハイライト ${r.highlights.length}件`);
    }
    if (traitNewCount > 0) {
      tails.push(`本人特性候補 ${traitNewCount}件`);
    }
    const tailStr = tails.length > 0 ? ` + ${tails.join(" + ")}` : "";
    // 「新規日記 1件」/「既存日記に追記」を呼び出し側で見分けられるよう表示分け
    const journalLabel = !journalResult
      ? "日記の保存に失敗"
      : journalResult.isNew
        ? "日記新規"
        : "日記に追記";
    reports.push(`📅 ${r.date}：${journalLabel}${tailStr}`);
  }

  return `振り返りを保存しました（${reflections.length}日分）：\n${reports.join("\n")}`;
}

async function extractReflections(
  client: OpenAI,
  text: string,
): Promise<ReflectionItem[] | null> {
  const prompt = `以下の振り返りテキストから、日付ごとに分割してください。
1日分でも複数日分でも、配列で返してください。

# 日付ルール（厳守）
- 本文に明示的に書かれている日付ブロックの数だけ返す。本文に「2026/06/13」のような日付が1つだけなら、返すのはその1件だけ。
- 本文に書かれていない日付（今日の日付など）のエントリを勝手に追加してはいけない。1件の振り返りを今日の分とその日の分に分割しない。
- 本文全体に日付が1つも書かれていないときだけ、今日の日付（${todayJST()}）で1件にまとめる。

抽出ルール：
- rawText：その日の振り返り原文をそのまま保持。要約せず、原文のまま。## YYYY-MM-DD 等の見出しは除いてOK。
- summary：1〜3行の要約。後から読み返したときに状況が思い出せる粒度。
- actions：「明日以降に自分が取る具体的な行動」だけを抜き出す。観察・気づき・反省・心情は含めない。
  本文中に明示的なアクション宣言がなければ空配列。

- highlights：その日の「核」と言える最重要を**最大2件まで**。それぞれ kind を Decision / Hypothesis / Learning から選ぶ。
  * Decision：明示的に下した意思決定（例：「サロン価格を980円にする」）
  * Hypothesis：観察から立てた仮説・気づき
  * Learning：今後の判断に活きる学び
  * 中途半端な重要度のものは含めない。該当なしの日は空配列。3件以上挙げない。

- personaTraits：振り返り全体から滲み出る「本人の傾向（クセ）」を**最大2件まで**。
  本人が無意識に持っている性格・価値観・行動パターンを 1 行で言い切る。
  あくまで「観察された傾向」であり、本人がその場で決めた判断ではない。
  category は以下のいずれかから選ぶ：
    * 価値観：何を大事にしている人か（例「家族との時間を貴重に感じる」）
    * 判断軸：迷った時どう決める人か（例「広げるより絞る方向を選ぶ」）
    * 学びクセ：どう学んで定着させる人か（例「実装しながら理解するタイプ」）
    * 好み：何を好み何を嫌うか（例「非日常体験で脳がリフレッシュされる」）
    * 息抜き：どう整うか（例「妻と二人での外出で気分転換」）
    * 心理パターン：感情の動き方（例「焦ると夢に出るタイプ」）
    * 仕事スタイル：どう仕事するか（例「隙間時間にも手を動かす」）
    * 関係性パターン：人とどう関わるか（例「相手の才能を観察して助けたい欲が出る」）
  trait は 1 行で言い切る。detail は補足（省略可）。
  「今日 X した」のような単発の出来事ではなく、傾向として読めるものだけ拾う。
  当てはまるものがなければ空配列。

# 振り返り
${text}

# 出力JSON
{
  "reflections": [
    {
      "date": "YYYY-MM-DD",
      "summary": "1〜3行の要約",
      "rawText": "その日の本文をそのまま",
      "actions": [{ "content": "明日以降の具体的な行動" }],
      "highlights": [{ "kind": "Decision" | "Hypothesis" | "Learning", "content": "その日の核となる重要事項" }],
      "personaTraits": [{ "category": "価値観", "trait": "1行で言い切る本人傾向", "detail": "補足（任意）" }]
    }
  ]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!Array.isArray(parsed.reflections)) return null;
    return parsed.reflections.map((r: any) => ({
      date: r.date || todayJST(),
      summary: r.summary || "",
      rawText: typeof r.rawText === "string" ? r.rawText : "",
      actions: ensureContentArray(r.actions),
      highlights: ensureHighlightArray(r.highlights),
      personaTraits: ensurePersonaTraitArray(r.personaTraits),
    }));
  } catch (err) {
    console.error("[ai-clone] 振り返り抽出失敗:", err);
    return null;
  }
}

// LLM 出力の personaTraits を検証。category は固定リスト内、trait は空でないもののみ。
// 上限 2 件（プロンプトで「最大 2 件」と指示しているが、念のためコード側でも切る）。
function ensurePersonaTraitArray(v: any): {
  category: PersonaTraitCategory;
  trait: string;
  detail?: string;
}[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) =>
      x?.trait
      && typeof x.trait === "string"
      && x.trait.trim().length > 0
      && typeof x.category === "string"
      && (PERSONA_TRAIT_CATEGORIES as readonly string[]).includes(x.category),
    )
    .slice(0, 2)
    .map((x) => ({
      category: x.category as PersonaTraitCategory,
      trait: x.trait.trim(),
      detail: typeof x.detail === "string" && x.detail.trim().length > 0
        ? x.detail.trim()
        : undefined,
    }));
}

// =============================================
// 備考モード（人物紐付けメモ）
// =============================================

interface RemarkExtraction {
  title: string;
  content: string;
  peopleNames: string[];
  kind: "Learning" | "Hypothesis" | "Event";
}

async function handleRemark(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const remark = await extractRemark(client, text);
  if (!remark) {
    return "備考として保存できませんでした。";
  }

  // 人物の解決（曖昧時は警告）
  const resolutions = await Promise.all(
    remark.peopleNames.map(async (n) => ({
      name: n,
      result: await resolvePerson(tenantId, n),
    })),
  );
  const ambiguous = resolutions.filter((r) => r.result?.state === "ambiguous");
  if (ambiguous.length > 0) {
    return buildAmbiguousWarning(
      ambiguous.map((a) => ({
        query: a.name,
        candidates:
          a.result?.state === "ambiguous" ? a.result.candidates : [],
      })),
    );
  }

  const validPeople = resolutions
    .filter((r) => r.result?.state === "single")
    .map((r) => {
      const single = r.result as Extract<
        NonNullable<typeof r.result>,
        { state: "single" }
      >;
      return { id: single.id, name: single.name, created: single.created };
    });

  const note = await createNote(tenantId, {
    title: remark.title.slice(0, 60),
    date: todayJST(),
    kind: remark.kind,
    content: remark.content,
    peopleIds: validPeople.map((p) => p.id),
  });

  const lines: string[] = [];
  if (note?.id) {
    lines.push(`✅ 備考を保存しました（${remark.kind}）`);
    if (validPeople.length > 0) {
      lines.push(`紐付け: ${validPeople.map((p) => p.name).join(", ")}`);
      const newOnes = validPeople.filter((p) => p.created).map((p) => p.name);
      if (newOnes.length > 0) {
        lines.push(`  ↳ 新規作成: ${newOnes.join(", ")}`);
      }
    } else {
      lines.push("（人物紐付けなし、独立メモとして保存）");
    }
  } else {
    lines.push("備考の保存に失敗しました。");
  }
  return lines.join("\n");
}

async function extractRemark(
  client: OpenAI,
  text: string,
): Promise<RemarkExtraction | null> {
  const prompt = `以下のメモから構造化抽出してください。

# メモ
${text}

# 抽出ルール
- title: 1行のタイトル（メモの要点を10〜30字）
- content: 元のメモから「備考:」プレフィックスを除いたテキスト
- peopleNames: 中身で言及されてる人物名（さん/氏/様抜き、なければ空配列）
- kind: 内容に応じて選ぶ
   - "Learning": 一般的な気づき・観察
   - "Hypothesis": 仮説・推測
   - "Event": 起きた事実・接触履歴

# 出力JSON
{
  "title": "...",
  "content": "...",
  "peopleNames": ["..."],
  "kind": "Learning" | "Hypothesis" | "Event"
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const validKinds = ["Learning", "Hypothesis", "Event"];
    return {
      title: parsed.title || text.slice(0, 30),
      content: parsed.content || text,
      peopleNames: Array.isArray(parsed.peopleNames)
        ? parsed.peopleNames.filter((n: any) => typeof n === "string")
        : [],
      kind: validKinds.includes(parsed.kind) ? parsed.kind : "Learning",
    };
  } catch (err) {
    console.error("[ai-clone] 備考抽出失敗:", err);
    return null;
  }
}

// =============================================
// ファネル更新モード（person の date 列を更新）
// =============================================

interface PipelineExtraction {
  personName: string;
  stage: "salonProposal" | "salonJoin" | "appPitch" | "appDeal";
  date: string;
  amount?: number;
}

async function handlePipelineUpdate(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const ext = await extractPipelineUpdate(client, text);
  if (!ext) {
    return "ファネル更新として解釈できませんでした。例: 「山口さんにサロン提案した」「田中さんがアプリ受注した 30万」";
  }

  // 人物解決（曖昧時は警告）
  const r = await resolvePerson(tenantId, ext.personName);
  if (!r) {
    return `人物「${ext.personName}」を解決できませんでした。`;
  }
  if (r.state === "ambiguous") {
    return buildAmbiguousWarning([
      { query: ext.personName, candidates: r.candidates },
    ]);
  }

  const updateParams: Parameters<typeof updatePersonPipeline>[2] = {};
  let stageLabel = "";
  switch (ext.stage) {
    case "salonProposal":
      updateParams.salonProposalDate = ext.date;
      stageLabel = "サロン提案";
      break;
    case "salonJoin":
      updateParams.salonJoinDate = ext.date;
      stageLabel = "サロン参加";
      break;
    case "appPitch":
      updateParams.appPitchDate = ext.date;
      stageLabel = "アプリ商談";
      break;
    case "appDeal":
      updateParams.appDealDate = ext.date;
      stageLabel = "アプリ受注";
      if (typeof ext.amount === "number") {
        updateParams.dealAmount = ext.amount;
      }
      break;
  }

  const ok = await updatePersonPipeline(tenantId, r.id, updateParams);
  if (!ok) {
    return `更新に失敗しました（${r.name} / ${stageLabel}）。`;
  }

  const lines: string[] = [];
  lines.push(`✅ ファネル更新：${r.name}`);
  lines.push(`  ${stageLabel}日: ${ext.date}`);
  if (ext.stage === "appDeal" && typeof ext.amount === "number") {
    lines.push(`  受注金額: ¥${ext.amount.toLocaleString()}`);
  }
  if (r.created) {
    lines.push("  ↳ 新規作成(People に無かったので追加しました)");
  }
  return lines.join("\n");
}

async function extractPipelineUpdate(
  client: OpenAI,
  text: string,
): Promise<PipelineExtraction | null> {
  const today = todayJST();
  const prompt = `次の文から、営業ファネルの更新情報を抽出してください。

# 入力
${text}

# 抽出ルール
- personName: 対象の人物名（さん/氏/様抜き）
- stage: 以下のいずれか
   - "salonProposal": オンラインサロンを提案した
   - "salonJoin": サロンに参加・入会した
   - "appPitch": アプリ商談・提案した
   - "appDeal": アプリ受注・契約した
- date: 「昨日」「今日」「先週」「3日前」等の相対表現は ${today} 起点でYYYY-MM-DDに変換。明示なければ ${today}
- amount: 受注金額が数字で出てくれば数値で（円単位）。「30万」→ 300000、「1.5万」→ 15000、無ければ省略

# 出力JSON
{ "personName": "...", "stage": "...", "date": "YYYY-MM-DD", "amount": 数値 or null }

抽出できない場合は { "personName": "" } を返す`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!parsed.personName || typeof parsed.personName !== "string") return null;
    const validStages = ["salonProposal", "salonJoin", "appPitch", "appDeal"];
    if (!validStages.includes(parsed.stage)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "")) {
      parsed.date = today;
    }
    return {
      personName: parsed.personName.trim(),
      stage: parsed.stage,
      date: parsed.date,
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
    };
  } catch (err) {
    console.error("[ai-clone] ファネル抽出失敗:", err);
    return null;
  }
}

// =============================================
// 名刺モード
// =============================================

interface BusinessCardExtraction {
  name: string;
  nameKana?: string;
  companyName?: string;
  role?: string;
  industry?: string;
  email?: string;
  phone?: string;
  hp?: string;
  // 口語メモを捨てないための拡張フィールド
  metContext?: string;
  community?: string; // 明示的な「所属」の会・コミュニティ（BNI/守成クラブ/テツジン会 等）
  interests?: string[];
  caveats?: string;
  nextAction?: string;
  nextActionDate?: string; // 約束に日付があれば YYYY-MM-DD（→ 期限タスク化）
  importance?: "S" | "A" | "B" | "C"; // 「重要度A」等の明示があれば
  birthday?: string;       // 生年月日 YYYY-MM-DD（「誕生日 1990/3/3」等の明示があれば）
  birthplace?: string;     // 出身地・出生地（明示があれば）
}

// 「タスク」プレフィックス（タスク/やること/TODO）で確実にタスクを作成する。
// 動詞止め/名詞止めに関わらず作る（mini の意図分類に頼らない確定経路）。
async function handleTaskCreate(
  tenantId: string,
  text: string,
): Promise<string> {
  const body = text
    .replace(/^(タスク|やること|todo|to-?do)[:：\s]+/i, "")
    .trim();
  if (!body) {
    return "タスク名が読み取れませんでした。「タスク: ○○」の形で送ってください。";
  }
  // 1行目をタスク名にする（複数行貼り付け対策。名前を短く保つ）
  const name = body.split(/\r?\n/)[0].trim() || body.trim();
  // 文面に日付の言及があるときだけ期限を設定（勝手に作らない）
  const userMentionsDate =
    /(今日|本日|明日|あした|明後日|あさって|来週|再来週|今週|来月|\d{1,2}\s*\/\s*\d{1,2}|\d{1,2}月\d{1,2}日|\d+日後|[月火水木金土日]曜|期限|締切|納期|まで(に)?|月末|今月中)/.test(
      body,
    );
  const dueDate = userMentionsDate
    ? (resolveRelativeDate(body, todayJST()) ?? undefined)
    : undefined;
  // 本文中の人物名を解決して紐付け（曖昧・未解決はスキップ）
  const names = extractPersonNames(body);
  const peopleIds: string[] = [];
  for (const n of names) {
    const r = await resolvePerson(tenantId, n);
    if (r && r.state !== "ambiguous") peopleIds.push(r.id);
  }
  const saved = await createOrUpdateTaskByName(tenantId, {
    name,
    dueDate,
    peopleIds,
  });
  if (!saved) return "タスクの作成に失敗しました。";
  const tail: string[] = [];
  if (dueDate) tail.push(`期限:${dueDate}`);
  if (peopleIds.length > 0) tail.push(`関係者:${peopleIds.length}人`);
  const verb = saved.updated ? "更新" : "追加";
  return `✅ タスク${verb}「${name}」${tail.length ? `（${tail.join(", ")}）` : ""}`;
}

async function handleBusinessCard(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const card = await extractBusinessCard(client, text);
  if (!card || !card.name) {
    return "人物メモとして認識できませんでした。お名前が含まれているか確認してください。";
  }

  if (card.email) {
    const existing = await findPersonByEmail(tenantId, card.email);
    if (existing) {
      return `この方は既にPeopleに登録されています：「${existing.name}」（メール一致）。新規作成は行いませんでした。`;
    }
  }

  let companyId: string | undefined;
  let companyName = "";
  let companyCreated = false;
  if (card.companyName) {
    const c = await findOrCreateCompany(tenantId, card.companyName, {
      hp: card.hp,
    });
    if (c) {
      companyId = c.id;
      companyName = c.name;
      companyCreated = c.created;
    }
  }

  const person = await createPersonDetailed(tenantId, {
    name: card.name,
    nameKana: card.nameKana,
    companyId,
    role: card.role,
    industry: card.industry,
    email: card.email,
    phone: card.phone,
    ocrText: text,
    metContext: card.metContext,
    interests: card.interests,
    caveats: card.caveats,
    nextAction: card.nextAction,
    importance: card.importance,
    birthday: card.birthday,
    birthplace: card.birthplace,
  });

  const lines: string[] = [];
  if (person) {
    lines.push(
      person.updated
        ? `✅ 既存の人物を更新しました：「${card.name}」`
        : `✅ 人物を保存しました：「${card.name}」`,
    );
    if (card.importance) lines.push(`重要度: ${card.importance}`);
    if (card.nameKana) lines.push(`よみがな: ${card.nameKana}`);
    if (card.birthday) lines.push(`誕生日: ${card.birthday}`);
    if (card.birthplace) lines.push(`出身: ${card.birthplace}`);
    // 所属（会）が明示されていれば、未登録でも会を自動作成して紐付ける。
    // met_context（単発の出会い場所）と違い、継続所属なので会として溜める。
    let communityLinkedName: string | null = null;
    if (card.community) {
      const comm = await createOrGetCommunity(tenantId, card.community);
      if (comm) {
        await linkPersonToCommunity(person.id, comm.id);
        communityLinkedName = comm.name;
        lines.push(`🔗 会「${comm.name}」に登録${comm.created ? "（新規）" : ""}`);
      }
    }
    // 出会った場所が登録済みの「会」名を含むなら自動で紐付け（所属で既に紐付けた会は除く）
    if (card.metContext) {
      const linked = await autoLinkCommunityByMetContext(
        tenantId,
        person.id,
        card.metContext,
      );
      if (linked && linked !== communityLinkedName) {
        lines.push(`🔗 会「${linked}」に紐付けました`);
      }
    }
    if (card.industry) lines.push(`業種: ${card.industry}`);
    if (card.role) lines.push(`仕事: ${card.role}`);
    if (companyName) {
      lines.push(`会社: ${companyName}${companyCreated ? "（新規作成）" : ""}`);
    }
    if (card.metContext) lines.push(`出会い: ${card.metContext}`);
    if (card.interests && card.interests.length > 0)
      lines.push(`関心: ${card.interests.join(" / ")}`);
    if (card.caveats) lines.push(`メモ: ${card.caveats}`);
    if (card.nextAction) {
      lines.push(`📌 約束: ${card.nextAction}`);
      // 日付がある約束はリマインド（期限タスク）にも自動登録 → 前日に通知が飛ぶ
      if (card.nextActionDate) {
        const task = await createTaskRecord(tenantId, {
          name: `${card.name}さん：${card.nextAction}`,
          dueDate: card.nextActionDate,
          peopleIds: [person.id],
        });
        if (task) {
          lines.push(`   → リマインド（期限 ${card.nextActionDate}）も作成しました`);
        }
      }
    }
    if (card.email) lines.push(`メール: ${card.email}`);
    if (card.phone) lines.push(`電話: ${card.phone}`);
  } else {
    lines.push("人物の保存に失敗しました。");
  }

  // 出会いに中身（場所・背景・約束・関心）があれば、初回接点として会話ログも1本残す。
  // 連絡先だけの名刺（名前/会社/電話のみ）ではログは作らない（ノイズ回避）。
  // 「初回接点」は人物が新規/既存に関わらず、その人にまだ会話ログが1件も無いときだけ作る。
  // → 先に名前だけ登録→後から名刺で出会いを送っても初回ログが残る。再スキャンでは重複しない。
  if (
    person &&
    (card.metContext ||
      card.caveats ||
      card.nextAction ||
      (card.interests && card.interests.length > 0))
  ) {
    const existingLogs = await fetchRecentConversationLogsForPerson(
      tenantId,
      person.id,
      1,
    ).catch(() => []);
    if (existingLogs.length === 0) {
      const created = await createConversationLog(tenantId, {
        summary: card.metContext
          ? `初回接点：${card.metContext}`
          : `初回接点：${card.name}さん`,
        content: text,
        channel: "対面",
        occurredAt: `${todayJST()}T12:00:00+09:00`,
        nextAction: card.nextAction,
        personIds: [person.id],
      });
      if (created) lines.push("🗒️ 初回の会話ログも残しました");
    }
  }

  return lines.join("\n");
}

// =============================================
// 案件モード（「案件: 7/3 紹介セミナー くろちゃん れんげちゃん来る」）
// 名刺モードの案件版。日付・来る人を抽出して案件を作成し、未登録の人は自動登録して紐付ける。
// =============================================

interface ProjectNoteExtraction {
  name: string;
  dueDate?: string; // YYYY-MM-DD（開催日・期限）
  peopleNames?: string[]; // 関係者・来る人
  status?: "リード" | "提案" | "受注" | "進行中" | "完了" | "失注";
}

async function handleProjectNote(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const note = await extractProjectNote(client, text);
  if (!note || !note.name) {
    return "案件として認識できませんでした。「案件: 7/3 紹介セミナー、くろちゃんとれんげちゃんが来る」のように送ってください。";
  }

  // 関係者・来る人を解決（未登録は自動作成）。同名複数は案件は作りつつ注記で返す。
  const personIds: string[] = [];
  const linkedNames: string[] = [];
  const newlyCreated: string[] = [];
  const ambiguous: string[] = [];
  for (const n of note.peopleNames ?? []) {
    const r = await resolvePerson(tenantId, n);
    if (!r) continue;
    if (r.state === "ambiguous") {
      ambiguous.push(n);
      continue;
    }
    personIds.push(r.id);
    linkedNames.push(r.name);
    if (r.created) newlyCreated.push(r.name);
  }

  const saved = await createProjectRecord(tenantId, {
    name: note.name,
    status: note.status,
    dueDate: note.dueDate,
    peopleIds: personIds,
  });
  if (!saved) return "案件の保存に失敗しました。";

  const lines: string[] = [`✅ 案件を作成しました：「${note.name}」`];
  if (note.status) lines.push(`ステータス: ${note.status}`);
  if (note.dueDate) lines.push(`📅 日付: ${note.dueDate}`);
  if (linkedNames.length > 0) lines.push(`👥 関係者: ${linkedNames.join(" / ")}`);
  if (newlyCreated.length > 0) lines.push(`🆕 新規登録: ${newlyCreated.join(" / ")}`);
  if (ambiguous.length > 0)
    lines.push(
      `⚠️ 同名が複数で未紐付け: ${ambiguous.join(" / ")}（フルネームで「○○を${note.name}案件に追加」と送ってください）`,
    );
  return lines.join("\n");
}

async function extractProjectNote(
  client: OpenAI,
  text: string,
): Promise<ProjectNoteExtraction | null> {
  const today = todayJST();
  const body = text
    .replace(/^(案件|プロジェクト|案件登録|project)[:：\s]+/i, "")
    .trim();
  const prompt = `次の「案件メモ」から情報を構造化抽出してください。本文に実際に書かれていることだけを使い、推測で補わないこと。
今日は ${today}。日付表現（「7/3」「来週金曜」「8月」等）は ${today} 起点で YYYY-MM-DD に変換（月のみで日が不明なら月初）。
人名は敬称（さん/ちゃん/くん 等）を外す。

【最重要】peopleNames には、本文に実際に名前が書かれている人だけを入れる。本文に人名が無ければ必ず空配列 [] にする。
例にありそうな名前・よくある名前を勝手に補ってはいけない（本文に「くろちゃん」等が無いのに入れるのは禁止）。

出力は JSON のみ:
{
  "name": "案件名（短く。日付や人名は含めない）",
  "dueDate": "YYYY-MM-DD。日付が無ければ空文字",
  "peopleNames": ["本文に書かれた人名だけ（敬称なし）。無ければ []"],
  "status": "リード/提案/受注/進行中/完了/失注 のいずれか。明示が無ければ空文字"
}

案件メモ:
"""
${body}
"""`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    if (!name) return null;
    const dueDate =
      typeof parsed.dueDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate)
        ? parsed.dueDate
        : undefined;
    const peopleNames = Array.isArray(parsed.peopleNames)
      ? parsed.peopleNames
          .filter((x: unknown) => typeof x === "string" && x.trim().length > 0)
          .map((x: string) => x.trim())
      : [];
    const STATUSES = ["リード", "提案", "受注", "進行中", "完了", "失注"];
    const status =
      typeof parsed.status === "string" && STATUSES.includes(parsed.status)
        ? (parsed.status as ProjectNoteExtraction["status"])
        : undefined;
    return { name, dueDate, peopleNames, status };
  } catch (err) {
    console.error("[ai-clone] 案件抽出失敗:", err);
    return null;
  }
}

async function extractBusinessCard(
  client: OpenAI,
  text: string,
): Promise<BusinessCardExtraction | null> {
  const today = todayJST();
  const prompt = `以下は「会った人」のメモ（名刺OCR or 口語の一言メモ）です。人物情報を構造化抽出してください。
正式な名刺とは限らず、「○○さん、テツジン会で会った、スーツ屋さん」のような走り書きが多いです。
書かれた情報を取りこぼさず、適切な項目に振り分けてください。推測で創作はしない。記載のない項目は省略。
今日は ${today}（JST）です。

# 入力
${text}

# 抽出ルール（振り分けを厳密に）
- name: 氏名（必須）
- nameKana: 氏名のよみがな（ひらがな/カタカナ）。本文にフリガナ（例「おかだ　ひろたか」）があれば入れる。無ければ空（勝手に推測しない）。
- companyName: **明確な会社名のときだけ**。「株式会社○○」「○○商事」「○○Inc」など社名と判断できるもの限定。
   「ミナミでBARしてる」「医療系で働いてて」のような状況・業態の説明は会社名に入れない（→ role か metContext へ）。判断できなければ空。
- role: 仕事・職種・肩書き・仕事内容（例「就労支援」「公認会計士」「補助金コンサル」「美容液販売」「BAR経営」「代表」）。
   **複数の事業・サービスが並んでいる場合（例「看板 フィルムラッピング 動画制作」）は、それらは全部 role にまとめる（読みやすく「・」区切りで）。その中の1つだけ業種に昇格させない。**
- industry: 業種＝その人が属する広い業界カテゴリを一語で（例「介護」「飲食」「医療」「不動産」「美容」「士業」「人材」）。
   **role に並んだサービスを束ねる明確に広いカテゴリが読み取れる時だけ入れる（例 看板/動画制作 等 → 「広告・制作」）。束ねられない・自信がなければ空にする（列挙された具体サービスの1つを業種に流用しない）。**
- metContext: どこで・どうやって会ったか、出会いのきっかけ（例「テツジン会で会った」「インバウンド勉強会」「ビジマリで会った」「ミナミのBAR」）。
- community: その人が**継続的に所属している会・コミュニティ名**（BNI / 守成クラブ / テツジン会 / 商工会 等）。「所属 ◯◯」「◯◯のメンバー」のように所属が明示された時だけ入れる。単発の出会い場所（セミナー・勉強会・BAR等）は community でなく metContext へ。明示が無ければ空。
- interests: 関心・嗜好を配列で（例 ["お酒好き"]）。無ければ空配列。
- caveats: 上記に当てはまらない背景・補足メモ（例「元キャバ嬢」「水商売ネットワーク」「もともとNICにいた」）。
- nextAction: 約束・次の接点（例「天満で飲む約束」「来週連絡する」）。加えて、相手が買う気配・関心を示したフレーズ（「アプリに興味あり」「検討したい」「話を聞きたい」「提案ほしい」「見積りほしい」等）があれば、その件のフォローを次アクションにする（例「アプリの件でフォロー連絡する」）＝売上の取りこぼし防止。無ければ空。
- nextActionDate: その約束に日付・時期があれば YYYY-MM-DD に変換（「来週金曜」「3日後」「6/10」等を ${today} 起点で）。日付が読めない約束（「今度飲む」等）は空。
- importance: 重要度。「重要度A」「重要度S」「重要S」「優先度高」のような明示があれば S / A / B / C のいずれかに正規化（最重要=S、高=A）。明示が無ければ空（推測しない）。
- birthday: 生年月日。「誕生日 1990/3/3」「1985年4月2日生まれ」等の明示があれば YYYY-MM-DD に変換。和暦や年欠けは無理に補完しない。読めなければ空。
- birthplace: 出身地・出生地（「大阪出身」等の明示があれば）。無ければ空。
- email / phone / hp: あれば（phone はハイフン保持）。

# 出力JSON
{
  "name": "...",
  "nameKana": "",
  "companyName": "" ,
  "industry": "",
  "role": "",
  "metContext": "",
  "community": "",
  "interests": [],
  "caveats": "",
  "nextAction": "",
  "nextActionDate": "",
  "importance": "",
  "birthday": "",
  "birthplace": "",
  "email": "",
  "phone": "",
  "hp": ""
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!parsed.name) return null;
    const str = (v: unknown): string | undefined =>
      typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
    const interests = Array.isArray(parsed.interests)
      ? parsed.interests
          .filter((x: unknown) => typeof x === "string" && x.trim().length > 0)
          .map((x: string) => x.trim())
      : [];
    return {
      name: String(parsed.name).trim(),
      nameKana: str(parsed.nameKana),
      companyName: str(parsed.companyName),
      role: str(parsed.role),
      industry: str(parsed.industry),
      email: str(parsed.email),
      phone: str(parsed.phone),
      hp: str(parsed.hp),
      metContext: str(parsed.metContext),
      community: str(parsed.community),
      interests: interests.length > 0 ? interests : undefined,
      caveats: str(parsed.caveats),
      nextAction: str(parsed.nextAction),
      nextActionDate:
        typeof parsed.nextActionDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextActionDate)
          ? parsed.nextActionDate
          : undefined,
      importance: ["S", "A", "B", "C"].includes(parsed.importance)
        ? (parsed.importance as "S" | "A" | "B" | "C")
        : undefined,
      birthday:
        typeof parsed.birthday === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.birthday)
          ? parsed.birthday
          : undefined,
      birthplace: str(parsed.birthplace),
    };
  } catch (err) {
    console.error("[ai-clone] 人物メモ抽出失敗:", err);
    return null;
  }
}

// =============================================
// リマインドモード（締切 or 記念日を AI 判別して振り分け）
// =============================================

type ReminderRecurrence = "none" | "yearly" | "monthly" | "milestone";

interface ReminderExtraction {
  kind: "deadline" | "date";
  title: string;
  // deadline
  dueDate?: string;
  priority?: string;
  // date
  baseDate?: string;
  recurrence: ReminderRecurrence;
  milestoneMonths: number[];
  note?: string;
  // 関係する人物名（「○○さんと△日に会う」等の予定で相手を人物に紐付け＆未登録なら自動作成する）
  peopleNames: string[];
}

async function handleReminder(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const items = await extractReminder(client, text);
  if (items.length === 0) {
    return 'リマインドとして解釈できませんでした。例:「リマインド: 6/10までに請求書送る」「リマインド: 田中さん誕生日 3/29 毎年」「リマインド: ○○社 サービス開始 5/1、3ヶ月と6ヶ月で」';
  }

  // 箇条書き等で複数のやることが来たら、1件ずつ登録して1つの返信にまとめる。
  const deadlineLines: string[] = []; // 登録できた期限リマインドの表示行
  const dateLines: string[] = []; // 登録できた日付リマインドの表示行
  const ambiguousItems: {
    query: string;
    candidates: { id: string; name: string; companyHint: string }[];
  }[] = []; // 同名複数で保存を見送った人物
  const problems: string[] = []; // 日付欠落・保存失敗など、登録できなかった項目

  for (const ext of items) {
    if (!ext.title) continue;

    if (ext.kind === "deadline") {
      if (!ext.dueDate) {
        problems.push(`・${ext.title} → 締切日が読み取れず未登録（日付を入れて再送してください）`);
        continue;
      }

      // 予定（アポ）の相手など、文中の人物を解決して紐付ける。
      // 未登録の名前は resolvePerson が自動で人物作成する（created=true）。
      // 同名複数で曖昧なときは、その項目だけ見送って他は登録する（取り違え防止）。
      const peopleResolutions = await Promise.all(
        (ext.peopleNames ?? []).map(async (n) => ({
          name: n,
          result: await resolvePerson(tenantId, n),
        })),
      );
      const ambiguous = peopleResolutions.filter(
        (r) => r.result?.state === "ambiguous",
      );
      if (ambiguous.length > 0) {
        for (const a of ambiguous) {
          ambiguousItems.push({
            query: a.name,
            candidates:
              a.result?.state === "ambiguous" ? a.result.candidates : [],
          });
        }
        problems.push(`・${ext.title} → 同名の人物が複数いるため未登録`);
        continue;
      }
      const linkedPeople = peopleResolutions
        .filter((r) => r.result?.state === "single")
        .map((r) => {
          const single = r.result as Extract<
            NonNullable<typeof r.result>,
            { state: "single" }
          >;
          return { id: single.id, name: single.name, created: single.created };
        });

      const saved = await createOrUpdateTaskByName(tenantId, {
        name: ext.title,
        dueDate: ext.dueDate,
        priority: ext.priority,
        peopleIds: linkedPeople.map((p) => p.id),
      });
      if (!saved) {
        problems.push(`・${ext.title} → 登録に失敗しました`);
        continue;
      }
      // 同名の未完タスクがあれば更新（作り直さない）。確認往復での重複を防ぐ。
      deadlineLines.push(`・${ext.title}${saved.updated ? "（更新）" : ""}`);
      deadlineLines.push(
        `  期限: ${ext.dueDate}${ext.priority ? ` / 優先度:${ext.priority}` : ""}`,
      );
      if (linkedPeople.length > 0) {
        deadlineLines.push(`  関係者: ${linkedPeople.map((p) => p.name).join(" / ")}`);
        const newOnes = linkedPeople.filter((p) => p.created).map((p) => p.name);
        if (newOnes.length > 0) {
          deadlineLines.push(`    ↳ 人物に未登録だったので新規登録しました: ${newOnes.join(", ")}`);
        }
      }
      if (ext.note) deadlineLines.push(`  メモ: ${ext.note}`);
      continue;
    }

    // kind === "date"
    if (!ext.baseDate) {
      problems.push(`・${ext.title} → 基準日が読み取れず未登録（誕生日・開始日などの日付を入れて再送してください）`);
      continue;
    }
    const created = await createDatedReminderRecord(tenantId, {
      title: ext.title,
      baseDate: ext.baseDate,
      recurrence: ext.recurrence,
      milestoneMonths: ext.milestoneMonths,
      note: ext.note,
    });
    if (!created) {
      problems.push(`・${ext.title} → 登録に失敗しました`);
      continue;
    }
    const recLabel =
      ext.recurrence === "milestone"
        ? `節目（${(ext.milestoneMonths ?? []).join("・")}ヶ月）`
        : ext.recurrence === "yearly"
          ? "毎年"
          : ext.recurrence === "monthly"
            ? "毎月"
            : "単発";
    dateLines.push(`・${ext.title}`);
    dateLines.push(`  基準日: ${ext.baseDate} / ${recLabel}`);
    if (ext.note) dateLines.push(`  メモ: ${ext.note}`);
  }

  const savedCount =
    deadlineLines.filter((l) => l.startsWith("・")).length +
    dateLines.filter((l) => l.startsWith("・")).length;

  // 何も登録できなかった場合は、原因（曖昧人物 or 日付欠落等）を返す。
  if (savedCount === 0) {
    if (ambiguousItems.length > 0) return buildAmbiguousWarning(ambiguousItems);
    if (problems.length > 0) {
      return ["リマインドを登録できませんでした。", ...problems].join("\n");
    }
    return "リマインドとして解釈できませんでした。";
  }

  const out: string[] = [];
  const countSuffix = savedCount > 1 ? `${savedCount}件` : "";
  if (deadlineLines.length > 0) {
    out.push(`✅ 期限リマインドを${countSuffix}登録しました（リマインド＞期限管理）`);
    out.push(...deadlineLines);
  }
  if (dateLines.length > 0) {
    if (out.length > 0) out.push("");
    out.push(`✅ 日付リマインドを登録しました（リマインド＞日付管理）`);
    out.push(...dateLines);
  }
  // 登録できなかった項目・曖昧人物があれば末尾に補足する。
  if (problems.length > 0) {
    out.push("");
    out.push("⚠️ 未登録の項目があります：");
    out.push(...problems);
  }
  if (ambiguousItems.length > 0) {
    out.push("");
    out.push(buildAmbiguousWarning(ambiguousItems));
  }
  return out.join("\n");
}

async function extractReminder(
  client: OpenAI,
  text: string,
): Promise<ReminderExtraction[]> {
  const today = todayJST();
  const prompt = `次の文をリマインドとして構造化抽出してください。今日は ${withWeekday(today)}（JST）です。

# 入力
${text}

# 分解方針（重要）
- 入力に複数のやること（箇条書き「・」「-」「①②」、改行区切り、「〜と〜」の並列など）が含まれる場合は、**1つずつ別のリマインドに分解**して reminders 配列に入れる。
- 「明日のタスク」「今週中に」「金曜までに」など、全体の見出し・共通の日付がある場合は、その日付を各項目の dueDate に適用する（各項目に個別の日付があればそちらを優先）。
- やることが1件だけなら、要素1つの配列で返す。
- 見出し行そのもの（「明日のタスク」等）は独立した項目にしない。

# 各項目の判別ルール
- kind="deadline"：締切・期限もの、および**予定・アポ**（「○日までに」「明日まで」「金曜まで」「○○さんと金曜に会う」「来週打ち合わせ」など、一度きりでその日が過ぎたら消えるもの）。
- kind="date"：記念日・特定日もの（誕生日・周年・契約更新・サービス開始◯ヶ月など、繰り返す/特定日に思い出したいもの）。
- 相対表現（明日・来週・今週金曜・3日後 等）は ${today} 起点で YYYY-MM-DD に変換。
- recurrence（kind=date のとき）：
   * 「毎年」「誕生日」「周年」→ yearly
   * 「毎月」→ monthly
   * 「○ヶ月」「○ヶ月後」「節目」「3ヶ月と6ヶ月で」等 → milestone（milestoneMonths に月数を配列で）
   * それ以外の単発の特定日 → none
- title：何のリマインドか分かる短い名前。**予定（アポ）の場合は「○○さんと△△（用件）」の形にし、時刻があれば「○○さんと△△（11時〜）」のように title に含める**。
- peopleNames：会う相手・関係する人物名の配列（「さん/氏/様」抜き。例「小林健さんと会う」→["小林健"]）。人物がいなければ空配列。
- dueDate：締切・予定の当日（その日に思い出したい日）を YYYY-MM-DD で。予定なら会う日。
- sourceText：この項目の元になった入力の一行（曜日補正用。箇条書きなら「・」を除いたその行の文言）。
- 抽出できなければ {"reminders":[]} を返す。

# 出力JSON
{
  "reminders": [
    {
      "kind": "deadline" | "date",
      "title": "...",
      "sourceText": "...",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "高 | 中 | 低 or null",
      "baseDate": "YYYY-MM-DD or null",
      "recurrence": "none" | "yearly" | "monthly" | "milestone",
      "milestoneMonths": [数値],
      "note": "... or null",
      "peopleNames": ["..."]
    }
  ]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 900,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    // 旧形式（単一オブジェクト）で返ってきた場合も配列として扱えるようにする。
    const rawItems: unknown[] = Array.isArray(parsed.reminders)
      ? parsed.reminders
      : parsed.title
        ? [parsed]
        : [];

    const isYMD = (v: unknown): v is string =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const validRec: ReminderRecurrence[] = ["none", "yearly", "monthly", "milestone"];
    const validPriority = ["高", "中", "低"];

    const results: ReminderExtraction[] = [];
    for (const p of rawItems) {
      if (!p || typeof p !== "object") continue;
      const item = p as Record<string, unknown>;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) continue;

      const kind: "deadline" | "date" = item.kind === "date" ? "date" : "deadline";
      const recurrence: ReminderRecurrence = validRec.includes(
        item.recurrence as ReminderRecurrence,
      )
        ? (item.recurrence as ReminderRecurrence)
        : "none";
      const milestoneMonths =
        recurrence === "milestone" && Array.isArray(item.milestoneMonths)
          ? Array.from(
              new Set(
                item.milestoneMonths
                  .map((n: unknown) => Math.trunc(Number(n)))
                  .filter((n: number) => Number.isFinite(n) && n > 0 && n <= 600),
              ),
            ).sort((a, b) => (a as number) - (b as number))
          : [];

      // 曜日表現（「今週の金曜」「金曜まで」「来週の月曜」等）はコードで確定し、
      // LLM の曜日誤計算（金曜6/12 を 6/10 と誤る等）を上書きする。deadline のみ。
      // 複数項目では項目ごとの sourceText で判定し、他項目の曜日に釣られないようにする。
      const weekdaySource =
        typeof item.sourceText === "string" && item.sourceText.trim()
          ? item.sourceText
          : title;
      const codeWeekdayDate = resolveRelativeWeekday(weekdaySource, today);
      const dueDate =
        kind === "deadline" && codeWeekdayDate
          ? codeWeekdayDate
          : isYMD(item.dueDate)
            ? (item.dueDate as string)
            : undefined;

      const peopleNames = Array.isArray(item.peopleNames)
        ? item.peopleNames
            .filter((n: unknown) => typeof n === "string" && n.trim().length > 0)
            .map((n: string) => n.trim())
        : [];

      results.push({
        kind,
        title,
        dueDate,
        priority: validPriority.includes(item.priority as string)
          ? (item.priority as string)
          : undefined,
        baseDate: isYMD(item.baseDate) ? (item.baseDate as string) : undefined,
        recurrence,
        milestoneMonths: milestoneMonths as number[],
        note:
          typeof item.note === "string" && item.note.trim()
            ? item.note.trim()
            : undefined,
        peopleNames,
      });
    }
    return results;
  } catch (err) {
    console.error("[ai-clone] リマインド抽出失敗:", err);
    return [];
  }
}

// =============================================
// ヘルパー
// =============================================

function buildAmbiguousWarning(
  items: Array<{
    query: string;
    candidates: { id: string; name: string; companyHint: string }[];
  }>,
): string {
  const lines: string[] = [];
  lines.push("⚠️ 同名の人物が複数登録されています。保存を中断しました。");
  lines.push("以下のうちどなたか分かるよう書き直して再投稿してください：");
  lines.push("");
  for (const item of items) {
    lines.push(`「${item.query}」候補:`);
    item.candidates.forEach((c, idx) => {
      const hint = c.companyHint ? `（${c.companyHint}）` : "";
      lines.push(`  ${idx + 1}. ${c.name}${hint}`);
    });
    lines.push("");
  }
  lines.push("例：「田中太郎」のようにフルネームで送ると一意に絞れます。");
  return lines.join("\n");
}

function ensureContentArray(v: any): { content: string }[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x?.content).map((x) => ({ content: x.content }));
}

function ensureHighlightArray(v: any): {
  kind: "Decision" | "Hypothesis" | "Learning";
  content: string;
}[] {
  if (!Array.isArray(v)) return [];
  const valid = v
    .filter(
      (x) =>
        x?.content &&
        typeof x.kind === "string" &&
        ["Decision", "Hypothesis", "Learning"].includes(x.kind),
    )
    .map((x) => ({
      kind: x.kind as "Decision" | "Hypothesis" | "Learning",
      content: x.content as string,
    }));
  return valid.slice(0, 2);
}

function formatTime(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
