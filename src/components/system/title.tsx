import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const titleVariants = cva("font-medium", {
  variants: {
    variant: {
      h0: "text-5xl sm:text-7xl leading-tight tracking-tight",
      h1: "text-4xl",
      h2: "text-2xl md:text-3xl",
      h3: "text-2xl",
      h4: "text-xl",
      h5: "text-lg",
      h6: "text-base",
    },
    color: {
      dark: "text-primary",
      darkless: "text-muted-foreground",
      light: "text-slate-300",
      white: "text-secondary",
    },
  },
  defaultVariants: {
    variant: "h1",
    color: "dark",
  },
} as const);

export interface ITitleProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color">,
  VariantProps<typeof titleVariants> {
  name?: string;
}

export default function Title({
  className,
  variant,
  color,
  ...props
}: ITitleProps) {
  const Comp = variant && variant !== "h0" ? variant : "h1";
  return (
    <Comp
      className={cn(titleVariants({ variant, color, className }))}
      {...props}
    />
  );
}
