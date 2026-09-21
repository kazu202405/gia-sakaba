"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNext(value: string | null): string {
  return value?.startsWith("/guild") && !value.startsWith("//") ? value : "/guild";
}

export default function GuildLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (data.user) {
        router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
        return;
      }
      setBusy(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("メールアドレスまたはパスワードを確認してください。");
      setBusy(false);
      return;
    }

    router.refresh();
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
  }

  return (
    <main className="guild-theme grid min-h-screen place-items-center px-4 py-12">
      <section className="c-window w-full max-w-md p-6 pt-10 sm:p-8 sm:pt-11">
        <h1 className="c-window-title">GIAの酒場</h1>
        <p className="text-center text-xl tracking-[0.14em]">ログイン</p>
        <p className="c-muted mt-2 text-center text-sm">GIAで登録しているメールアドレスとパスワードを入力してください。</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {error && <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <label className="block">
            <span className="mb-1 block text-sm">メールアドレス</span>
            <input className="c-input h-11" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">パスワード</span>
            <input className="c-input h-11" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button type="submit" className="c-button w-full" disabled={busy || !email.trim() || !password}>
            {busy ? "確認中..." : "酒場に入る"}
          </button>
        </form>
      </section>
    </main>
  );
}
