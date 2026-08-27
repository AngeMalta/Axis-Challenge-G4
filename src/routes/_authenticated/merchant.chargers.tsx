import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, MapPin, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useMerchantData } from "@/hooks/useMerchantData";
import { BRL, num, statusLabel, statusTone, uploadImage } from "@/lib/axis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/merchant/chargers")({
  head: () => ({
    meta: [
      { title: "Meus carregadores — AXIS" },
      { name: "description", content: "Cadastre e edite carregadores HCA G2, preços, fotos e disponibilidade." },
      { property: "og:title", content: "Meus carregadores — AXIS" },
      { property: "og:description", content: "Cadastre e edite carregadores, preços, fotos e disponibilidade." },
    ],
  }),
  component: MerchantChargers,
});

type FormState = {
  id?: string;
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  price_per_kwh: string;
  price_per_minute: string;
  power_kw: string;
  connector_type: string;
  opening_hours: string;
  status: string;
  amenities: string;
  photos: string[];
  is_active: boolean;
};

const empty: FormState = {
  name: "",
  description: "",
  address: "",
  latitude: "-23.5613",
  longitude: "-46.6560",
  price_per_kwh: "2.50",
  price_per_minute: "0.00",
  power_kw: "22",
  connector_type: "Type 2",
  opening_hours: "24h",
  status: "available",
  amenities: "",
  photos: [],
  is_active: true,
};

function MerchantChargers() {
  const { chargers, sessions } = useMerchantData();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => qc.invalidateQueries();

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const payload = {
        owner_id: auth.user.id,
        name: form.name,
        description: form.description,
        address: form.address,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        price_per_kwh: parseFloat(form.price_per_kwh),
        price_per_minute: parseFloat(form.price_per_minute),
        power_kw: parseFloat(form.power_kw),
        connector_type: form.connector_type,
        opening_hours: form.opening_hours,
        status: form.status as "available",
        amenities: form.amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        photos: form.photos,
        is_active: form.is_active,
      };
      if (form.id) {
        const { error } = await supabase.from("chargers").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chargers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Carregador atualizado" : "Carregador cadastrado");
      setOpen(false);
      setForm(empty);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chargers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carregador removido");
      refresh();
    },
  });

  const toggleStatus = async (id: string, status: string) => {
    const next = status === "offline" ? "available" : "offline";
    await supabase.from("chargers").update({ status: next }).eq("id", id);
    refresh();
  };

  const addPhoto = async (file?: File) => {
    if (!file) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUploading(true);
    try {
      const url = await uploadImage("charger-photos", auth.user.id, file);
      setForm((f) => ({ ...f, photos: [...f.photos, url] }));
    } catch {
      toast.error("Falha ao enviar a foto");
    } finally {
      setUploading(false);
    }
  };

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((p) =>
      setForm((f) => ({
        ...f,
        latitude: p.coords.latitude.toFixed(6),
        longitude: p.coords.longitude.toFixed(6),
      })),
    );
  };

  const openEdit = (c: (typeof chargers)[number]) => {
    setForm({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      address: c.address ?? "",
      latitude: String(c.latitude),
      longitude: String(c.longitude),
      price_per_kwh: String(c.price_per_kwh),
      price_per_minute: String(c.price_per_minute),
      power_kw: String(c.power_kw),
      connector_type: c.connector_type,
      opening_hours: c.opening_hours ?? "24h",
      status: c.status,
      amenities: (c.amenities ?? []).join(", "),
      photos: c.photos ?? [],
      is_active: c.is_active,
    });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Meus carregadores"
        subtitle="Cadastre, edite preço, fotos e disponibilidade"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(empty)}>
                <Plus className="mr-2 size-4" /> Novo carregador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar carregador" : "Novo carregador HCA G2"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Field label="Nome">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Descrição">
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Field>
                <Field label="Endereço">
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude">
                    <Input
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    />
                  </Field>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                  <MapPin className="mr-2 size-4" /> Usar minha localização
                </Button>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="R$/kWh">
                    <Input
                      value={form.price_per_kwh}
                      onChange={(e) => setForm({ ...form, price_per_kwh: e.target.value })}
                    />
                  </Field>
                  <Field label="R$/min">
                    <Input
                      value={form.price_per_minute}
                      onChange={(e) => setForm({ ...form, price_per_minute: e.target.value })}
                    />
                  </Field>
                  <Field label="Potência (kW)">
                    <Input
                      value={form.power_kw}
                      onChange={(e) => setForm({ ...form, power_kw: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Conector">
                    <Input
                      value={form.connector_type}
                      onChange={(e) => setForm({ ...form, connector_type: e.target.value })}
                    />
                  </Field>
                  <Field label="Horário">
                    <Input
                      value={form.opening_hours}
                      onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="occupied">Ocupado</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Comodidades (separadas por vírgula)">
                  <Input
                    value={form.amenities}
                    onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                    placeholder="Café, Wi-Fi, Banheiro"
                  />
                </Field>
                <div>
                  <Label className="text-sm">Fotos</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.photos.map((p) => (
                      <div key={p} className="relative size-20 overflow-hidden rounded-lg border border-border">
                        <img src={p} alt="" className="size-full object-cover" />
                        <button
                          onClick={() => setForm({ ...form, photos: form.photos.filter((x) => x !== p) })}
                          className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                          aria-label="Remover foto"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="grid size-20 place-items-center rounded-lg border border-dashed border-border text-muted-foreground"
                    >
                      {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => addPhoto(e.target.files?.[0])}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <span className="text-sm">Visível para motoristas</span>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {chargers.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum carregador cadastrado ainda.</p>
        )}
        {chargers.map((c) => {
          const cs = sessions.filter((s) => s.charger_id === c.id);
          const revenue = cs.reduce((a, b) => a + num(b.cost), 0);
          const energy = cs.reduce((a, b) => a + num(b.energy_kwh), 0);
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="h-36 bg-muted">
                {c.photos?.[0] && <img src={c.photos[0]} alt={c.name} className="size-full object-cover" />}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{c.address}</p>
                  </div>
                  <Badge variant="outline" className={statusTone[c.status]}>
                    {statusLabel[c.status]}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Mini label="Preço" value={`${BRL(num(c.price_per_kwh))}`} />
                  <Mini label="Energia" value={`${energy.toFixed(1)} kWh`} />
                  <Mini label="Receita" value={BRL(revenue)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                    <Pencil className="mr-1 size-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(c.id, c.status)}>
                    <Power className="mr-1 size-3.5" /> {c.status === "offline" ? "Ativar" : "Desativar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}>
                    <Trash2 className="mr-1 size-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
