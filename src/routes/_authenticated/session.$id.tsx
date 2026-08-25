import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Activity, BatteryCharging, Clock, Gauge, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BRL, num } from "@/lib/axis";

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

  if (!session) return <p className="text-sm text-muted-foreground">Carregando sessão...</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{charger?.name}</h1>
          <p className="text-sm text-muted-foreground">Sessão {active ? "ao vivo" : "finalizada"}</p>
        </div>
        <Badge
          variant="outline"
          className={active ? "border-success/30 bg-success/15 text-success" : "text-muted-foreground"}
        >
          <Activity className="mr-1 size-3" /> {active ? "Carregando" : "Concluída"}
        </Badge>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 axis-glow">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Energia acumulada</p>
            <p className="font-display text-5xl font-bold text-primary">{energy.toFixed(2)} kWh</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Custo</p>
            <p className="font-display text-2xl font-bold">{BRL(cost)}</p>
          </div>
        </div>
        <Progress value={percent} className="mt-5" />
        <p className="mt-2 text-xs text-muted-foreground">
          {percent.toFixed(0)}% da meta de {target} kWh
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Gauge, label: "Potência", value: `${powerKw.toFixed(1)} kW` },
          { icon: Clock, label: "Tempo restante", value: active ? `${remainingMin} min` : "—" },
          { icon: BatteryCharging, label: "Bateria", value: `${battery}%` },
          { icon: Users, label: "Fila", value: `${queue.length}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <s.icon className="size-4 text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-muted-foreground">Tempo decorrido</p>
          <p className="text-lg font-semibold">{Math.round(elapsedMin)} min</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-muted-foreground">Consumo por minuto</p>
          <p className="text-lg font-semibold">{(powerKw / 60).toFixed(3)} kWh/min</p>
        </div>
      </div>

      {active ? (
        <Button className="w-full" size="lg" onClick={finish}>
          <Zap className="mr-2 size-4" /> Finalizar recarga
        </Button>
      ) : (
        <Button asChild className="w-full" size="lg" variant="outline">
          <Link to="/map">Voltar ao mapa</Link>
        </Button>
      )}
    </div>
  );
}
