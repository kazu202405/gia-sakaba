// 職業アイコン（ドット絵）。写真があればその上に重ねる（テツジンでは写真を上げた人が441名中5名だった）。

import type { JobIconKey } from "@/lib/guild/types";
import { PixelIcon } from "./look/pixel-icon";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-10", icon: 24 },
  md: { box: "size-14", icon: 36 },
  lg: { box: "size-24 sm:size-28", icon: 64 },
};

export function JobAvatar({
  icon,
  photoUrl,
  name,
  size = "md",
  className,
}: {
  icon: JobIconKey;
  photoUrl?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border-3 border-[#1b2a41] bg-[#1b2a41] shadow-[inset_0_0_0_2px_#fffdf6]",
        s.box,
        className,
      )}
    >
      <PixelIcon icon={icon} size={s.icon} color="#e8cf8e" accent="#fffdf6" />
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}
