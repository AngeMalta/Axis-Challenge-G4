import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, LayoutDashboard, LogOut, Map, Plug, User, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { ThemeToggle } from "@/components/ThemeToggle";
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

export function AxisLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-xl font-bold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
        <Zap className="size-4" strokeWidth={2.5} />
      </span>
      AXIS
    </span>
  );
}

type NavItem = { to: string; label: string; icon: typeof Map };

const driverNav: NavItem[] = [
  { to: "/map", label: "Mapa", icon: Map },
  { to: "/history", label: "Recargas", icon: Zap },
];

const merchantNav: NavItem[] = [
  { to: "/merchant", label: "Painel", icon: LayoutDashboard },
  { to: "/merchant/chargers", label: "Carregadores", icon: Plug },
  { to: "/merchant/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/map", label: "Mapa", icon: Map },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMerchant = profile?.account_type === "merchant";
  const nav = isMerchant ? merchantNav : driverNav;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initials = (profile?.display_name ?? "AX").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/map">
            <AxisLogo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-9 border border-border">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.display_name}</DropdownMenuLabel>
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

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          <Link
            to="/profile"
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium",
              pathname === "/profile" ? "text-primary" : "text-muted-foreground",
            )}
          >
            <User className="size-5" />
            Perfil
          </Link>
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export { Button };
