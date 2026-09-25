import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * A row of related numbers in one surface, split by hairlines, instead of a
 * separate card per number. Wraps to two columns on phones.
 */
export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-border shadow-xs gap-px",
        "sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]",
        // An odd last metric fills the row on phones instead of leaving a grey gap.
        "[&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Metric({
  label,
  value,
  unit,
  hint,
  loading,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  unit?: string | undefined;
  hint?: ReactNode;
  loading?: boolean | undefined;
  /** Marks the one number the page is about (e.g. revenue). */
  emphasis?: boolean | undefined;
}) {
  return (
    <div className="bg-card px-4 py-3.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-1 flex items-baseline gap-1 figures">
          <span
            className={cn(
              "font-display text-[1.375rem] font-semibold leading-8 tracking-[-0.02em] [font-stretch:108%]",
              emphasis && "text-[1.5rem]",
            )}
          >
            {value}
          </span>
          {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
        </p>
      )}
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
