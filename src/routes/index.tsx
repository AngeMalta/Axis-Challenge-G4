import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Car, Gauge, MapPin, Plug, Store, Zap } from "lucide-react";
import { AxisLogo } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { statusRail } from "@/lib/status";
import { cn } from "@/lib/utils";

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
  { icon: MapPin, title: "Mapa com fotos", text: "Carregadores próximos com foto, preço por kWh e status na hora." },
  { icon: Gauge, title: "Estimativa antes de sair", text: "Tempo de recarga, custo e tempo de chegada calculados." },
  { icon: Zap, title: "Recarga ao vivo", text: "Potência, energia entregue, fila e tempo restante enquanto carrega." },
];

const merchantFeatures = [
  { icon: Plug, title: "Seus pontos, suas regras", text: "Preço, potência, fotos e horário de cada carregador." },
  { icon: BarChart3, title: "Relatórios por período", text: "Receita por carregador, filtros e exportação em CSV." },
  { icon: Store, title: "Receita sem planilha", text: "Energia vendida, ticket médio e faturamento no painel." },
];

const steps = [
  { title: "Encontre", text: "Filtre por distância, preço ou status e veja a rota." },
  { title: "Recarregue", text: "Inicie pelo app e acompanhe a energia entrando na bateria." },
  { title: "Pague o que usou", text: "Valor calculado por kWh e minuto, com histórico de cada recarga." },
];

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <AxisLogo />
          <div className="flex items-center gap-1 sm:gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="max-[380px]:hidden">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div className="axis-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-24">
          <div>
            <h1 className="display-wide max-w-[16ch] text-[2.5rem] font-semibold leading-[1.02] sm:text-[3.5rem] lg:text-[4rem]">
              Recarga elétrica no comércio, do mapa ao faturamento.
            </h1>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              O motorista encontra um carregador livre perto dele. O comerciante acompanha cada kWh vendido e
              a receita em tempo real.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "driver" }}>
                  <Car /> Sou motorista
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ mode: "merchant" }}>
                  <Store /> Tenho um comércio
                </Link>
              </Button>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="max-w-[24ch] text-[1.75rem] leading-tight sm:text-[2rem]">
          Uma plataforma, dois lados da mesma tomada.
        </h2>
        <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {[
            { label: "Para quem dirige", items: driverFeatures },
            { label: "Para quem oferece recarga", items: merchantFeatures },
          ].map((group) => (
            <div key={group.label}>
              <h3 className="border-b border-border pb-3 text-base">{group.label}</h3>
              <ul className="divide-y divide-border">
                {group.items.map((f) => (
                  <li key={f.title} className="flex gap-4 py-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card text-foreground shadow-xs">
                      <f.icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-medium">{f.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{f.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-[1.375rem] leading-tight">Como funciona para o motorista</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative border-l-2 border-border pl-4">
                <span className="text-xs font-medium text-muted-foreground figures">Passo {i + 1}</span>
                <p className="mt-1 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <AxisLogo />
          <span>Rede de recarga HCA G2</span>
        </div>
        <Link to="/auth" className="rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Entrar na plataforma
        </Link>
      </footer>
    </div>
  );
}

/** Static glimpse of the product: a charger status board and a live charge meter. */
function HeroPreview() {
  const rows = [
    { name: "Shopping Faria Lima", status: "occupied", figure: "18,4 kWh" },
    { name: "Padaria Central", status: "available", figure: "R$ 2,49/kWh" },
    { name: "Café Jardins", status: "available", figure: "R$ 2,20/kWh" },
    { name: "Posto Ibirapuera", status: "maintenance", figure: "—" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <div className="rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold [font-stretch:108%]">Carregadores perto de você</p>
          <span className="text-xs text-muted-foreground figures">4 de 12</span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.name} className={cn("relative flex items-center gap-3 py-3 pl-5 pr-4", statusRail(r.status))}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
              <span className="text-xs text-muted-foreground figures">{r.figure}</span>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 pb-10 pt-2.5 text-xs text-muted-foreground">Atualizado agora</p>
      </div>
      <div className="relative -mt-12 ml-auto mr-4 w-60 rounded-lg border border-border bg-card p-4 shadow-lg sm:mr-8">
        <p className="text-xs text-muted-foreground">Energia entregue</p>
        <p className="mt-1 flex items-baseline gap-1 figures">
          <span className="display-wide text-[2.25rem] font-semibold leading-none">18,4</span>
          <span className="text-sm font-medium text-muted-foreground">kWh</span>
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[61%] rounded-full bg-volt" />
        </div>
        <p className="mt-2 flex justify-between text-xs text-muted-foreground figures">
          <span>61% da meta</span>
          <span>22 kW</span>
        </p>
      </div>
    </div>
  );
}
