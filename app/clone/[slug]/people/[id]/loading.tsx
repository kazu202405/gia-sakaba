// 人物詳細の遷移中スケルトン（App Router の loading.tsx）。
// 行クリック直後にこの仮表示へ即遷移し、データが揃ったら本体に差し替わる（YouTube式）。

export default function Loading() {
  return (
    <div className="px-5 sm:px-6 py-6 space-y-6 animate-pulse">
      {/* 戻る導線 */}
      <div className="h-3 w-28 bg-gray-200 rounded" />

      {/* ヘッダー（アバター＋名前） */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-2.5 w-24 bg-gray-200 rounded" />
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded" />
        </div>
        <div className="hidden sm:flex gap-2">
          <div className="h-8 w-24 bg-gray-100 rounded-md" />
          <div className="h-8 w-20 bg-gray-100 rounded-md" />
        </div>
      </div>

      {/* タブ */}
      <div className="h-8 w-64 bg-gray-100 rounded" />

      {/* Quick Edit */}
      <div className="h-20 w-full bg-gray-100 rounded-md" />

      {/* 情報カード */}
      <div className="h-52 w-full bg-gray-100 rounded-md" />

      {/* 関連セクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-md" />
        ))}
      </div>
    </div>
  );
}
