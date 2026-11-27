import { Window } from "@/components/guild/cards";
import "@/components/guild/look/sns/sns.css";

export function ConstructionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <Window title={title}><div className="space-y-5">{children}</div></Window>;
}

export function ConstructionField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="sn-field"><span>{label}</span>{children}</label>;
}

export function ConstructionFields({ children }: { children: React.ReactNode }) {
  return <div className="sn space-y-4">{children}</div>;
}
