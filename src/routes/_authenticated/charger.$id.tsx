import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Plug,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MapCanvas } from "@/components/MapCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  BRL,
  chargeMinutes,
  distanceKm,
  driveMinutes,
  formatKm,
  num,
  SAO_PAULO,
  statusLabel,
  statusTone,
} from "@/lib/axis";

export const Route = createFileRoute("/_authenticated/charger/$id")({
  head: () => ({
    meta: [
      { title: "Carregador — AXIS" },
      { name: "description", content: "Fotos, preço, distância, rota e estimativa de recarga do carregador." },
      { property: "og:title", content: "Carregador — AXIS" },
      { property: "og:description", content: "Fotos, preço, distância, rota e estimativa de recarga." },
    ],
  }),
  component: ChargerDetail,
});

function ChargerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [target, setTarget] = useState(30);
  const [photo, setPhoto] = useState(0);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setPos(SAO_PAULO),
    );
  }, []);

  const { data: charger } = useQuery({
    queryKey: ["charger", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chargers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: queue = [] } = useQuery({
    queryKey: ["queue", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("charger_queue").select("*").eq("charger_id", id);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charger_reviews")
        .select("*")
        .eq("charger_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const startSession = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("charging_sessions")
        .insert({ charger_id: id, user_id: auth.user.id, target_kwh: target, battery_percent: 20 })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("chargers").update({ status: "occupied" }).eq("id", id);
      return data.id as string;
    },
    onSuccess: (sessionId) => {
      qc.invalidateQueries({ queryKey: ["charger", id] });
      navigate({ to: "/session/$id", params: { id: sessionId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao iniciar recarga"),
  });

  const joinQueue = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("charger_queue").insert({ charger_id: id, user_id: auth.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você entrou na fila deste carregador");
      qc.invalidateQueries({ queryKey: ["queue", id] });
    },
    onError: () => toast.error("Você já está na fila"),
  });

  const sendReview = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("charger_reviews")
        .upsert(
          { charger_id: id, user_id: auth.user.id, rating, comment },
          { onConflict: "charger_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      toast.success("Avaliação enviada");
      qc.invalidateQueries({ queryKey: ["reviews", id] });
    },
  });

  if (!charger) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const origin = pos ?? SAO_PAULO;
  const km = distanceKm(origin.lat, origin.lng, charger.latitude, charger.longitude);
  const eta = driveMinutes(km);
  const minutes = chargeMinutes(target, num(charger.power_kw));
  const cost = target * num(charger.price_per_kwh) + minutes * num(charger.price_per_minute);
  const photos: string[] = charger.photos ?? [];
  const avg = reviews.length
    ? reviews.reduce((s: number, r) => s + num(r.rating), 0) / reviews.length
    : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/map">
          <ArrowLeft className="mr-1 size-4" /> Voltar ao mapa
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            {photos.length ? (
              <img src={photos[photo]} alt={charger.name} className="h-52 w-full object-cover sm:h-72" />
            ) : (
              <div className="grid h-52 place-items-center text-muted-foreground sm:h-72">
                <Zap className="size-10" />
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPhoto(i)}
                  className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === photo ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={p} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{charger.name}</h1>
              <Badge variant="outline" className={statusTone[charger.status]}>
                {statusLabel[charger.status]}
              </Badge>
              <Badge variant="secondary">{charger.model}</Badge>
              {avg && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="size-4 fill-primary text-primary" /> {avg.toFixed(1)} ({reviews.length})
                </span>
              )}
            </div>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" /> {charger.address}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{charger.description}</p>
            {charger.amenities?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {charger.amenities.map((a: string) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Preço", value: `${BRL(num(charger.price_per_kwh))}/kWh`, icon: Zap },
              { label: "Potência", value: `${num(charger.power_kw)} kW`, icon: Plug },
              { label: "Distância", value: formatKm(km), icon: Navigation },
              { label: "Chegada", value: `${eta} min`, icon: Clock },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                <s.icon className="size-4 text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">{s.label}</p>
                <p className="font-semibold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="h-64 overflow-hidden rounded-2xl border border-border">
            <MapCanvas
              chargers={[charger as never]}
              center={{ lat: charger.latitude, lng: charger.longitude }}
              userPosition={pos}
              routeTo={{ lat: charger.latitude, lng: charger.longitude }}
            />
          </div>
          <Button variant="outline" asChild className="w-full">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${charger.latitude},${charger.longitude}&travelmode=driving`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir rota no Google Maps <ExternalLink className="ml-2 size-4" />
            </a>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Simular recarga</h2>
            <p className="mt-1 text-sm text-muted-foreground">Escolha quanta energia você quer carregar.</p>
            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Energia</span>
                <span className="font-display text-2xl font-bold text-primary">{target} kWh</span>
              </div>
              <Slider
                className="mt-3"
                value={[target]}
                min={5}
                max={80}
                step={5}
                onValueChange={(v) => setTarget(v[0] ?? 30)}
              />
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tempo estimado</dt>
                <dd className="font-semibold">
                  {Math.floor(minutes / 60)}h {minutes % 60}min
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custo estimado</dt>
                <dd className="font-semibold text-primary">{BRL(cost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fila agora</dt>
                <dd className="inline-flex items-center gap-1 font-semibold">
                  <Users className="size-4" /> {queue.length}
                </dd>
              </div>
            </dl>
            {charger.status === "available" ? (
              <Button
                className="mt-5 w-full"
                onClick={() => startSession.mutate()}
                disabled={startSession.isPending}
              >
                Iniciar recarga
              </Button>
            ) : (
              <Button
                className="mt-5 w-full"
                variant="outline"
                onClick={() => joinQueue.mutate()}
                disabled={joinQueue.isPending}
              >
                Entrar na fila
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Avaliações</h2>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} estrelas`}>
                  <Star
                    className={`size-5 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3"
              placeholder="Como foi sua experiência?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button className="mt-3 w-full" variant="secondary" onClick={() => sendReview.mutate()}>
              Enviar avaliação
            </Button>
            <div className="mt-4 space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex gap-0.5">
                    {Array.from({ length: num(r.rating) }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mt-1 text-muted-foreground">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
