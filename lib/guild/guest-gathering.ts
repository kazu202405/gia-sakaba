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
