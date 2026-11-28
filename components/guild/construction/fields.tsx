import "@/components/guild/look/sns/sns.css";

export function ConstructionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="sn-sec"><div className="sn-sec-h"><h2>{title}</h2></div><div className="space-y-4">{children}</div></section>;
}

// group：中にボタンがある欄（期限の「期限なしにする」など）。label で包むと iPhone ではボタンを押しても日付の欄が開く
export function ConstructionField({ label, children, group = false }: { label: string; children: React.ReactNode; group?: boolean }) {
  if (group) return <div className="sn-field" role="group" aria-label={label}><span>{label}</span>{children}</div>;
  return <label className="sn-field"><span>{label}</span>{children}</label>;
}

export function ConstructionFields({ children }: { children: React.ReactNode }) {
  return <div className="sn-form-sec">{children}</div>;
}
