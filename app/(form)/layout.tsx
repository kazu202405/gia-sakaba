// フォーム系ページ用の minimal レイアウト。
// /join, /login, /upgrade, /upgrade/success, /join/complete などが該当。
// 通常のサイトナビ（Header / Footer）は不要、ScrollProgress / SmoothScroll も切る。
// 紙質感のグレインテクスチャだけは (main) と揃えて残す。

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <main>{children}</main>
    </>
  );
}
