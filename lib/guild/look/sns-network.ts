// 建設・不動産の酒場の見本（DBなし）：人脈の公開レベルと、紹介依頼の記録（判定と状態の進め方だけ。画面・仮データは持たない）。
// 仕様：contexts/projects/gia/sakaba_kensetsu_network_visibility_spec.md。
// ここは sns-mock.ts を読み込まない（sns-mock.ts がここを読むため）。人の名前・会社に触る処理は sns-mock.ts 側に置く。

// ---------- 公開レベル ----------

/** つながりの公開レベル。だれ（owner）の人脈の、どの相手（friend）か、で決まる */
export type NetLevel = "open" | "intro" | "masked" | "hidden";
// open   ＝直接連絡OK：ownerの知り合いは、friendに直接メッセージできる
// intro  ＝紹介経由のみ：直接は不可。ownerへの紹介依頼だけ（初期値）
// masked ＝非表示（業種・役職だけ）：名前を伏せて「建設業の役員と〇〇さんがつながりあり」と出す。紹介依頼はできる
// hidden ＝非表示：つながり自体を見せない
export const DEFAULT_NET_LEVEL: NetLevel = "intro";

export type NetSettings = {
  /** owner ごとの一括の初期設定（書いていなければ DEFAULT_NET_LEVEL） */
  defaults: Readonly<Record<string, NetLevel>>;
  /** owner → friend → 個別の設定。一括より優先 */
  overrides: Readonly<Record<string, Readonly<Record<string, NetLevel>>>>;
};

/** 個別 → 一括 → 初期値 の順で決める（判定はここ1か所） */
export function levelOf(settings: NetSettings, ownerId: string, friendId: string): NetLevel {
  return settings.overrides[ownerId]?.[friendId] ?? settings.defaults[ownerId] ?? DEFAULT_NET_LEVEL;
}

/** 言い方は1か所（画面ごとに書かない） */
export const NET_LEVEL_LABEL: Readonly<Record<NetLevel, string>> = {
  open: "直接連絡OK",
  intro: "紹介経由のみ",
  masked: "非表示（業種・役職だけ）",
  hidden: "非表示",
};

/** 画面で見せる3段階。非表示のときだけ「名前を伏せて業種・役職だけ見せる」を選べる */
export type NetChoice = "open" | "intro" | "hidden";
export const NET_CHOICES: readonly { key: NetChoice; label: string; note: string }[] = [
  { key: "open", label: "直接連絡OK", note: "知り合いが、この人たちに直接メッセージできます" },
  { key: "intro", label: "紹介経由のみ", note: "直接は連絡できません。あなたへの紹介依頼だけ届きます（おすすめ）" },
  { key: "hidden", label: "非表示", note: "あなたとつながっていること自体を見せません" },
];

export function choiceOf(level: NetLevel): NetChoice {
  return level === "masked" ? "hidden" : level;
}

/** 3段階の選択と「名前を伏せる」のチェックから、公開レベルを決める（チェックは非表示のときだけ効く） */
export function levelFromChoice(choice: NetChoice, showMasked: boolean): NetLevel {
  return choice === "hidden" ? (showMasked ? "masked" : "hidden") : choice;
}

/** 知り合いからどう見えるか（設定画面の各行の下に出す）。maskLabel＝伏せたときの札（「建設業の役員」など） */
export function netEffectText(level: NetLevel, maskLabel: string): string {
  switch (level) {
    case "open": return "直接連絡できる";
    case "intro": return "紹介依頼だけ";
    case "masked": return `${maskLabel}として見える`;
    case "hidden": return "見えない";
  }
}

// ---------- 役職の区分 ----------

const EXECUTIVE_WORDS = ["代表", "社長", "取締役", "役員", "会長", "理事"];
const MANAGER_WORDS = ["部長", "課長", "所長", "支店長", "マネージャー"];

/** 役職の区分：役員／管理職／担当者（名前を伏せたときの札に使う） */
export function roleClass(title: string): "役員" | "管理職" | "担当者" {
  if (EXECUTIVE_WORDS.some((w) => title.includes(w))) return "役員";
  if (MANAGER_WORDS.some((w) => title.includes(w))) return "管理職";
  return "担当者";
}

// ---------- 紹介料の条件 ----------

export type FeeTerms =
  | { kind: "none" } // 紹介料なし
  | { kind: "fixed"; yen: number } // 紹介料あり（◯円）
  | { kind: "percent"; percent: number } // 成約時◯%
  | { kind: "discuss" }; // 相談して決める

export const FEE_YEN_MAX = 10_000_000;
export const FEE_PERCENT_MIN = 0.1;
export const FEE_PERCENT_MAX = 50;

export const FEE_KINDS: readonly { key: FeeTerms["kind"]; label: string }[] = [
  { key: "none", label: "紹介料なし" },
  { key: "fixed", label: "紹介料あり（円）" },
  { key: "percent", label: "成約時に〇%" },
  { key: "discuss", label: "相談して決める" },
];

/** 紹介料の入力の確かめ。問題なければ null、あれば画面にそのまま出す理由 */
export function validateFee(fee: FeeTerms): string | null {
  if (fee.kind === "fixed") {
    if (!Number.isInteger(fee.yen) || fee.yen < 1 || fee.yen > FEE_YEN_MAX) {
      return `紹介料は1円から${yenText(FEE_YEN_MAX)}円までの整数で入れてください`;
    }
  }
  if (fee.kind === "percent") {
    const oneDecimal = Math.abs(fee.percent * 10 - Math.round(fee.percent * 10)) < 1e-9;
    if (!Number.isFinite(fee.percent) || fee.percent < FEE_PERCENT_MIN || fee.percent > FEE_PERCENT_MAX || !oneDecimal) {
      return `成約時の割合は${FEE_PERCENT_MIN}%から${FEE_PERCENT_MAX}%まで、小数1けたまでで入れてください`;
    }
  }
  return null;
}

function yenText(yen: number): string {
  return String(yen).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 紹介料の条件の一文（記録・確認画面で同じ言い方にする）。null＝まだ決まっていない */
export function feeText(fee: FeeTerms | null): string {
  if (!fee) return "まだ決まっていません";
  switch (fee.kind) {
    case "none": return "紹介料なし";
    case "fixed": return `紹介料 ${yenText(fee.yen)}円`;
    case "percent": return `成約時 ${fee.percent}%`;
    case "discuss": return "紹介料は相談して決める";
  }
}

// ---------- 紹介依頼の記録（A が B に頼み、B が承認して C に聞き、C が了承するとつながる） ----------

/** 紹介のおねがいの「ひとこと」の上限（直接メッセージも同じ） */
export const INTRO_NOTE_MAX = 200;

export type IntroStatus =
  | "requested" // A が B に依頼した（B の返事待ち）
  | "asking_target" // B が承認し、紹介料の条件を決めた（C の返事待ち）
  | "connected" // C が了承 → A と C がつながった
  | "declined_by_introducer" // B が辞退
  | "declined_by_target"; // C が辞退

export type IntroEvent = { at: string; status: IntroStatus; byId: string; note: string };

export type IntroRecord = {
  id: string;
  requesterId: string; // A
  introducerId: string; // B（間に入る人）
  targetId: string; // C
  note: string; // A の用件
  /** 依頼した人（A）の画面では、つながるまで C の名前を出さない */
  maskedForRequester: boolean;
  status: IntroStatus;
  /** B が承認したときに決める。決まるまで null */
  fee: FeeTerms | null;
  /** 履歴。消さない・書き換えない（足すだけ） */
  events: IntroEvent[];
};

/** 返事待ちの状態（二重に頼めない・やり取りの「届いた」に出る状態） */
export function isOpenStatus(status: IntroStatus): boolean {
  return status === "requested" || status === "asking_target";
}

function appended(rec: IntroRecord, patch: Partial<IntroRecord>, event: IntroEvent): IntroRecord {
  return { ...rec, ...patch, events: [...rec.events, event] };
}

function tooLong(note: string): boolean {
  return note.trim().length > INTRO_NOTE_MAX;
}

/** 新しい依頼。用件は空不可・上限まで。A・B・C は別人であること。許されなければ null */
export function createIntroRequest(args: {
  id: string;
  requesterId: string;
  introducerId: string;
  targetId: string;
  note: string;
  maskedForRequester: boolean;
  at: string;
}): IntroRecord | null {
  const { id, requesterId, introducerId, targetId, maskedForRequester, at } = args;
  const note = args.note.trim();
  if (!id || !requesterId || !introducerId || !targetId) return null;
  if (new Set([requesterId, introducerId, targetId]).size !== 3) return null;
  if (note === "" || tooLong(note)) return null;
  return {
    id, requesterId, introducerId, targetId, note, maskedForRequester,
    status: "requested", fee: null,
    events: [{ at, status: "requested", byId: requesterId, note }],
  };
}

/** B が承認して C に聞く。requested かつ B のときだけ。紹介料の条件が正しくなければ null */
export function approveIntro(rec: IntroRecord, byId: string, fee: FeeTerms, note: string, at: string): IntroRecord | null {
  if (rec.status !== "requested" || byId !== rec.introducerId) return null;
  if (validateFee(fee) !== null || tooLong(note)) return null;
  return appended(rec, { status: "asking_target", fee }, { at, status: "asking_target", byId, note: note.trim() });
}

/** B が辞退する。requested かつ B のときだけ */
export function declineIntro(rec: IntroRecord, byId: string, note: string, at: string): IntroRecord | null {
  if (rec.status !== "requested" || byId !== rec.introducerId || tooLong(note)) return null;
  return appended(rec, { status: "declined_by_introducer" }, { at, status: "declined_by_introducer", byId, note: note.trim() });
}

/** C が了承する（A と C がつながる）。asking_target かつ C のときだけ */
export function acceptIntro(rec: IntroRecord, byId: string, note: string, at: string): IntroRecord | null {
  if (rec.status !== "asking_target" || byId !== rec.targetId || tooLong(note)) return null;
  return appended(rec, { status: "connected" }, { at, status: "connected", byId, note: note.trim() });
}

/** C がお断りする。asking_target かつ C のときだけ */
export function refuseIntro(rec: IntroRecord, byId: string, note: string, at: string): IntroRecord | null {
  if (rec.status !== "asking_target" || byId !== rec.targetId || tooLong(note)) return null;
  return appended(rec, { status: "declined_by_target" }, { at, status: "declined_by_target", byId, note: note.trim() });
}

/** 同じ相手に、返事待ちの依頼がもうあるか（二重に頼めない） */
export function hasOpenRequest(records: readonly IntroRecord[], requesterId: string, targetId: string): boolean {
  return records.some((r) => r.requesterId === requesterId && r.targetId === targetId && isOpenStatus(r.status));
}

/** 自分の返事を待っている記録（B として requested、C として asking_target） */
export function awaitingReply(records: readonly IntroRecord[], meId: string): IntroRecord[] {
  return records.filter((r) => (r.status === "requested" && r.introducerId === meId) || (r.status === "asking_target" && r.targetId === meId));
}

/** 次の記録の id（r1, r2, …） */
export function nextIntroId(records: readonly IntroRecord[]): string {
  const max = records.reduce((m, r) => Math.max(m, Number(r.id.replace(/^r/, "")) || 0), 0);
  return `r${max + 1}`;
}
