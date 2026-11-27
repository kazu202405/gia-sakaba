"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SnsFrame } from "@/components/guild/look/sns/frame";
import { createClient } from "@/lib/supabase/client";
import { setAppIconBadge } from "@/lib/guild/app-badge";

export function ConstructionFrame({ children, base, title, slug, initialUnread }: {
  children: React.ReactNode;
  base: string;
  title: string;
  slug: string;
  initialUnread: number;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);
  useEffect(() => {
    let ignore = false;
    const reload = () => {
      void createClient().rpc("sakaba_list_my_notifications", { p_guild_slug: slug }).then(({ data, error }) => {
        if (!ignore && !error && Array.isArray(data)) setUnread(data.filter((item) => item.read_at === null).length);
      });
    };
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => { ignore = true; document.removeEventListener("visibilitychange", onVisible); };
  }, [pathname, slug]);
  useEffect(() => { setAppIconBadge(unread); }, [unread]);

  return <SnsFrame base={base} title={title} notice={{ href: base + "/notifications", unread }}>{children}</SnsFrame>;
}
