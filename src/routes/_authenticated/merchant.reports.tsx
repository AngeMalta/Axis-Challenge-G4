import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/AppShell";
import { useMerchantData } from "@/hooks/useMerchantData";
import { BRL, downloadCsv, num, toCsv } from "@/lib/axis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/merchant/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios comerciais — AXIS" },
      { name: "description", content: "Receita por carregador, filtros por período e exportação em CSV." },
      { property: "og:title", content: "Relatórios comerciais — AXIS" },
      { property: "og:description", content: "Receita por carregador, filtros por período e exportação CSV." },
    ],
  }),
  component: Reports,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function Reports() {
  const { chargers, sessions } = useMerchantData();
  const [preset, setPreset] = useState("30");
  const [chargerId, setChargerId] = useState("all");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return iso(d);
  });
  const [to, setTo] = useState(() => iso(new Date()));

  const applyPreset = (v: string) => {
    setPreset(v);
    if (v === "custom") return;
    const d = new Date();
    d.setDate(d.getDate() - Number(v));
    setFrom(iso(d));
    setTo(iso(new Date()));
  };

  const filtered = useMemo(
    () =>
      sessions.filter((s) => {
        const day = String(s.started_at).slice(0, 10);
        const inRange = day >= from && day <= to;
        const inCharger = chargerId === "all" || s.charger_id === chargerId;
        return inRange && inCharger;
      }),
    [sessions, from, to, chargerId],
  );

  const byCharger = useMemo(
    () =>
      chargers
        .filter((c) => chargerId === "all" || c.id === chargerId)
        .map((c) => {
          const cs = filtered.filter((s) => s.charger_id === c.id);
          const revenue = cs.reduce((a, b) => a + num(b.cost), 0);
          const energy = cs.reduce((a, b) => a + num(b.energy_kwh), 0);
          const minutes = cs.reduce((a, b) => a + num(b.minutes), 0);
          return {
            id: c.id,
            name: c.name,
            sessoes: cs.length,
            energia: energy,
            minutos: minutes,
            receita: revenue,
            ticket: cs.length ? revenue / cs.length : 0,
          };
        }),
    [chargers, filtered, chargerId],
  );

  const totals = byCharger.reduce(
    (acc, r) => ({
      sessoes: acc.sessoes + r.sessoes,
      energia: acc.energia + r.energia,
      minutos: acc.minutos + r.minutos,
      receita: acc.receita + r.receita,
    }),
    { sessoes: 0, energia: 0, minutos: 0, receita: 0 },
  );

  const exportCsv = () => {
    const rows = filtered.map((s) => ({
      sessao: s.id,
      carregador: chargers.find((c) => c.id === s.charger_id)?.name ?? "",
      inicio: new Date(s.started_at).toLocaleString("pt-BR"),
      fim: s.ended_at ? new Date(s.ended_at).toLocaleString("pt-BR") : "",
      energia_kwh: num(s.energy_kwh).toFixed(3),
      minutos: s.minutes,
      receita_brl: num(s.cost).toFixed(2),
      status: s.status,
    }));
    if (!rows.length) return;
    downloadCsv(`axis-relatorio-${from}_${to}.csv`, toCsv(rows));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios comerciais"
        subtitle="Receita detalhada por carregador e período"
        action={
          <Button onClick={exportCsv} disabled={!filtered.length}>
            <Download className="mr-2 size-4" /> Exportar CSV
          </Button>
        }
      />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Período</Label>
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">De</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setPreset("custom");
              setFrom(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setPreset("custom");
              setTo(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Carregador</Label>
          <Select value={chargerId} onValueChange={setChargerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {chargers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Receita" value={BRL(totals.receita)} accent />
        <Kpi label="Energia" value={`${totals.energia.toFixed(1)} kWh`} />
        <Kpi label="Sessões" value={String(totals.sessoes)} />
        <Kpi label="Tempo carregando" value={`${totals.minutos} min`} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Receita por carregador</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCharger}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <ReTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
                formatter={(v: number) => BRL(v)}
              />
              <Bar dataKey="receita" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carregador</TableHead>
              <TableHead className="text-right">Sessões</TableHead>
              <TableHead className="text-right">Energia</TableHead>
              <TableHead className="text-right">Minutos</TableHead>
              <TableHead className="text-right">Ticket médio</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byCharger.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">{r.sessoes}</TableCell>
                <TableCell className="text-right">{r.energia.toFixed(2)} kWh</TableCell>
                <TableCell className="text-right">{r.minutos}</TableCell>
                <TableCell className="text-right">{BRL(r.ticket)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{BRL(r.receita)}</TableCell>
              </TableRow>
            ))}
            {byCharger.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Sem dados no período selecionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
