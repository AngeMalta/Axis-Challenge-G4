import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Crosshair, List, Map as MapIcon, Navigation, Search, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MapCanvas } from "@/components/MapCanvas";
import { ChargerImage } from "@/components/ChargerImage";
import { EmptyState } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { chargerCover } from "@/constants/chargerImages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BRL, distanceKm, driveMinutes, formatKm, num, SAO_PAULO } from "@/lib/axis";
import { statusRail } from "@/lib/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Mapa de carregadores — AXIS" },
      { name: "description", content: "Carregadores HCA G2 próximos com foto, preço, status e rota." },
      { property: "og:title", content: "Mapa de carregadores — AXIS" },
      { property: "og:description", content: "Carregadores HCA G2 próximos com foto, preço, status e rota." },
    ],
  }),
  component: MapPage,
});

type Charger = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  photos: string[];
  price_per_kwh: number;
  price_per_minute: number;
  power_kw: number;
  connector_type: string;
  status: string;
  amenities: string[];
};

function MapPage() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("distance");
  const [selected, setSelected] = useState<string | null>(null);
  // Below lg the list and the map share the screen through a toggle.
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const pickFromList = useCallback((id: string) => {
    setSelected(id);
    setMobileView("map");
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setPos(SAO_PAULO),
      { timeout: 8000 },
    );
  }, []);

  const origin = pos ?? SAO_PAULO;

  const { data: chargers = [], isLoading } = useQuery({
    queryKey: ["chargers-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chargers").select("*").eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as unknown as Charger[];
    },
    refetchInterval: 20000,
  });

  const list = useMemo(() => {
    const enriched = chargers
      .map((c) => {
        const km = distanceKm(origin.lat, origin.lng, c.latitude, c.longitude);
        return { ...c, km, eta: driveMinutes(km) };
      })
      .filter((c) => (status === "all" ? true : c.status === status))
      .filter((c) =>
        q.trim()
          ? `${c.name} ${c.address ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
          : true,
      );
    enriched.sort((a, b) =>
      sort === "price" ? num(a.price_per_kwh) - num(b.price_per_kwh) : a.km - b.km,
    );
    return enriched;
  }, [chargers, origin, q, status, sort]);

  const selectedCharger = list.find((c) => c.id === selected) ?? null;

  const locateMe = () =>
    navigator.geolocation?.getCurrentPosition((p) =>
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
    );

  return (
    <div className="map-page-h grid grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-4">
      {/* Filters */}
      <div className="space-y-2 lg:col-start-1 lg:row-start-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou endereço"
              aria-label="Buscar carregador"
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" aria-label="Usar minha localização" onClick={locateMe}>
            <Crosshair className="size-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="min-w-0 flex-1" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="available">Livre</SelectItem>
              <SelectItem value="occupied">Em uso</SelectItem>
              <SelectItem value="maintenance">Manutenção</SelectItem>
              <SelectItem value="offline">Indisponível</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="min-w-0 flex-1" aria-label="Ordenar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Mais próximos</SelectItem>
              <SelectItem value="price">Menor preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List / map switch, phones and tablets only */}
        <div
          role="tablist"
          aria-label="Modo de visualização"
          className="grid grid-cols-2 rounded-lg border border-border bg-muted p-0.5 lg:hidden"
        >
          {(
            [
              { key: "map", label: "Mapa", icon: MapIcon },
              { key: "list", label: `Lista (${list.length})`, icon: List },
            ] as const
          ).map((v) => (
            <button
              key={v.key}
              role="tab"
              aria-selected={mobileView === v.key}
              onClick={() => setMobileView(v.key)}
              className={`inline-flex h-8 items-center justify-center gap-2 rounded-[7px] text-sm font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                mobileView === v.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              <v.icon className="size-4" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div
        className={`min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1 lg:col-start-1 lg:row-start-2 lg:block ${
          mobileView === "list" ? "row-start-2" : "hidden"
        }`}
        aria-busy={isLoading}
      >
        {isLoading &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-border bg-card p-2.5">
              <Skeleton className="size-14 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        {!isLoading && list.length === 0 && (
          <EmptyState
            icon={<Search />}
            title="Nenhum carregador encontrado"
            description="Tente outro nome, endereço ou status."
            className="rounded-lg border border-dashed border-border"
          />
        )}
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => pickFromList(c.id)}
            aria-pressed={selected === c.id}
            className={cn(
              "relative flex w-full gap-3 rounded-lg border bg-card py-2.5 pl-3.5 pr-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              statusRail(c.status),
              selected === c.id
                ? "border-foreground/35 shadow-sm"
                : "border-border shadow-xs hover:border-foreground/20 hover:bg-accent/40",
            )}
          >
            <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
              <ChargerImage
                src={chargerCover(c.photos, c.id)}
                seed={c.id}
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-sm font-semibold leading-5">{c.name}</h3>
                <StatusBadge status={c.status} />
              </div>
              <p className="truncate text-xs text-muted-foreground">{c.address}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground figures">
                <span className="font-semibold text-foreground">{BRL(num(c.price_per_kwh))}/kWh</span>
                <span className="inline-flex items-center gap-1">
                  <Navigation className="size-3" /> {formatKm(c.km)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {c.eta} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="size-3" /> {num(c.power_kw)} kW
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Map */}
      <div
        className={`relative min-h-0 overflow-hidden rounded-lg border border-border shadow-xs lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block ${
          mobileView === "map" ? "row-start-2" : "hidden"
        }`}
      >
        <MapCanvas
          chargers={list}
          center={origin}
          userPosition={pos}
          selectedId={selected}
          onSelect={setSelected}
        />

        {selectedCharger && (
          // Right margin on phones leaves room for the chat launcher.
          <div className="absolute inset-x-2 bottom-2 z-[1000] mr-[4.25rem] flex items-center gap-3 rounded-lg border border-border bg-card/95 p-2.5 shadow-md backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 sm:inset-x-3 sm:bottom-3 md:mr-0 md:max-w-md">
            <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
              <ChargerImage
                src={chargerCover(selectedCharger.photos, selectedCharger.id)}
                seed={selectedCharger.id}
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold">{selectedCharger.name}</h3>
                <StatusBadge status={selectedCharger.status} />
              </div>
              <p className="mt-0.5 flex gap-3 text-xs text-muted-foreground figures">
                <span className="font-medium text-foreground">
                  {BRL(num(selectedCharger.price_per_kwh))}/kWh
                </span>
                <span>{formatKm(selectedCharger.km)}</span>
                <span>{selectedCharger.eta} min de carro</span>
              </p>
              <Button asChild size="sm" className="mt-2 h-7">
                <Link to="/charger/$id" params={{ id: selectedCharger.id }}>
                  Ver detalhes
                </Link>
              </Button>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Fechar"
              className="grid size-8 shrink-0 place-items-center self-start rounded-full text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
