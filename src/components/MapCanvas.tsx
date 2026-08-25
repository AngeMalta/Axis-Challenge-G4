import { Suspense, lazy } from "react";
import type { ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";

const ChargerMap = lazy(() => import("@/components/ChargerMap"));

type Props = ComponentProps<typeof ChargerMap>;

function MapSkeleton() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

export function MapCanvas(props: Props) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <ChargerMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
