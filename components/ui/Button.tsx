"use client";

import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "solid" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  // Red only for the one action that commits to a move.
  primary: "bg-accent text-white hover:brightness-110 active:brightness-95 shadow-[0_8px_24px_-10px_rgba(235,10,30,0.7)]",
  solid: "bg-ink text-bg hover:opacity-90 active:opacity-80",
  outline: "border border-line-2 text-ink hover:bg-[var(--glass-hi)] active:bg-line",
  ghost: "text-ink-2 hover:text-ink hover:bg-[var(--glass-hi)]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "inline-flex select-none items-center justify-center font-medium whitespace-nowrap transition-[background,color,filter,opacity,transform] duration-150 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
});

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-[var(--glass-hi)] hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
