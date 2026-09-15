// 酒場（ギルド）の型。
// DBの列名（contexts/projects/gia/sakaba_design.md §3.2）と同じ名前で書く。
// mock から Supabase に差し替えるとき、画面側で名前を付け替えなくて済むように。

/** 用語の辞書。ギルドごとに差し替える（テツジンなら quest＝「お願いごと」など） */
export type GuildTerms = {
  member: string;
  quest: string;
  party: string;
  master: string;
  status: string;
};

export type Guild = {
  id: string;
  slug: string;
  name: string;
  terms: GuildTerms;
};

export type GuildRole = "owner" | "master" | "member";

/** 職業アイコンの種類。写真が無い人でも必ず何かが出るようにする */
export type JobIconKey =
  | "web"
  | "tax"
  | "build"
  | "food"
  | "marketing"
  | "realestate"
  | "legal"
  | "design"
  | "teach"
  | "health"
  | "owner";

/** 公開範囲のまとまり。①基本 は常に公開なのでここには無い */
export type VisibleGroup = "work" | "values" | "connect";

/**
 * 見本では profiles・profile_tags・guild_members・guild_profile_settings を1つにまとめている。
 * 本番では表が分かれ、他人の分は「公開ONのまとまり」だけがRPCで返る。
 */
export type Profile = {
  id: string;
  display_name: string;
  photo_url: string | null;
  headline: string;
  industry: string;
  job: string;
  job_icon: JobIconKey;
  region: string;
  // ② 仕事
  bio: string;
  can_help_with: string;
  keywords: string[];
  // ③ 想い
  strengths: string;
  values_text: string;
  vision: string;
  // ④ つながり
  looking_for: string;
  want_to_meet: string;
  // ギルドごとの設定
  role: GuildRole;
  visible_groups: VisibleGroup[];
  accept_intro: boolean;
  joined_at: string;
};

/**
 * 連絡先。紹介が承諾された相手にだけ見せる。
 * RLSは列ごとに隠せないので、本番では profiles とは別の表（sakaba.profile_contacts）に置く。
 */
export type ProfileContact = {
  profile_id: string;
  email: string;
  line_url: string;
  website_url: string;
};

/** 旧GIA会員が gia-next で書いた内容（public.applicants の列）。本人が押したときだけ酒場に写す */
export type GiaApplicantImport = {
  name: string;
  headline: string;
  job_title: string;
  location: string;
  services_summary: string;
  want_to_connect_with: string;
};

export type QuestCategory ="work" | "consult" | "collab" | "info";
export type QuestStatus = "open" | "in_progress" | "completed";

export type Quest = {
  id: string;
  creator_id: string;
  title: string;
  category: QuestCategory;
  summary: string;
  body: string;
  region: string;
  deadline: string | null;
  member_limit: number | null;
  is_urgent: boolean;
  status: QuestStatus;
  created_at: string;
};

/**
 * 「参加したい」。見えるのは本人・出した人・ギルドマスターだけ（ほかの参加希望者には人数だけ）。
 * 出した人が「この人にお願いしたい」を押すと、quest_id 付きの紹介依頼（IntroRequest）ができる。
 * 「選ばれた」かどうかはここに持たず、紹介依頼があるかで判断する（同じ意味の列を2つ作らない）。
 */
export type QuestApplicationStatus = "applied" | "withdrawn";

export type QuestApplication = {
  quest_id: string;
  user_id: string;
  message: string;
  status: QuestApplicationStatus;
  created_at: string;
};

export type IntroPurpose = "work" | "consult" | "collab" | "info";

export type IntroStatus =
  | "requested"
  | "reviewing"
  | "proposed"
  | "accepted"
  | "introduced"
  | "declined_by_master"
  | "declined_by_target"
  | "expired"
  | "redirected"
  | "cancelled";

export type IntroOutcome = "met" | "working" | "no_fit";

export type IntroRequest = {
  id: string;
  requester_id: string;
  target_id: string;
  quest_id: string | null;
  purpose: IntroPurpose;
  message: string;
  status: IntroStatus;
  outcome: IntroOutcome | null;
  created_at: string;
  updated_at: string;
};

export type Party = {
  id: string;
  name: string;
  quest_id: string;
  member_ids: string[];
  formed_at: string;
};
