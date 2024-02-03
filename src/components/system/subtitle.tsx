import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const subTitleVariants = cva("font-medium", {
  variants: {
    variant: {
      h1: "text-2xl",
      h2: "text-xl",
      h3: "text-lg",
      h4: "text-md",
      h5: "text-base",
      h6: "text-base font-medium",
    },
    color: {
      dark: "text-slate-500",
      light: "text-slate-300",
    },
  },
  defaultVariants: {
    variant: "h1",
    color: "dark",
  },
} as const);
export interface ISubTitleProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color">,
    VariantProps<typeof subTitleVariants> {}

export default function SubTitle({
  className,
  variant,
  color,
  ...props
}: ISubTitleProps) {
  const Comp = variant ?? "h1";
  return (
    <Comp
      className={cn(subTitleVariants({ variant, color, className }))}
      {...props}
    />
  );
}
