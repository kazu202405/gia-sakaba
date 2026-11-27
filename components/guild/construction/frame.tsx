"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SnsFrame } from "@/components/guild/look/sns/frame";
import { createClient } from "@/lib/supabase/client";
import { setAppIconBadge } from "@/lib/guild/app-badge";
import { CONSTRUCTION_PALETTE_COOKIE, PALETTES, type PaletteKey } from "@/lib/guild/sns-theme";

const ConstructionThemeContext = createContext<{
  palette: PaletteKey;
  selectPalette: (palette: PaletteKey) => void;
} | null>(null);

export function ConstructionFrame({ children, base, title, slug, initialUnread, initialPalette }: {
  children: React.ReactNode;
  base: string;
  title: string;
  slug: string;
  initialUnread: number;
  initialPalette: PaletteKey;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);
  const [palette, setPalette] = useState(initialPalette);
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

  function selectPalette(nextPalette: PaletteKey) {
    setPalette(nextPalette);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSTRUCTION_PALETTE_COOKIE}=${nextPalette}; Path=${base}; Max-Age=31536000; SameSite=Lax${secure}`;
  }

  return (
    <ConstructionThemeContext.Provider value={{ palette, selectPalette }}>
      <SnsFrame base={base} title={title} palette={palette} notice={{ href: base + "/notifications", unread }}>{children}</SnsFrame>
    </ConstructionThemeContext.Provider>
  );
}

export function ConstructionThemeSettings() {
  const theme = useContext(ConstructionThemeContext);
  if (!theme) return null;
  return (
    <div className="sn-theme-setting" role="group" aria-label="テーマカラー">
      <b>テーマカラー</b>
      <div className="sn-segment">
        {PALETTES.map(({ key, label }) => (
          <button key={key} type="button" aria-pressed={theme.palette === key} onClick={() => theme.selectPalette(key)}>
            <span className="sn-theme-swatch" data-color={key} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
