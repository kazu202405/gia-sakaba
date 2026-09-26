// コマンドで別の画面へ移るとき、中身が届くまでの間に出す仮の画面（見た目だけ）。
// guild-shell.tsx が、押した瞬間に出して、行き先の画面が届いたら消す。
// 窓は .c-window なので、夜の画面・帳面の画面どちらの色にも自動で合う。

export function GuildPageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-10">
      <span className="sr-only">読み込み中</span>
      <div aria-hidden className="space-y-3">
        <span className="guild-skeleton-bar block h-7 w-48" />
        <span className="guild-skeleton-bar block h-3 w-72 max-w-full" />
      </div>
      <SkeletonWindow lines={[80, 60]} />
      <div className="grid gap-10 md:grid-cols-2">
        <SkeletonWindow lines={[70, 90, 50]} />
        <SkeletonWindow lines={[60, 80, 40]} />
      </div>
    </div>
  );
}

function SkeletonWindow({ lines }: { lines: number[] }) {
  return (
    <section aria-hidden className="c-window space-y-4 p-4 pt-9 sm:p-6 sm:pt-10">
      <span className="c-window-title">
        <span className="guild-skeleton-dots">・・・</span>
      </span>
      {lines.map((width, index) => (
        <span key={index} className="guild-skeleton-bar block h-3.5" style={{ width: `${width}%` }} />
      ))}
    </section>
  );
}
