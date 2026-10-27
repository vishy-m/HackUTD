"use client";

import clsx from "clsx";

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200",
        checked ? "border-transparent bg-ink" : "border-line-2 bg-transparent",
      )}
    >
      <span
        className={clsx(
          "inline-block size-5 rounded-full shadow transition-transform duration-200",
          checked ? "translate-x-6 bg-bg" : "translate-x-1 bg-ink-3",
        )}
      />
    </button>
  );
}
