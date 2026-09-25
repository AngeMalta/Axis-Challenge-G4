import { statusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Charger status as a tinted badge with a dot; "Em uso" pulses to show energy flowing. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-1.5 text-xs font-medium leading-5",
        meta.badge,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {status === "occupied" && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden",
              meta.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", meta.dot)} />
      </span>
      {meta.label}
    </span>
  );
}
