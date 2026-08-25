import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/AppShell";
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
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Meu perfil" subtitle="Personalize sua conta AXIS" />

      <div className="space-y-5 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-20 border border-border">
              <AvatarImage src={form.avatar_url || undefined} alt="" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(form.display_name || "AX").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"
              aria-label="Alterar foto"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
            />
          </div>
          <div>
            <p className="font-semibold">{form.display_name || "Sem nome"}</p>
            <p className="text-sm text-muted-foreground">
              {isMerchant ? "Conta de comerciante" : "Conta de motorista"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        {isMerchant && (
          <div className="space-y-2">
            <Label htmlFor="company">Nome do comércio</Label>
            <Input
              id="company"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="bio">Sobre</Label>
          <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border p-4">
          <div>
            <p className="font-medium">Tema escuro</p>
            <p className="text-sm text-muted-foreground">Alterne entre fundo preto e branco</p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border p-4">
          <div>
            <p className="font-medium">Modo comerciante</p>
            <p className="text-sm text-muted-foreground">Acesse painel, carregadores e relatórios</p>
          </div>
          <Switch
            checked={isMerchant}
            onCheckedChange={(v) => setForm({ ...form, account_type: v ? "merchant" : "driver" })}
          />
        </div>

        <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
