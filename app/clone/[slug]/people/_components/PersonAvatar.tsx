// 人物の丸アイコン。avatar_url があれば画像、無ければ頭文字を表示。
// 一覧（小）と詳細ヘッダー（大）で共用。Server Component から使える純表示。

export function PersonAvatar({
  url,
  name,
  size = 36,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const px = `${size}px`;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        style={{ width: px, height: px }}
        className="rounded-full object-cover border border-gray-200 bg-gray-100 flex-shrink-0"
      />
    );
  }
  return (
    <span
      style={{ width: px, height: px, fontSize: size * 0.42 }}
      className="inline-flex items-center justify-center rounded-full bg-[#1c3550]/8 border border-[#1c3550]/15 text-[#1c3550] font-bold flex-shrink-0"
      aria-hidden
    >
      {initial}
    </span>
  );
}
