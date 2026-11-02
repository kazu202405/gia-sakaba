import { FREE_JOIN_COPY } from "@/lib/guild/join";

// 登録の入口の「無料です」の案内。登録と入会の2画面で同じものを出す。
export function FreeJoinBand() {
  return (
    <div className="c-card mb-6 px-4 py-3">
      <p className="text-[15px] tracking-wider">{FREE_JOIN_COPY.title}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {FREE_JOIN_COPY.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
    </div>
  );
}
