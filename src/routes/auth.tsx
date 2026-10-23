import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AxisLogo } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "driver" | "merchant" | undefined } => ({
    mode: search['mode'] === "merchant" ? "merchant" : search['mode'] === "driver" ? "driver" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar no AXIS" },
      { name: "description", content: "Acesse sua conta AXIS de motorista ou comerciante." },
      { property: "og:title", content: "Entrar no AXIS" },
      { property: "og:description", content: "Acesse sua conta AXIS de motorista ou comerciante." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [accountType, setAccountType] = useState<"driver" | "merchant">(mode ?? "driver");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/map" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0], account_type: accountType },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode usar o AXIS.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: accountType === "merchant" && tab === "signup" ? "/merchant" : "/map" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Falha ao entrar com Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/map" });
  };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand side: a quiet status board, the product's core view */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.2_0.012_232)] p-10 text-[oklch(0.955_0.004_215)] lg:flex">
        <div className="axis-grid pointer-events-none absolute inset-0 opacity-40" />
        <Link to="/" className="relative w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <AxisLogo onDark />
        </Link>
        <div className="relative max-w-md">
          <h2 className="display-wide text-[2.5rem] font-semibold leading-[1.05]">
            Cada carregador, cada kWh, num só painel.
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-[oklch(0.78_0.012_222)]">
            Motoristas encontram onde recarregar. Comerciantes acompanham energia vendida e receita em
            tempo real.
          </p>
          <ul className="mt-8 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] text-sm">
            {boardRows.map((r) => (
              <li key={r.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`size-2 rounded-full ${r.dot}`} />
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-xs text-[oklch(0.72_0.012_222)] figures">{r.meta}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-[oklch(0.62_0.012_225)]">Rede de recarga HCA G2</p>
      </aside>

      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:invisible">
            <AxisLogo />
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
          <div className="w-full max-w-sm">
            <h1 className="text-[1.625rem] leading-tight">
              {tab === "signin" ? "Entrar no AXIS" : "Criar sua conta"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "signin"
                ? "Use seu e-mail e senha ou sua conta Google."
                : "Leva menos de um minuto."}
            </p>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {tab === "signup" && (
                <>
                  <fieldset>
                    <legend className="mb-1.5 text-[0.8125rem] font-medium">Tipo de conta</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {accountOptions.map((o) => {
                        const picked = accountType === o.value;
                        return (
                          <button
                            type="button"
                            key={o.value}
                            onClick={() => setAccountType(o.value)}
                            aria-pressed={picked}
                            className={cn(
                              "rounded-md border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              picked
                                ? "border-foreground bg-card shadow-xs"
                                : "border-input text-muted-foreground hover:border-foreground/30 hover:bg-accent",
                            )}
                          >
                            <o.icon className={cn("size-4", picked ? "text-foreground" : "text-muted-foreground")} />
                            <span className="mt-1.5 block text-sm font-medium text-foreground">{o.label}</span>
                            <span className="block text-xs leading-snug text-muted-foreground">{o.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[0.8125rem] font-medium">
                      Nome
                    </Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[0.8125rem] font-medium">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[0.8125rem] font-medium">
                  Senha
                </Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                />
                <label className="inline-flex cursor-pointer select-none items-center gap-2 pt-0.5 text-[0.8125rem] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    aria-controls="password"
                    className="size-4 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  Mostrar senha
                </label>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {tab === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" size="lg" onClick={google}>
              <GoogleMark /> Continuar com Google
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}

const accountOptions = [
  { value: "driver", label: "Motorista", hint: "Encontrar e usar carregadores", icon: Car },
  { value: "merchant", label: "Comerciante", hint: "Oferecer recarga no seu negócio", icon: Store },
] as const;

const boardRows = [
  { name: "Shopping Faria Lima", meta: "18,4 kWh agora", dot: "bg-[oklch(0.72_0.13_250)]" },
  { name: "Padaria Central", meta: "R$ 2,49/kWh", dot: "bg-[oklch(0.74_0.14_160)]" },
  { name: "Café Jardins", meta: "R$ 2,20/kWh", dot: "bg-[oklch(0.74_0.14_160)]" },
  { name: "Posto Ibirapuera", meta: "Em manutenção", dot: "bg-[oklch(0.8_0.13_70)]" },
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}
