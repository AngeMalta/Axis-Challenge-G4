import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, LayoutDashboard, LogOut, Map, Plug, User, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChatLauncher } from "@/components/ChatLauncher";
import { clearChatSession } from "@/lib/chatbot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Wordmark: expanded Archivo with an ink tile carrying the brand-red bolt. */
export function AxisLogo({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-[7px]",
          onDark ? "bg-white/95" : "bg-foreground",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path d="M13.2 2.5 5.5 13.4h5.3l-1.2 8.1 8.9-12h-5.6z" fill="var(--brand)" />
        </svg>
      </span>
      <span className="font-display text-[1.0625rem] font-bold leading-none tracking-[0.04em] [font-stretch:125%]">
        AXIS
      </span>
    </span>
  );
}

type NavItem = { to: string; label: string; icon: typeof Map; also?: string[] };

const driverNav: NavItem[] = [
  { to: "/map", label: "Mapa", icon: Map, also: ["/charger/"] },
  { to: "/history", label: "Recargas", icon: Zap, also: ["/session/"] },
];

const merchantNav: NavItem[] = [
  { to: "/merchant", label: "Painel", icon: LayoutDashboard },
  { to: "/merchant/chargers", label: "Carregadores", icon: Plug },
  { to: "/merchant/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/map", label: "Mapa", icon: Map, also: ["/charger/", "/session/"] },
];

const profileNav: NavItem = { to: "/profile", label: "Perfil", icon: User };

const isActive = (item: NavItem, pathname: string) =>
  pathname === item.to || (item.also ?? []).some((prefix) => pathname.startsWith(prefix));

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMerchant = profile?.account_type === "merchant";
  const nav = isMerchant ? merchantNav : driverNav;

  const signOut = async () => {
    clearChatSession();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initials = (profile?.display_name ?? "AX").slice(0, 2).toUpperCase();
  const isMapPage = pathname === "/map";

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-3 sm:px-4">
          <Link
            to={isMerchant ? "/merchant" : "/map"}
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <AxisLogo />
          </Link>
          <nav aria-label="Seções" className="hidden h-full items-stretch gap-1 md:flex">
            {nav.map((item) => {
              const active = isActive(item, pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    "after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
                    active
                      ? "text-foreground after:bg-brand"
                      : "text-muted-foreground after:bg-transparent hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden rounded-[5px] border border-border px-1.5 text-xs font-medium leading-5 text-muted-foreground sm:inline">
              {isMerchant ? "Comerciante" : "Motorista"}
            </span>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Menu da conta"
                  className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Avatar className="size-8 border border-border">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-muted text-[0.6875rem] font-semibold text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{profile?.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isMerchant ? "Conta de comerciante" : "Conta de motorista"}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 size-4" /> Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto max-w-7xl px-3 sm:px-4",
          // The map page sizes itself to the viewport, so it only needs a thin gutter.
          isMapPage
            ? "pb-[calc(var(--app-bottom-nav-h)+0.75rem)] pt-3 md:pb-4 md:pt-4"
            : "pb-[calc(var(--app-bottom-nav-h)+5rem)] pt-5 md:pb-24 md:pt-7",
        )}
      >
        {children}
      </main>

      <ChatLauncher />

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="flex h-16 items-stretch justify-around px-1">
          {[...nav, profileNav].map((item) => {
            const Icon = item.icon;
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  "before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:rounded-full",
                  active ? "text-foreground before:bg-brand" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[1.375rem] leading-tight sm:text-[1.625rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export { Button };
