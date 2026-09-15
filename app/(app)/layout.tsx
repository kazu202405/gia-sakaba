import { AppSidebar } from "@/components/app/app-sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      {/* mobile: top header（h-14）分の上余白 + bottom tab（h-16）分の下余白／
          desktop: 左サイドバー（w-64）分の左余白（下タブは非表示なので下余白は不要） */}
      <main className="lg:pl-64 pt-14 lg:pt-0 pb-16 lg:pb-0">{children}</main>
    </div>
  );
}
