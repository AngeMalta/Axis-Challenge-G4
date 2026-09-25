import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, MapPin, Pencil, Plug, Plus, Power, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useMerchantData } from "@/hooks/useMerchantData";
import { BRL, fmt, num, uploadImage } from "@/lib/axis";
import { cn } from "@/lib/utils";
import { EmptyState, Panel } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { ChargerImage } from "@/components/ChargerImage";
import {
  chargerCover,
  chargerImages,
  randomChargerImage,
} from "@/constants/chargerImages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
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
        // Every charger needs a picture: without one, pick a random built-in image.
        photos: form.photos.length ? form.photos : [randomChargerImage()],
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

  const togglePreset = (src: string) =>
    setForm((f) => ({
      ...f,
      photos: f.photos.includes(src) ? f.photos.filter((p) => p !== src) : [...f.photos, src],
    }));

  const addPhoto = async (file?: File) => {
    if (fileRef.current) fileRef.current.value = ""; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem (JPG, PNG ou WebP)");
      return;
    }
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
        title="Carregadores"
        subtitle="Preço, fotos e disponibilidade de cada ponto de recarga"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(empty)} size="sm">
                <Plus /> Novo carregador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
              <DialogHeader className="border-b border-border px-5 py-4">
                <DialogTitle>{form.id ? "Editar carregador" : "Novo carregador HCA G2"}</DialogTitle>
                <DialogDescription>
                  {form.id
                    ? "As mudanças aparecem para os motoristas assim que você salvar."
                    : "Os motoristas veem o carregador no mapa assim que você salvar."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 px-5 py-5">
                <FormSection title="Identificação">
                  <Field label="Nome">
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex.: Padaria Central — vaga 2"
                    />
                  </Field>
                  <Field label="Descrição">
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </Field>
                </FormSection>

                <FormSection title="Localização">
                  <Field label="Endereço">
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Latitude">
                      <Input
                        inputMode="decimal"
                        value={form.latitude}
                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      />
                    </Field>
                    <Field label="Longitude">
                      <Input
                        inputMode="decimal"
                        value={form.longitude}
                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                    <MapPin /> Usar minha localização
                  </Button>
                </FormSection>

                <FormSection title="Preço e funcionamento">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Field label="R$ por kWh">
                      <Input
                        inputMode="decimal"
                        value={form.price_per_kwh}
                        onChange={(e) => setForm({ ...form, price_per_kwh: e.target.value })}
                      />
                    </Field>
                    <Field label="R$ por minuto">
                      <Input
                        inputMode="decimal"
                        value={form.price_per_minute}
                        onChange={(e) => setForm({ ...form, price_per_minute: e.target.value })}
                      />
                    </Field>
                    <Field label="Potência (kW)">
                      <Input
                        inputMode="decimal"
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
                        <SelectItem value="available">Livre</SelectItem>
                        <SelectItem value="occupied">Em uso</SelectItem>
                        <SelectItem value="maintenance">Manutenção</SelectItem>
                        <SelectItem value="offline">Indisponível</SelectItem>
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
                </FormSection>

                <FormSection title="Fotos">
                  <p className="-mt-1 text-xs text-muted-foreground">
                    Envie uma foto do seu carregador ou escolha uma imagem padrão. Se salvar sem imagem,
                    usamos uma imagem padrão aleatória.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {form.photos.map((p) => (
                      <div
                        key={p}
                        className="relative size-20 overflow-hidden rounded-md border border-border"
                      >
                        <ChargerImage src={p} seed={form.id} className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, photos: form.photos.filter((x) => x !== p) })}
                          className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-foreground/80 text-background transition-colors hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Remover foto"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <ImagePlus className="size-5" />
                      )}
                      {uploading ? "Enviando" : "Enviar foto"}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => addPhoto(e.target.files?.[0])}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Imagens padrão</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {chargerImages.map((img) => {
                        const picked = form.photos.includes(img.src);
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => togglePreset(img.src)}
                            aria-pressed={picked}
                            aria-label={img.label}
                            title={img.label}
                            className={cn(
                              "relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-[border-color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              picked
                                ? "border-foreground"
                                : "border-transparent opacity-75 hover:opacity-100",
                            )}
                          >
                            <img src={img.src} alt="" className="size-full object-cover" />
                            {picked && (
                              <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-foreground text-background">
                                <Check className="size-3" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Visibilidade">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
                    <span>
                      <span className="block text-sm font-medium">Mostrar no mapa</span>
                      <span className="block text-xs text-muted-foreground">
                        Desligue para esconder dos motoristas sem apagar o carregador.
                      </span>
                    </span>
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                  </label>
                </FormSection>
              </div>
              <DialogFooter className="sticky bottom-0 gap-2 border-t border-border bg-card px-5 py-3">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
                  {save.isPending && <Loader2 className="animate-spin" />}
                  {form.id ? "Salvar alterações" : "Cadastrar carregador"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {chargers.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Plug />}
            title="Nenhum carregador cadastrado"
            description="Cadastre seu primeiro carregador para aparecer no mapa dos motoristas."
            action={
              <Button
                onClick={() => {
                  setForm(empty);
                  setOpen(true);
                }}
              >
                <Plus /> Novo carregador
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {chargers.map((c) => {
            const cs = sessions.filter((s) => s.charger_id === c.id);
            const revenue = cs.reduce((a, b) => a + num(b.cost), 0);
            const energy = cs.reduce((a, b) => a + num(b.energy_kwh), 0);
            return (
              <article
                key={c.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-shadow duration-200 hover:shadow-sm"
              >
                <div className="relative h-32 bg-muted">
                  <ChargerImage
                    src={chargerCover(c.photos, c.id)}
                    seed={c.id}
                    alt={c.name}
                    className="size-full object-cover"
                  />
                  <StatusBadge
                    status={c.status}
                    className="absolute left-2 top-2 bg-card/95 shadow-xs backdrop-blur"
                  />
                  {!c.is_active && (
                    <span className="absolute right-2 top-2 rounded-[5px] bg-foreground/80 px-1.5 text-xs font-medium leading-5 text-background">
                      Oculto do mapa
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="truncate text-[0.9375rem]">{c.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{c.address}</p>
                  <dl className="mt-3 grid grid-cols-3 divide-x divide-border rounded-md border border-border text-xs figures">
                    <Mini label="Preço/kWh" value={BRL(num(c.price_per_kwh))} />
                    <Mini label="Energia" value={`${fmt(energy, 1)} kWh`} />
                    <Mini label="Receita" value={BRL(revenue)} />
                  </dl>
                  <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                      <Pencil /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(c.id, c.status)}>
                      <Power /> {c.status === "offline" ? "Ativar" : "Desativar"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto size-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmDelete({ id: c.id, name: c.name })}
                      aria-label={`Excluir ${c.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{confirmDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O carregador sai do mapa e do seu painel. Essa ação não pode ser desfeita. Se quiser só
              tirá-lo do ar por um tempo, use “Desativar”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) remove.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Excluir carregador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[0.8125rem] font-medium">{label}</Label>
      {children}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2.5 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold text-foreground">{value}</dd>
    </div>
  );
}
