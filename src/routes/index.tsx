import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Gauge, MapPin, Plug, Store, Zap } from "lucide-react";
import { AxisLogo } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AXIS — Recarga elétrica circular em comércios" },
      {
        name: "description",
        content:
          "Encontre carregadores HCA G2 perto de você e gerencie consumo, preço e lucro do seu carregador no comércio.",
      },
      { property: "og:title", content: "AXIS — Recarga elétrica circular em comércios" },
      {
        property: "og:description",
        content: "Mapa de carregadores HCA G2, sessões ao vivo e painel de lucro para o comerciante.",
      },
    ],
  }),
  component: Landing,
});

const driverFeatures = [
  { icon: MapPin, title: "Mapa com fotos", text: "Veja os carregadores mais próximos com foto, preço e status." },
  { icon: Gauge, title: "Estimativa real", text: "Tempo de recarga, distância e tempo de chegada calculados." },
  { icon: Zap, title: "Sessão ao vivo", text: "Potência, energia acumulada, fila e tempo restante em tempo real." },
];

const merchantFeatures = [
  { icon: Plug, title: "Controle total", text: "Cadastre, edite preço, potência, fotos e disponibilidade." },
  { icon: BarChart3, title: "Relatórios", text: "Filtros por período, receita por carregador e exportação CSV." },
  { icon: Store, title: "Lucro claro", text: "Dashboard de energia vendida, consumo por minuto e faturamento." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <AxisLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Começar</Link>
          </Button>
        </div>
      </header>

      <section className="axis-grid relative overflow-hidden border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Linha HCA G2
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] md:text-6xl">
            Recarga elétrica circular no comércio,{" "}
            <span className="text-primary">controlada de ponta a ponta</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            O motorista acha o carregador certo. O comerciante enxerga consumo, energia por minuto e lucro em
            tempo real.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "driver" }}>
                Sou motorista
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "merchant" }}>
                Sou comerciante
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
        {[
          { label: "Para o motorista", items: driverFeatures },
          { label: "Para o comerciante", items: merchantFeatures },
        ].map((group) => (
          <div key={group.label}>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">{group.label}</h2>
            <div className="mt-5 space-y-4">
              {group.items.map((f) => (
                <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
                  <f.icon className="size-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        AXIS · Rede de recarga circular HCA G2
      </footer>
    </div>
  );
}
