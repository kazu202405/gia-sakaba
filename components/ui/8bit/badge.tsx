// 8bitcn/ui の 8-bit Badge を写したもの（MIT・LICENSE.md 参照）。
// 変更点：props の型を button 用から span 用にした（中身は span の Badge に渡しているため）。

import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import { Badge as ShadcnBadge } from "@/components/ui/badge";

import "@/components/ui/8bit/styles/retro.css";

export const badgeVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
    variant: {
      default: "border-primary bg-primary",
      destructive: "border-destructive bg-destructive",
      outline: "border-background bg-background",
      secondary: "border-secondary bg-secondary",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BitBadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ children, className = "", font, variant, ...props }: BitBadgeProps) {
  const color = badgeVariants({ variant, font });

  const classes = className.split(" ");

  // 見た目のクラスはバッジ本体と左右の棒に、それ以外は外側の箱に
  const visualClasses = classes.filter(
    (c) => c.startsWith("bg-") || c.startsWith("border-") || c.startsWith("text-") || c.startsWith("rounded-"),
  );
  const containerClasses = classes.filter(
    (c) => !(c.startsWith("bg-") || c.startsWith("border-") || c.startsWith("text-") || c.startsWith("rounded-")),
  );

  return (
    <div className={cn("relative inline-flex items-stretch", containerClasses)}>
      <ShadcnBadge
        {...props}
        className={cn("h-full", "rounded-none", "w-full", font !== "normal" && "retro", visualClasses)}
        variant={variant}
      >
        {children}
      </ShadcnBadge>

      <div className={cn("-left-1.5 absolute inset-y-[4px] w-1.5", color, visualClasses)} />
      <div className={cn("-right-1.5 absolute inset-y-[4px] w-1.5", color, visualClasses)} />
    </div>
  );
}

export { Badge };
