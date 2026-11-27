import "@/components/guild/look/sns/sns.css";

export function ConstructionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="sn-sec"><div className="sn-sec-h"><h2>{title}</h2></div><div className="space-y-4">{children}</div></section>;
}

export function ConstructionField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="sn-field"><span>{label}</span>{children}</label>;
}

export function ConstructionFields({ children }: { children: React.ReactNode }) {
  return <div className="sn-form-sec">{children}</div>;
}
