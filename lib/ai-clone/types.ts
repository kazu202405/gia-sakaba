// AI Clone の共通型定義

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO 8601
  end: string;
  attendees?: { email: string; displayName?: string }[];
  location?: string;
  meetingUrl?: string;
}

export interface RelatedDoc {
  id: string;
  name: string;
  url: string;
  modifiedAt: string;
  matchedBy: "title" | "attendee" | "explicit-link";
}

export interface BriefingItem {
  event: CalendarEvent;
  relatedDocs: RelatedDoc[];
  status: "ready" | "missing" | "warning";
  reason?: string;
  recommendedAction?: string;
}

export interface BriefingResult {
  date: string; // YYYY-MM-DD
  generatedAt: string; // ISO
  items: BriefingItem[];
  summary: string; // 1段落のAI要約
}

export interface ExecutiveContext {
  mission: string;
  threeYearPlan: string;
  yearlyKPI: string;
  decisionPrinciples: string;
  stakeholders: string;
}
