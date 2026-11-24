import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface AdminPanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Shared glass surface for every admin dashboard card.
 *
 * Keeps the heading rhythm and padding identical across independent sections so
 * later tasks only supply content, not chrome.
 */
export function AdminPanel({
  title,
  description,
  action,
  className,
  children,
}: AdminPanelProps) {
  return (
    <section className={cn("glass-component min-w-0 p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-primary">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-gray-tertiary">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
