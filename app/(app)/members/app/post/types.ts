// --- 型定義 ---
export type ParticipantRole = "owner" | "admin" | "member";

export interface Participant {
  id: string;
  name: string;
  photoUrl: string;
  role?: ParticipantRole;
}

export interface MyProfile extends Participant {
  company: string;
  position: string;
  bio: string;
}

export interface PendingParticipant extends Participant {
  appliedAt: string;
  message?: string;
}

export interface Series {
  id: string;
  name: string;
  description: string;
  organizer: Participant;
  totalEvents: number;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  organizer: Participant;
  participantCount: number;
  participants: Participant[];
  pendingParticipants: PendingParticipant[];
  capacity: number | null;
  status: "upcoming" | "past";
  isHost: boolean;
  seriesId?: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "error" | "info";
}
