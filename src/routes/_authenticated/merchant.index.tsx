import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BatteryCharging, FileBarChart, Plug, Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useMerchantData } from "@/hooks/useMerchantData";
import { EmptyState, Panel, PanelHeader } from "@/components/Panel";
import { Metric, MetricStrip } from "@/components/Metric";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BRL, fmt, num } from "@/lib/axis";
import { statusRail } from "@/lib/status";
import { cn } from "@/lib/utils";

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
  const [chartMetric, setChartMetric] = useState<"receita" | "energia">("receita");

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

  const header = (
    <PageHeader
      title="Painel"
      subtitle="Energia vendida, receita e recargas dos seus carregadores"
      action={
        chargers.length > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link to="/merchant/reports">
              <FileBarChart /> Relatórios
            </Link>
          </Button>
        )
      }
    />
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {header}
        <MetricStrip>
          {["Receita acumulada", "Energia vendida", "Energia por minuto", "Ticket médio"].map((l) => (
            <Metric key={l} label={l} value="" loading />
          ))}
        </MetricStrip>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (chargers.length === 0) {
    return (
      <div>
        {header}
        <Panel>
          <EmptyState
            icon={<Plug />}
            title="Nenhum carregador cadastrado"
            description="Cadastre seu primeiro carregador para acompanhar energia vendida, recargas e receita."
            action={
              <Button asChild>
                <Link to="/merchant/chargers">
                  <Plus /> Cadastrar carregador
                </Link>
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  const series = chartMetric === "receita" ? "var(--color-chart-2)" : "var(--color-chart-1)";

  return (
    <div className="space-y-4">
      {header}

      <MetricStrip>
        <Metric label="Receita acumulada" value={BRL(stats.revenue)} emphasis />
        <Metric label="Energia vendida" value={fmt(stats.energy, 1)} unit="kWh" />
        <Metric label="Energia por minuto" value={fmt(stats.perMinute, 3)} unit="kWh/min" />
        <Metric
          label="Ticket médio"
          value={BRL(stats.ticket)}
          hint={`${sessions.length} ${sessions.length === 1 ? "recarga" : "recargas"}`}
        />
      </MetricStrip>

      <Panel>
        <PanelHeader
          title="Últimos 14 dias"
          description={chartMetric === "receita" ? "Receita por dia" : "Energia vendida por dia"}
          actions={
            <Tabs value={chartMetric} onValueChange={(v) => setChartMetric(v as "receita" | "energia")}>
              <TabsList className="h-8">
                <TabsTrigger value="receita" className="h-7 text-xs">
                  Receita
                </TabsTrigger>
                <TabsTrigger value="energia" className="h-7 text-xs">
                  Energia
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
        <div className="h-64 px-2 pb-2 pt-4 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dash-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={series} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                width={48}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(v: number) => (chartMetric === "receita" ? `R$${v}` : `${v}`)}
              />
              <ReTooltip
                cursor={{ stroke: "var(--color-border)" }}
                contentStyle={chartTooltip}
                labelStyle={{ color: "var(--color-muted-foreground)", fontSize: 12 }}
                formatter={(v: number) => [
                  chartMetric === "receita" ? BRL(v) : `${fmt(v, 2)} kWh`,
                  chartMetric === "receita" ? "Receita" : "Energia",
                ]}
              />
              <Area
                type="monotone"
                dataKey={chartMetric}
                stroke={series}
                strokeWidth={2}
                fill="url(#dash-fill)"
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Recargas em andamento"
            description={stats.live.length ? `${stats.live.length} agora` : undefined}
          />
          {stats.live.length === 0 ? (
            <EmptyState
              icon={<BatteryCharging />}
              title="Nenhuma recarga agora"
              description="As recargas aparecem aqui assim que um motorista iniciar."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {stats.live.map((s) => {
                const charger = chargers.find((c) => c.id === s.charger_id);
                return (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium">{charger?.name}</p>
                      <StatusBadge status="occupied" />
                    </div>
                    <dl className="mt-2 grid grid-cols-4 gap-2 text-xs figures">
                      <LiveFigure label="Potência" value={`${fmt(num(s.current_power_kw), 1)} kW`} />
                      <LiveFigure label="Energia" value={`${fmt(num(s.energy_kwh), 2)} kWh`} />
                      <LiveFigure label="Tempo" value={`${s.minutes} min`} />
                      <LiveFigure label="Valor" value={BRL(num(s.cost))} strong />
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Carregadores"
            description={`${chargers.length} cadastrados`}
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/merchant/chargers">Gerenciar</Link>
              </Button>
            }
          />
          <ul className="divide-y divide-border">
            {chargers.map((c) => {
              const cs = sessions.filter((s) => s.charger_id === c.id);
              const revenue = cs.reduce((a, b) => a + num(b.cost), 0);
              return (
                <li
                  key={c.id}
                  className={cn("relative flex items-center gap-3 py-3 pl-5 pr-4", statusRail(c.status))}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.address}</p>
                  </div>
                  <div className="hidden text-right text-xs figures sm:block">
                    <p className="font-medium text-foreground">{BRL(revenue)}</p>
                    <p className="text-muted-foreground">
                      {cs.length} {cs.length === 1 ? "recarga" : "recargas"}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

const chartTooltip = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  boxShadow: "var(--elev-md)",
  color: "var(--color-foreground)",
  fontSize: 12,
  padding: "8px 10px",
};

function LiveFigure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", strong ? "font-semibold text-foreground" : "text-foreground")}>{value}</dd>
    </div>
  );
}
