import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
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
import { Panel, PanelHeader } from "@/components/Panel";
import { Metric, MetricStrip } from "@/components/Metric";
import { BRL, downloadCsv, fmt, num, toCsv } from "@/lib/axis";
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
  const [sessionStatus, setSessionStatus] = useState("all");
  const [page, setPage] = useState(1);

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

  const sessionRows = filtered.filter((s) => sessionStatus === "all" || s.status === sessionStatus);
  const pageCount = Math.max(1, Math.ceil(sessionRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sessionRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const chargerName = (id: string) => chargers.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Relatórios"
        subtitle="Receita e energia por carregador no período escolhido"
        action={
          <Button onClick={exportCsv} disabled={!filtered.length} variant="outline" size="sm">
            <Download /> Exportar CSV
          </Button>
        }
      />

      <Panel className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
        <FilterField label="Período">
          <Select value={preset} onValueChange={applyPreset}>
            <SelectTrigger aria-label="Período">
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
        </FilterField>
        <FilterField label="De" htmlFor="rep-from">
          <Input
            id="rep-from"
            type="date"
            value={from}
            onChange={(e) => {
              setPreset("custom");
              setFrom(e.target.value);
            }}
          />
        </FilterField>
        <FilterField label="Até" htmlFor="rep-to">
          <Input
            id="rep-to"
            type="date"
            value={to}
            onChange={(e) => {
              setPreset("custom");
              setTo(e.target.value);
            }}
          />
        </FilterField>
        <FilterField label="Carregador">
          <Select value={chargerId} onValueChange={setChargerId}>
            <SelectTrigger aria-label="Carregador">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os carregadores</SelectItem>
              {chargers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </Panel>

      <MetricStrip>
        <Metric label="Receita" value={BRL(totals.receita)} emphasis />
        <Metric label="Energia" value={fmt(totals.energia, 1)} unit="kWh" />
        <Metric label="Recargas" value={totals.sessoes} />
        <Metric label="Tempo carregando" value={totals.minutos} unit="min" />
      </MetricStrip>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Receita por carregador" />
          <div className="h-64 px-2 pb-2 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCharger} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
                />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <ReTooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={chartTooltip}
                  formatter={(v: number) => [BRL(v), "Receita"]}
                />
                <Bar dataKey="receita" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="overflow-hidden xl:col-span-3">
          <PanelHeader title="Por carregador" description={`${byCharger.length} no filtro`} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carregador</TableHead>
                <TableHead className="text-right">Recargas</TableHead>
                <TableHead className="text-right">Energia</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Minutos</TableHead>
                <TableHead className="hidden text-right md:table-cell">Ticket médio</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCharger.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[12rem] truncate font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{r.sessoes}</TableCell>
                  <TableCell className="text-right">{fmt(r.energia, 2)} kWh</TableCell>
                  <TableCell className="hidden text-right sm:table-cell">{r.minutos}</TableCell>
                  <TableCell className="hidden text-right md:table-cell">{BRL(r.ticket)}</TableCell>
                  <TableCell className="text-right font-semibold">{BRL(r.receita)}</TableCell>
                </TableRow>
              ))}
              {byCharger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum carregador no filtro escolhido.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Recargas"
          description={`${sessionRows.length} no período`}
          actions={
            <Select
              value={sessionStatus}
              onValueChange={(v) => {
                setSessionStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs" aria-label="Filtrar recargas por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Em andamento</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Início</TableHead>
              <TableHead>Carregador</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Energia</TableHead>
              <TableHead className="hidden text-right md:table-cell">Minutos</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(s.started_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="max-w-[10rem] truncate font-medium">{chargerName(s.charger_id)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <SessionBadge status={s.status} />
                </TableCell>
                <TableCell className="text-right">{fmt(num(s.energy_kwh), 2)} kWh</TableCell>
                <TableCell className="hidden text-right md:table-cell">{s.minutes}</TableCell>
                <TableCell className="text-right font-medium">{BRL(num(s.cost))}</TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma recarga no período e status escolhidos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {sessionRows.length > PAGE_SIZE && (
          <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="figures">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sessionRows.length)} de{" "}
              {sessionRows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Página anterior"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft />
              </Button>
              <span className="px-2 figures">
                {currentPage} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Próxima página"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </footer>
        )}
      </Panel>
    </div>
  );
}

const PAGE_SIZE = 10;

const chartTooltip = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  boxShadow: "var(--elev-md)",
  color: "var(--color-foreground)",
  fontSize: 12,
  padding: "8px 10px",
};

const sessionStatusMeta: Record<string, { label: string; className: string }> = {
  active: { label: "Em andamento", className: "bg-status-busy/12 text-status-busy border-status-busy/25" },
  completed: { label: "Concluída", className: "bg-muted text-muted-foreground border-border" },
  cancelled: {
    label: "Cancelada",
    className: "bg-destructive/10 text-destructive border-destructive/25",
  },
};

function SessionBadge({ status }: { status: string }) {
  const meta = sessionStatusMeta[status] ?? sessionStatusMeta["completed"]!;
  return (
    <span
      className={`inline-flex rounded-[5px] border px-1.5 text-xs font-medium leading-5 ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
