export type GuestGathering = {
  quest_id: string;
  title: string;
  summary: string;
  body: string;
  region: string;
  deadline: string | null;
  member_limit: number | null;
  status: "open" | "in_progress" | "completed";
  host_name: string;
  participants: { name: string; introduction: string }[];
  my_profile: { name: string; introduction: string } | null;
  my_application: { status: "applied" | "withdrawn"; show_introduction: boolean } | null;
  is_member: boolean;
};

export type GuestGatheringHost = {
  token: string | null;
  guests: {
    name: string;
    email: string;
    introduction: string;
    show_introduction: boolean;
    created_at: string;
  }[];
};

/** 招待URLのページで、申し込んだゲストに見せる参加会員（0104 sakaba_get_guest_gathering_members） */
export type GuestGatheringMember = {
  id: string;
  is_host: boolean;
  display_name: string;
  photo_url: string | null;
  job_icon: string;
  job: string;
  industry: string;
  region: string;
  headline: string;
  bio: string;
  values_text: string;
  looking_for: string;
  introductions: { author_name: string; body: string; updated_at: string }[];
};

export type GuestGatheringMembers = {
  /** 申し込んだゲスト（メール確認済み）か会員だけ true */
  can_view: boolean;
  members: GuestGatheringMember[];
  /** 会に来ない会員の人数（名前は出さない）。見られない人には null */
  other_member_count: number | null;
};
