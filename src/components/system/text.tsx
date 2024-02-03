import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textVariants = cva("font-light", {
  variants: {
    variant: {
      h0: "text-5xl",
      h1: "text-xl",
      h2: "text-lg",
      h3: "text-md",
      h4: "text-base",
      h5: "text-sm",
      h6: "text-xs",
    },
    color: {
      dark: "text-primary",
      gray: "text-muted-foreground",
      light: "text-secondary",
      error: "text-destructive",
      white: "text-white",
    },
    weight: {
      light: "font-light",
      normal: "font-normal",
      bold: "font-bold",
    },
    as: {
      p: "",
      ul: "list-disc list-inside",
      li: "my-2",
      span: "",
    }
  },
  defaultVariants: {
    variant: "h4",
    color: "dark",
    weight: "light",
    as: "p",
  },
} as const);
export interface ITextProps
  extends Omit<
    React.HTMLAttributes<HTMLParagraphElement | HTMLSpanElement | HTMLUListElement | HTMLLIElement>,
    "color"
  >,
  VariantProps<typeof textVariants> {
  as?: "p" | "span" | "ul" | "li";
}

export default function Text({
  className,
  variant,
  color,
  weight,
  as = "p",
  ...props
}: ITextProps) {
  const Comp = as;
  return (
    <Comp
      className={cn(textVariants({ variant, color, className, weight, as }))}
      {...props}
    />
  );
}
