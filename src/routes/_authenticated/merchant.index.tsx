import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BatteryCharging, Plug, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useMerchantData } from "@/hooks/useMerchantData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRL, num, statusLabel, statusTone } from "@/lib/axis";

export const Route = createFileRoute("/_authenticated/merchant/")({
  head: () => ({
    meta: [
      { title: "Painel do comerciante — AXIS" },
      {
        name: "description",
        content: "Energia vendida, consumo por minuto, sessões ao vivo e lucro do seu carregador HCA G2.",
      },
      { property: "og:title", content: "Painel do comerciante — AXIS" },
      { property: "og:description", content: "Energia vendida, consumo por minuto e lucro em tempo real." },
    ],
  }),
  component: MerchantDashboard,
});

function MerchantDashboard() {
  const { chargers, sessions, loading } = useMerchantData();

  const stats = useMemo(() => {
    const revenue = sessions.reduce((s, x) => s + num(x.cost), 0);
    const energy = sessions.reduce((s, x) => s + num(x.energy_kwh), 0);
    const minutes = sessions.reduce((s, x) => s + num(x.minutes), 0);
    const live = sessions.filter((s) => s.status === "active");
    return {
      revenue,
      energy,
      minutes,
      perMinute: minutes > 0 ? energy / minutes : 0,
      live,
      ticket: sessions.length ? revenue / sessions.length : 0,
    };
  }, [sessions]);

  const chart = useMemo(() => {
    const days: { day: string; receita: number; energia: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayS = sessions.filter((s) => String(s.started_at).slice(0, 10) === key);
      days.push({
        day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        receita: Number(dayS.reduce((a, b) => a + num(b.cost), 0).toFixed(2)),
        energia: Number(dayS.reduce((a, b) => a + num(b.energy_kwh), 0).toFixed(2)),
      });
    }
    return days;
  }, [sessions]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando painel...</p>;

  if (chargers.length === 0) {
    return (
      <div>
        <PageHeader title="Painel do comerciante" subtitle="Comece cadastrando seu primeiro carregador HCA G2" />
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <Plug className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 font-semibold">Nenhum carregador cadastrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre um carregador para acompanhar consumo, energia e lucro.
          </p>
          <Button asChild className="mt-5">
            <Link to="/merchant/chargers">Cadastrar carregador</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel do comerciante"
        subtitle="Consumo, energia e lucro dos seus carregadores"
        action={
          <Button asChild variant="outline">
            <Link to="/merchant/reports">Ver relatórios</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Lucro acumulado" value={BRL(stats.revenue)} accent />
        <Kpi icon={Zap} label="Energia vendida" value={`${stats.energy.toFixed(1)} kWh`} />
        <Kpi icon={BatteryCharging} label="Consumo por minuto" value={`${stats.perMinute.toFixed(3)} kWh/min`} />
        <Kpi icon={Activity} label="Ticket médio" value={BRL(stats.ticket)} />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-semibold">Receita dos últimos 14 dias</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <ReTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  color: "var(--color-foreground)",
                }}
                formatter={(v: number, n) => (n === "receita" ? BRL(v) : `${v} kWh`)}
              />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-semibold">Sessões ao vivo</h2>
          {stats.live.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma recarga em andamento agora.</p>
          )}
          <div className="mt-3 space-y-3">
            {stats.live.map((s) => {
              const charger = chargers.find((c) => c.id === s.charger_id);
              return (
                <div key={s.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{charger?.name}</h3>
                    <Badge className="bg-success/15 text-success" variant="outline">
                      Carregando
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <span>{num(s.current_power_kw).toFixed(1)} kW</span>
                    <span>{num(s.energy_kwh).toFixed(2)} kWh</span>
                    <span>{s.minutes} min</span>
                    <span className="font-semibold text-primary">{BRL(num(s.cost))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Meus carregadores</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/merchant/chargers">Gerenciar</Link>
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {chargers.map((c) => {
              const cs = sessions.filter((s) => s.charger_id === c.id);
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cs.length} sessões · {BRL(cs.reduce((a, b) => a + num(b.cost), 0))}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusTone[c.status]}>
                    {statusLabel[c.status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <Icon className="size-4 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}
