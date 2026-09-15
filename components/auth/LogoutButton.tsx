"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  /** カスタム className を渡せる。未指定時は subtle なテキストリンク風 */
  className?: string;
  /** ログアウト後の遷移先（デフォルトはトップ "/"） */
  redirectTo?: string;
  /** アイコンを出すか（デフォルト true） */
  showIcon?: boolean;
  /** ラベル文字列（デフォルト "ログアウト"） */
  label?: string;
}

/**
 * Supabase Auth の signOut + 任意 URL への遷移を行う共通ボタン。
 * Server Component からも import 可能（client boundary 化される）。
 */
export function LogoutButton({
  className,
  redirectTo = "/",
  showIcon = true,
  label = "ログアウト",
}: LogoutButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.refresh();
    router.push(redirectTo);
  };

  const defaultClass =
    "inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className ?? defaultClass}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        showIcon && <LogOut className="w-4 h-4" />
      )}
      <span>{loading ? "ログアウト中..." : label}</span>
    </button>
  );
}
