// /clone/[slug]/* 各ページの遷移中スケルトン（共通）。
// 各セグメントの loading.tsx から variant 指定で呼ぶ。クリック直後に即この骨組みへ
// 遷移し、データが揃ったら本体に差し替わる（YouTube式）。

export function PageSkeleton({
  variant = "default",
}: {
  variant?: "default" | "dashboard";
}) {
  return (
    <div className="px-5 sm:px-6 py-6 space-y-6 animate-pulse">
      {/* ヘッダー（eyebrow / title / 右アクション） */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-2.5 w-28 bg-gray-200 rounded" />
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
        </div>
        <div className="hidden sm:flex gap-2">
          <div className="h-8 w-20 bg-gray-100 rounded-md" />
          <div className="h-8 w-24 bg-gray-100 rounded-md" />
        </div>
      </div>

      {variant === "dashboard" ? (
        <>
          {/* メトリクスカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-md" />
            ))}
          </div>
          {/* セクション2つ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-56 bg-gray-100 rounded-md" />
            <div className="h-56 bg-gray-100 rounded-md" />
          </div>
        </>
      ) : (
        <>
          {/* フィルタ風バー */}
          <div className="h-12 w-full bg-gray-100 rounded-md" />
          {/* 一覧/カード骨組み */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="h-10 bg-gray-50" />
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-white" />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
