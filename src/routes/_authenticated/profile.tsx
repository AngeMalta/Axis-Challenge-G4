import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/AppShell";
import { Panel, PanelHeader } from "@/components/Panel";
import { useTheme } from "@/lib/theme";
import { uploadImage } from "@/lib/axis";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Meu perfil — AXIS" },
      { name: "description", content: "Personalize foto, nome, contato e preferências de tema no AXIS." },
      { property: "og:title", content: "Meu perfil — AXIS" },
      { property: "og:description", content: "Personalize foto, nome, contato e preferências de tema." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    display_name: "",
    phone: "",
    bio: "",
    company_name: "",
    avatar_url: "",
    account_type: "driver",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? "",
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      company_name: profile.company_name ?? "",
      avatar_url: profile.avatar_url ?? "",
      account_type: profile.account_type ?? "driver",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil não carregado");
      const { error } = await supabase
        .from("profiles")
        .update({ ...form, theme })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const onPickAvatar = async (file?: File) => {
    if (!file || !profile) return;
    setUploading(true);
    try {
      const url = await uploadImage("avatars", profile.id, file);
      setForm((f) => ({ ...f, avatar_url: url }));
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Foto atualizada");
    } catch {
      toast.error("Não foi possível enviar a foto");
    } finally {
      setUploading(false);
    }
  };

  const isMerchant = form.account_type === "merchant";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Meu perfil" subtitle="Dados da conta e preferências" />

      <Panel>
        <PanelHeader title="Dados da conta" />
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-16 border border-border">
                <AvatarImage src={form.avatar_url || undefined} alt="" />
                <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                  {(form.display_name || "AX").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-card bg-foreground text-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100"
                aria-label="Alterar foto"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPickAvatar(e.target.files?.[0])}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{form.display_name || "Sem nome"}</p>
              <p className="text-sm text-muted-foreground">
                {isMerchant ? "Conta de comerciante" : "Conta de motorista"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[0.8125rem] font-medium">
                Nome
              </Label>
              <Input
                id="name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[0.8125rem] font-medium">
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          {isMerchant && (
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-[0.8125rem] font-medium">
                Nome do comércio
              </Label>
              <Input
                id="company"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-[0.8125rem] font-medium">
              Sobre
            </Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Preferências" />
        <div className="divide-y divide-border">
          <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Tema escuro</span>
              <span className="block text-xs text-muted-foreground">Fundo escuro em todas as telas</span>
            </span>
            <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Modo comerciante</span>
              <span className="block text-xs text-muted-foreground">
                Painel, carregadores e relatórios para quem oferece recarga
              </span>
            </span>
            <Switch
              checked={isMerchant}
              onCheckedChange={(v) => setForm({ ...form, account_type: v ? "merchant" : "driver" })}
            />
          </label>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full sm:w-auto">
          {save.isPending && <Loader2 className="animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
