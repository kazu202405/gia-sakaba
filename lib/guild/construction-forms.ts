import { z } from "zod";
import { INDUSTRIES, POST_CATEGORIES, POST_VISIBILITIES, PREFECTURES } from "./look/sns-mock";

export const constructionId = z.string().uuid();
const prefecture = z.string().refine((value) => PREFECTURES.includes(value));
const areas = z.array(prefecture).min(1).max(47);
const industry = z.enum(INDUSTRIES);
const category = z.custom<ConstructionPost["category"]>((value) => POST_CATEGORIES.some(({ key }) => key === value));
const visibility = z.custom<ConstructionPost["visibility"]>((value) => POST_VISIBILITIES.some(({ key }) => key === value));

export const constructionPost = z.object({
  title: z.string().trim().min(1).max(60),
  category,
  industry,
  body: z.string().trim().min(1).max(600),
  areas,
  visibility,
  deadline: z.union([z.literal(""), z.string().date()]),
});

export type ConstructionPost = {
  id: string;
  author_id: string;
  title: string;
  category: (typeof POST_CATEGORIES)[number]["key"];
  industry: (typeof INDUSTRIES)[number];
  body: string;
  contact: string | null;
  deadline: string | null;
  visibility: (typeof POST_VISIBILITIES)[number]["key"];
  areas: string[];
  reply_count: number;
  created_at: string;
};
export type ConstructionReply = { author_id: string; kind: "can" | "know"; note: string; created_at: string };
export type ConstructionConnection = { id: string; friend_id: string; requested_by: string; status: "pending" | "connected" | "declined" };
export type ConstructionCandidate = { route_id: string; target_id: string | null; masked: boolean; label: string };
export type ConstructionIntro = {
  id: string;
  requester_id: string;
  introducer_id: string;
  target_id: string | null;
  masked: boolean;
  status: "requested" | "asking_target" | "connected" | "declined_by_introducer" | "declined_by_target";
  note: string;
  fee_kind: "none" | "fixed" | "percent" | "discuss" | null;
  fee_value: number | null;
  events: { status: ConstructionIntro["status"]; note: string; at: string; actor_id: string | null }[];
};
export type ConstructionCompany = {
  id: string;
  name: string;
  prefecture: string;
  industries: (typeof INDUSTRIES)[number][];
  business: string;
  website: string;
  areas: string[];
  licenses: { kind: string; issuer: string; number: string; verified: boolean }[];
  members: { user_id: string; title: string }[];
};

export const constructionCompany = z.object({
  name: z.string().trim().min(1).max(100),
  prefecture,
  industries: z.array(industry).min(1).max(4),
  areas,
  business: z.string().trim().max(600),
  website: z.string().trim().max(500).refine((value) => value === "" || /^https?:\/\/\S+$/.test(value)),
  title: z.string().trim().max(80),
});

export type ConstructionResult = { error: string } | { message: string; href?: string };
