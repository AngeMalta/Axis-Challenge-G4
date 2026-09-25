import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Metric, MetricStrip } from "@/components/Metric";
import { EmptyState, Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BRL, fmt, num } from "@/lib/axis";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Minhas recargas — AXIS" },
      { name: "description", content: "Histórico de recargas, energia consumida e valores pagos." },
      { property: "og:title", content: "Minhas recargas — AXIS" },
      { property: "og:description", content: "Histórico de recargas, energia consumida e valores pagos." },
    ],
  }),
  component: History,
});

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-status-busy/25 bg-status-busy/12 px-1.5 text-xs font-medium leading-5 text-status-busy">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-busy opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-1.5 rounded-full bg-status-busy" />
      </span>
      Ao vivo
    </span>
  );
}

function History() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("charging_sessions")
        .select("*, chargers(name, address)")
        .eq("user_id", auth.user.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = sessions.reduce((s, x) => s + num(x.cost), 0);
  const energy = sessions.reduce((s, x) => s + num(x.energy_kwh), 0);
  const chargerName = (s: (typeof sessions)[number]) =>
    (s.chargers as { name: string } | null)?.name ?? "Carregador";

  return (
    <div className="space-y-4">
      <PageHeader title="Minhas recargas" subtitle="Energia, tempo e valor de cada recarga" />

      <MetricStrip className="sm:grid-cols-3">
        <Metric label="Recargas" value={sessions.length} loading={isLoading} />
        <Metric label="Energia total" value={fmt(energy, 1)} unit="kWh" loading={isLoading} />
        <Metric label="Total gasto" value={BRL(total)} loading={isLoading} />
      </MetricStrip>

      <Panel className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<Zap />}
            title="Você ainda não recarregou"
            description="Encontre um carregador livre perto de você e comece sua primeira recarga."
            action={
              <Button asChild>
                <Link to="/map">Encontrar carregador</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Phones: stacked rows */}
            <ul className="divide-y divide-border md:hidden">
              {sessions.map((s) => {
                const live = s.status === "active";
                const row = (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{chargerName(s)}</p>
                        {live && <LiveBadge />}
                      </div>
                      <p className="mt-0.5 flex gap-3 text-xs text-muted-foreground figures">
                        <span>{when(s.started_at)}</span>
                        <span>{fmt(num(s.energy_kwh), 2)} kWh</span>
                        <span>{s.minutes} min</span>
                      </p>
                    </div>
                    <span className="font-semibold figures">{BRL(num(s.cost))}</span>
                    {live && <ChevronRight className="size-4 text-muted-foreground" />}
                  </div>
                );
                return (
                  <li key={s.id}>
                    {live ? (
                      <Link
                        to="/session/$id"
                        params={{ id: s.id }}
                        className="block hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                      >
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Tablets and up: table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Carregador</TableHead>
                  <TableHead className="text-right">Energia</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-32 text-right">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{when(s.started_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{chargerName(s)}</span>
                        {s.status === "active" && <LiveBadge />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{fmt(num(s.energy_kwh), 2)} kWh</TableCell>
                    <TableCell className="text-right">{s.minutes} min</TableCell>
                    <TableCell className="text-right font-semibold">{BRL(num(s.cost))}</TableCell>
                    <TableCell className="text-right">
                      {s.status === "active" && (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/session/$id" params={{ id: s.id }}>
                            Acompanhar
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Panel>
    </div>
  );
}
