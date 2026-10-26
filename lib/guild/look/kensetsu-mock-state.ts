// 建設・不動産の酒場モックの「画面の中の状態」を動かす、副作用のない関数群（reducer）。
// 仮データ・決まりは lib/guild/look/kensetsu-mock.ts。ここは「どう変わるか」だけ。
// 状態は進む向きだけ（canTransition が許すものだけ動く）。許さない操作は、状態をそのまま返す。

import {
  DEFAULT_PREFECTURE,
  MEMBERS,
  PARTNERS,
  PHOTO_MAX,
  SEED_NOTICES,
  SEED_REFERRALS,
  canTransition,
  findReceiver,
  isKindKey,
  summaryOf,
  type KindKey,
  type Member,
  type Notice,
  type Photo,
  type Referral,
  type Status,
  type TimingKey,
} from "./kensetsu-mock";

export type Draft = {
  kind: KindKey;
  prefecture: string;
  city: string;
  timing: TimingKey | "";
  body: string;
  photos: Photo[];
  consent: boolean;
  /** 送り終えた下書き。次に相談を出すときは作り直す */
  sent: boolean;
};

export type MockState = {
  members: readonly Member[];
  referrals: readonly Referral[];
  notices: readonly Notice[];
  draft: Draft;
  nextId: number;
};

export function emptyDraft(kind: KindKey = "construction"): Draft {
  return { kind, prefecture: DEFAULT_PREFECTURE, city: "", timing: "", body: "", photos: [], consent: false, sent: false };
}

export function initialState(): MockState {
  return { members: MEMBERS, referrals: SEED_REFERRALS, notices: SEED_NOTICES, draft: emptyDraft(), nextId: 100 };
}

export type MockAction =
  | { type: "startDraft"; kind: string | null }
  | { type: "patchDraft"; patch: Partial<Omit<Draft, "photos">> }
  | { type: "addPhotos"; photos: Photo[] }
  | { type: "removePhoto"; id: string }
  | { type: "submit"; requesterId: string; now: number }
  | { type: "adminOpen"; id: string; now: number }
  | { type: "pass"; id: string; receiverId: string; now: number }
  | { type: "connect"; id: string; now: number }
  | { type: "decline"; id: string; note: string; now: number }
  | { type: "withdraw"; id: string; now: number }
  | { type: "raiseHand"; id: string; memberId: string }
  | { type: "readNotice"; id: string }
  | { type: "saveProfile"; memberId: string; patch: Partial<Pick<Member, "industry" | "areas" | "works" | "hasConstructionLicense" | "hasRealEstateLicense" | "photos" | "photoCount">> };

function patchReferral(state: MockState, id: string, patch: Partial<Referral>): MockState {
  return { ...state, referrals: state.referrals.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

function addNotice(state: MockState, notice: Omit<Notice, "id" | "read">): MockState {
  const id = `n${state.nextId}`;
  return { ...state, nextId: state.nextId + 1, notices: [{ ...notice, id, read: false }, ...state.notices] };
}

const ADMIN_ID = "m-admin";

function progressNotice(state: MockState, r: Referral, text: string, now: number): MockState {
  return addNotice(state, { forMemberId: r.requesterId, kind: "referral_progress", text: `「${summaryOf(r.body)}」${text}`, at: now, referralId: r.id });
}

/** 手を挙げた人に、結果を知らせる（選ばれた人を除く） */
function replyToHands(state: MockState, r: Referral, text: string, now: number, exceptId?: string): MockState {
  return r.interestedIds
    .filter((memberId) => memberId !== exceptId)
    .reduce((s, memberId) => addNotice(s, { forMemberId: memberId, kind: "hand_reply", text: `手を挙げた「${summaryOf(r.body)}」${text}`, at: now, referralId: r.id }), state);
}

export function reduce(state: MockState, action: MockAction): MockState {
  switch (action.type) {
    case "startDraft": {
      const kind = isKindKey(action.kind) ? action.kind : state.draft.kind;
      // 同じ種類の途中の下書きは残す（戻っても入力が消えない）。送り終えた・別の種類なら作り直す
      if (!state.draft.sent && state.draft.kind === kind) return state;
      return { ...state, draft: emptyDraft(kind) };
    }
    case "patchDraft":
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case "addPhotos": {
      const room = PHOTO_MAX - state.draft.photos.length;
      if (room <= 0) return state;
      return { ...state, draft: { ...state.draft, photos: [...state.draft.photos, ...action.photos.slice(0, room)] } };
    }
    case "removePhoto":
      return { ...state, draft: { ...state.draft, photos: state.draft.photos.filter((p) => p.id !== action.id) } };
    case "submit": {
      const d = state.draft;
      if (d.sent || !d.consent || !d.timing || !d.prefecture || !d.body.trim()) return state;
      const id = `r${state.nextId}`;
      const referral: Referral = {
        id, requesterId: action.requesterId, kind: d.kind, prefecture: d.prefecture, city: d.city.trim(), timing: d.timing,
        body: d.body.trim(), photos: d.photos, status: "received", createdAt: action.now, interestedIds: [],
      };
      const next: MockState = { ...state, nextId: state.nextId + 1, referrals: [referral, ...state.referrals], draft: { ...d, sent: true } };
      return addNotice(next, { forMemberId: ADMIN_ID, kind: "referral_received", text: `新しい相談が届きました（${summaryOf(referral.body)}）`, at: action.now, referralId: id });
    }
    case "adminOpen": {
      const r = state.referrals.find((x) => x.id === action.id);
      if (!r || !canTransition(r.status, "reviewed") || r.status !== "received") return state;
      return progressNotice(patchReferral(state, r.id, { status: "reviewed", reviewedAt: action.now }), r, "を、管理者が確認しました", action.now);
    }
    case "pass": {
      const r = state.referrals.find((x) => x.id === action.id);
      const receiver = findReceiver(action.receiverId, state.members);
      if (!r || !receiver || !canTransition(r.status, "passed")) return state;
      const patch: Partial<Referral> = { status: "passed", passedAt: action.now, passedToId: receiver.id, reviewedAt: r.reviewedAt ?? action.now };
      let next = patchReferral(state, r.id, patch);
      next = progressNotice(next, r, `が、${receiver.name}に相談中に進みました`, action.now);
      // 手を挙げた人本人に渡したなら「つながります」、そうでなければ別の先に決まったことを知らせる
      if (receiver.source === "member") {
        next = addNotice(next, { forMemberId: receiver.id, kind: "hand_reply", text: `手を挙げた「${summaryOf(r.body)}」について、管理者から連絡が入ります`, at: action.now, referralId: r.id });
      }
      return replyToHands(next, r, "は、別の方に相談中です", action.now, receiver.source === "member" ? receiver.id : undefined);
    }
    case "connect": {
      const r = state.referrals.find((x) => x.id === action.id);
      if (!r || !canTransition(r.status, "connected")) return state;
      return progressNotice(patchReferral(state, r.id, { status: "connected", connectedAt: action.now, closedAt: action.now }), r, "が、つながりました", action.now);
    }
    case "decline": {
      const r = state.referrals.find((x) => x.id === action.id);
      const note = action.note.trim();
      // ひとこと必須。黙って見送らない
      if (!r || !note || !canTransition(r.status, "declined")) return state;
      let next = patchReferral(state, r.id, { status: "declined", closedAt: action.now, closeNote: note });
      next = progressNotice(next, r, "は、見送りになりました。理由をお読みください", action.now);
      return replyToHands(next, r, "は、見送りになりました", action.now);
    }
    case "withdraw": {
      const r = state.referrals.find((x) => x.id === action.id);
      if (!r || !canTransition(r.status, "withdrawn")) return state;
      return patchReferral(state, r.id, { status: "withdrawn", withdrawnAt: action.now, closedAt: action.now });
    }
    case "raiseHand": {
      const r = state.referrals.find((x) => x.id === action.id);
      if (!r || r.interestedIds.includes(action.memberId) || !(r.status === "received" || r.status === "reviewed")) return state;
      return patchReferral(state, r.id, { interestedIds: [...r.interestedIds, action.memberId] });
    }
    case "readNotice":
      return { ...state, notices: state.notices.map((n) => (n.id === action.id ? { ...n, read: true } : n)) };
    case "saveProfile":
      return {
        ...state,
        members: state.members.map((m) => (m.id === action.memberId ? { ...m, ...action.patch } : m)),
      };
    default:
      return state;
  }
}

/** 渡し先の一覧にある id か（テスト・画面の確認用） */
export function isPartnerId(id: string): boolean {
  return PARTNERS.some((p) => p.id === id);
}

export function statusOf(state: MockState, id: string): Status | null {
  return state.referrals.find((r) => r.id === id)?.status ?? null;
}
