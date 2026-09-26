// 入会のつながり（0105 sakaba_get_invite_path の戻り値）

export type InvitePathNode =
  | { kind: "me"; id: string; name: string }
  | { kind: "member"; id: string; name: string }
  /** 入会のつながりで名前を出さない設定の人 */
  | { kind: "anonymous"; id: null; name: "" }
  /** 停止中・退会済みの人 */
  | { kind: "former"; id: null; name: "" };

export type InvitePath = {
  /** ok＝つながりあり／hidden＝相手が公開していない／none＝見つからない */
  status: "ok" | "hidden" | "none";
  nodes: InvitePathNode[];
  /** 自分が名前を出さない設定か */
  my_hide?: boolean;
};
