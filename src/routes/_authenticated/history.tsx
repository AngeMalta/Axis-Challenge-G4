import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRL, num } from "@/lib/axis";

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

function History() {
  const { data: sessions = [] } = useQuery({
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

  return (
    <div>
      <PageHeader title="Minhas recargas" subtitle="Histórico completo das suas sessões AXIS" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Sessões" value={String(sessions.length)} />
        <Stat label="Energia total" value={`${energy.toFixed(1)} kWh`} />
        <Stat label="Total gasto" value={BRL(total)} />
      </div>
      <div className="space-y-3">
        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Você ainda não recarregou.{" "}
            <Link to="/map" className="text-primary underline">
              Encontrar carregador
            </Link>
          </p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{(s.chargers as { name: string } | null)?.name}</h3>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>
                  {s.status === "active" ? "Ao vivo" : "Concluída"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(s.started_at).toLocaleString("pt-BR")} · {num(s.energy_kwh).toFixed(2)} kWh ·{" "}
                {s.minutes} min
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-primary">{BRL(num(s.cost))}</span>
              {s.status === "active" && (
                <Button asChild size="sm">
                  <Link to="/session/$id" params={{ id: s.id }}>
                    Ver ao vivo
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
