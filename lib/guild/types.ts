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

export type QuestCategory = "work" | "consult" | "collab" | "info" | "gathering";
/** withdrawn＝出した人が取り下げた。けいじばんには出さない */
export type QuestStatus = "open" | "in_progress" | "completed" | "withdrawn";

/** クエストをなおしたときに「どこが変わったか」を知らせる単位（入力画面の項目と同じ） */
export type QuestField = "category" | "title" | "summary" | "body" | "region" | "deadline" | "member_limit" | "is_urgent";

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
  /** 有料会員だけが くわしい内容を見て 参加できる。出せるのは ギルドマスターだけ（リアルの集まりなど） */
  members_only: boolean;
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

/**
 * 自分（たち）が主体で進めること。クエスト＝外から来る仕事、プロジェクト＝中で進める仕事。
 * 見える人は owner と member_ids だけ（ギルドマスターにも見えない）。member_ids が空なら本人だけ。
 * 本番は sakaba.projects と sakaba.project_members。
 */
export type Project = {
  id: string;
  owner_id: string;
  title: string;
  /** なにができたら おわりか */
  goal: string;
  /** 備考。内容の管理ではなく、タスクを進めるための控え */
  memo: string;
  /** クエストから始まったとき */
  source_quest_id: string | null;
  /** 一緒に進める人（パーティ）。owner は含めない */
  member_ids: string[];
  status: ProjectStatus;
  /** 期間のはじまり。入れなければ作った日 */
  start_date: string;
  due_date: string | null;
  created_at: string;
  done_at: string | null;
};

export type ProjectStatus = "active" | "done";

export type TaskStatus = "todo" | "done";

export type ProjectTask = {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  /** null はだれでも（本人だけのプロジェクトなら本人） */
  assignee_id: string | null;
  /** 入れると工程表で期間のバーになる。無ければしめきりの◆だけ */
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  done_at: string | null;
};

/**
 * 人ごとの すすみ（営業など、同じ手順を何人にも進める仕事）。
 * 行＝相手、列＝ステップ、ます目＝予定日と完了日。連絡先や商談の内容は持たない（呼び名と ひとことメモだけ）。
 */
export type ProjectStep = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
};

export type ProjectContact = {
  id: string;
  project_id: string;
  /** 呼び名だけ（例：Aさん（工務店）） */
  label: string;
  /** ひとことメモ。連絡先は書かない */
  memo: string;
  sort_order: number;
};

export type StepRecord = {
  contact_id: string;
  step_id: string;
  planned_on: string | null;
  done_on: string | null;
};

export type NotificationKind = "quest_applied" | "quest_updated" | "quest_withdrawn" | "intro_progress";

/**
 * 酒場の中の「おしらせ」。メール・LINEにはまだ送らない。
 * 本番は sakaba.notifications（読めるのは本人だけ・作るのはRPCとトリガーだけ）。
 * 文面は保存せず、種類と参照先から画面で組み立てる（lib/guild/notifications.ts）。
 */
export type GuildNotification = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  /** 知らせのきっかけを作った人（参加したいと伝えた人など） */
  actor_id: string | null;
  quest_id: string | null;
  intro_request_id: string | null;
  /** 知らせた時点の紹介の状態。あとで依頼が進んでも、この知らせの文面は変えない */
  intro_status: IntroStatus | null;
  /** quest_updated のときだけ入る */
  changed_fields: QuestField[];
  read_at: string | null;
  created_at: string;
};
