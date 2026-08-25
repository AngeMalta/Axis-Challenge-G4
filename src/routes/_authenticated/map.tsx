import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Clock, Crosshair, Navigation, Search, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MapCanvas } from "@/components/MapCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRL, distanceKm, driveMinutes, formatKm, num, SAO_PAULO, statusLabel, statusTone } from "@/lib/axis";

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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou endereço"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Usar minha localização"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition((p) =>
                setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
              )
            }
          >
            <Crosshair className="size-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="occupied">Ocupado</SelectItem>
              <SelectItem value="maintenance">Manutenção</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Mais próximos</SelectItem>
              <SelectItem value="price">Menor preço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-16rem)]">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando carregadores...</p>}
          {!isLoading && list.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum carregador encontrado com esses filtros.</p>
          )}
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition-colors ${
                selected === c.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/50"
              }`}
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {c.photos?.[0] ? (
                  <img src={c.photos[0]} alt={c.name} className="size-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <Zap className="size-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-semibold">{c.name}</h3>
                  <Badge variant="outline" className={statusTone[c.status]}>
                    {statusLabel[c.status]}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.address}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">{BRL(num(c.price_per_kwh))}/kWh</span>
                  <span className="inline-flex items-center gap-1">
                    <Navigation className="size-3" /> {formatKm(c.km)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {c.eta} min
                  </span>
                  <span>{num(c.power_kw)} kW</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-[46vh] overflow-hidden rounded-2xl border border-border lg:h-[calc(100vh-12rem)]">
          <MapCanvas
            chargers={list}
            center={origin}
            userPosition={pos}
            selectedId={selected}
            onSelect={setSelected}
          />
        </div>
        {selectedCharger && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <h3 className="font-semibold">{selectedCharger.name}</h3>
              <p className="text-xs text-muted-foreground">
                {formatKm(selectedCharger.km)} · {selectedCharger.eta} min de carro ·{" "}
                {BRL(num(selectedCharger.price_per_kwh))}/kWh
              </p>
            </div>
            <Button asChild>
              <Link to="/charger/$id" params={{ id: selectedCharger.id }}>
                Ver detalhes
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
