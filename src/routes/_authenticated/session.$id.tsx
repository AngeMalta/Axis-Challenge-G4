import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Metric, MetricStrip } from "@/components/Metric";
import { Panel } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BRL, fmt, num } from "@/lib/axis";

export const Route = createFileRoute("/_authenticated/session/$id")({
  head: () => ({
    meta: [
      { title: "Sessão de recarga ao vivo — AXIS" },
      { name: "description", content: "Acompanhe potência, energia acumulada, fila e tempo restante." },
      { property: "og:title", content: "Sessão de recarga ao vivo — AXIS" },
      { property: "og:description", content: "Potência, energia acumulada, fila e tempo restante em tempo real." },
    ],
  }),
  component: LiveSession,
});

function LiveSession() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);
  const lastPush = useRef(0);

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charging_sessions")
        .select("*, chargers(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: queue = [] } = useQuery({
    queryKey: ["queue", session?.charger_id],
    enabled: !!session?.charger_id,
    queryFn: async () => {
      const { data } = await supabase.from("charger_queue").select("id").eq("charger_id", session!.charger_id);
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const charger = session?.chargers as
    | { name: string; power_kw: number; price_per_kwh: number; price_per_minute: number; id: string }
    | undefined;

  const active = session?.status === "active";
  const elapsedMin = session ? (Date.now() - new Date(session.started_at).getTime()) / 60000 : 0;
  const powerKw = active ? num(charger?.power_kw, 22) : 0;
  const target = num(session?.target_kwh, 30);
  const energy = active ? Math.min(target, (powerKw * elapsedMin) / 60) : num(session?.energy_kwh);
  const cost = energy * num(charger?.price_per_kwh) + elapsedMin * num(charger?.price_per_minute);
  const percent = Math.min(100, (energy / target) * 100);
  const remainingMin = active ? Math.max(0, Math.round(((target - energy) / (powerKw || 1)) * 60)) : 0;
  const battery = Math.min(100, Math.round(20 + percent * 0.8));

  // persist live values every ~15s so the merchant dashboard sees them
  useEffect(() => {
    if (!active) return;
    if (tick - lastPush.current < 15) return;
    lastPush.current = tick;
    supabase
      .from("charging_sessions")
      .update({
        energy_kwh: Number(energy.toFixed(3)),
        minutes: Math.round(elapsedMin),
        current_power_kw: powerKw,
        battery_percent: battery,
        cost: Number(cost.toFixed(2)),
      })
      .eq("id", id)
      .then(() => {});
  }, [tick, active, energy, elapsedMin, powerKw, battery, cost, id]);

  const finish = async () => {
    await supabase
      .from("charging_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        energy_kwh: Number(energy.toFixed(3)),
        minutes: Math.round(elapsedMin),
        current_power_kw: 0,
        battery_percent: battery,
        cost: Number(cost.toFixed(2)),
      })
      .eq("id", id);
    if (charger) await supabase.from("chargers").update({ status: "available" }).eq("id", charger.id);
    qc.invalidateQueries();
    toast.success(`Recarga finalizada · ${BRL(cost)}`);
    navigate({ to: "/history" });
  };

  useEffect(() => {
    if (active && energy >= target && target > 0) {
      toast.info("Meta de energia atingida — você pode finalizar a recarga.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energy >= target]);

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{active ? "Recarga em andamento" : "Recarga finalizada"}</p>
          <h1 className="truncate text-[1.5rem] leading-tight sm:text-[1.75rem]">{charger?.name}</h1>
        </div>
        {active ? (
          <StatusBadge status="occupied" />
        ) : (
          <Badge variant="secondary">Concluída</Badge>
        )}
      </div>

      <Panel className="overflow-hidden">
        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
          <div>
            <p className="text-sm text-muted-foreground">Energia entregue</p>
            <p className="mt-1 flex items-baseline gap-2 figures" aria-live="polite">
              <span className="display-wide text-[3.25rem] font-semibold leading-none sm:text-[4rem]">
                {fmt(energy, 2)}
              </span>
              <span className="text-lg font-medium text-muted-foreground">kWh</span>
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground">Valor até agora</p>
            <p className="mt-1 text-[1.75rem] font-semibold leading-none figures [font-stretch:108%]">
              {BRL(cost)}
            </p>
          </div>
        </div>
        <div className="border-t border-border bg-muted/40 px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground figures">
            <span>{fmt(percent, 0)}% da meta</span>
            <span>Meta de {target} kWh</span>
          </div>
          <Progress value={percent} className="mt-2 h-2" aria-label="Progresso da recarga" />
        </div>
      </Panel>

      <MetricStrip className="sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Potência" value={fmt(powerKw, 1)} unit="kW" />
        <Metric label="Tempo restante" value={active ? remainingMin : "—"} unit={active ? "min" : undefined} />
        <Metric label="Bateria" value={battery} unit="%" />
        <Metric label="Tempo decorrido" value={Math.round(elapsedMin)} unit="min" />
        <Metric label="Energia por minuto" value={fmt(powerKw / 60, 3)} unit="kWh/min" />
        <Metric label="Fila" value={queue.length} unit={queue.length === 1 ? "pessoa" : "pessoas"} />
      </MetricStrip>

      {active ? (
        <Button className="w-full" size="lg" onClick={finish}>
          <Zap /> Finalizar recarga
        </Button>
      ) : (
        <Button asChild className="w-full" size="lg" variant="outline">
          <Link to="/map">Voltar ao mapa</Link>
        </Button>
      )}
    </div>
  );
}
