import clsx from "clsx";
import type { ReactNode } from "react";

/** Card section with a quiet heading row. */
export function Panel({
  title,
  aside,
  children,
  className,
  id,
  as: As = "section",
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
}) {
  return (
    <As id={id} tabIndex={id ? -1 : undefined} aria-label={typeof title === "string" ? title : undefined} className={clsx("glass scroll-mt-24 rounded-xl p-5 outline-none sm:p-6", className)}>
      {(title || aside) && (
        <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
          {aside && <div className="flex items-center gap-1.5">{aside}</div>}
        </div>
      )}
      {children}
    </As>
  );
}
