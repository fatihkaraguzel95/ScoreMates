"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Trophy,
  Settings,
  LogOut,
  Target,
  MessageSquare,
  BarChart3,
  ChevronLeft,
  History,
  ListChecks,
  Sparkles,
} from "lucide-react";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  // Detect league context: /leagues/[id]/*
  const leagueMatch = pathname.match(/^\/leagues\/([^/]+)/);
  const rawId = leagueMatch?.[1];
  const leagueId = rawId && rawId !== "create" ? rawId : null;

  const [leagueName, setLeagueName] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) {
      setLeagueName(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("leagues")
      .select("name")
      .eq("id", leagueId)
      .single()
      .then(({ data }) => {
        if (data) setLeagueName(data.name);
      });
  }, [leagueId]);

  const initials = (profile.display_name || profile.username)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function NavLink({
    href,
    label,
    icon: Icon,
    exact = false,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
    exact?: boolean;
  }) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link href={href} className={cn("sidebar-nav-link", active && "active")}>
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 overflow-hidden"
      style={{
        background: "hsl(var(--sidebar))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-5 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-lg"
          style={{ color: "hsl(var(--sidebar-foreground))" }}
        >
          <Trophy className="h-5 w-5" style={{ color: "hsl(var(--sidebar-active))" }} />
          ScoreMates
        </Link>
      </div>

      {/* Admin link — top, admin only */}
      {profile.is_admin && (
        <div className="px-3 pt-3 shrink-0">
          <Link
            href="/admin"
            className={cn("sidebar-nav-link", pathname.startsWith("/admin") && "active")}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Admin Panel
          </Link>
          <div className="mt-3 h-px" style={{ background: "hsl(var(--sidebar-border))" }} />
        </div>
      )}

      {/* Contextual nav — scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {leagueId ? (
          <>
            {/* Active league indicator */}
            <div className="px-3 pb-2">
              <p
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "hsl(var(--sidebar-muted))" }}
              >
                Aktif Lig
              </p>
              <p
                className="text-sm font-semibold truncate mt-0.5"
                style={{ color: "hsl(var(--sidebar-foreground))" }}
              >
                {leagueName ?? "Yükleniyor…"}
              </p>
            </div>

            <NavLink href={`/leagues/${leagueId}/standings`} label="Puan Durumu" icon={BarChart3} />
            <NavLink href={`/leagues/${leagueId}/predictions`} label="Tahmin Gir" icon={Target} />
            <NavLink href={`/leagues/${leagueId}/special`} label="Özel Tahminler" icon={Sparkles} />
            <NavLink href={`/leagues/${leagueId}/week`} label="Bu Hafta Durumu" icon={ListChecks} />
            <NavLink href={`/leagues/${leagueId}/history`} label="Geçmiş Sonuçlar" icon={History} />
            <NavLink href={`/leagues/${leagueId}/chat`} label="Sohbet" icon={MessageSquare} />

            <div className="py-2">
              <div className="h-px" style={{ background: "hsl(var(--sidebar-border))" }} />
            </div>

            <Link href="/leagues" className="sidebar-nav-link">
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Liglere Dön
            </Link>
          </>
        ) : (
          <>
            <NavLink href="/dashboard" label="Ana Sayfa" icon={LayoutDashboard} exact />
            <NavLink href="/leagues" label="Ligler" icon={Trophy} />
          </>
        )}
      </nav>

      {/* Bottom — always visible */}
      <div
        className="px-3 py-3 space-y-1 shrink-0"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback
              className="text-xs font-bold"
              style={{
                background: "hsl(var(--sidebar-active))",
                color: "hsl(var(--sidebar-active-foreground))",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: "hsl(var(--sidebar-foreground))" }}
            >
              {profile.display_name || profile.username}
            </p>
            <p className="text-xs truncate" style={{ color: "hsl(var(--sidebar-muted))" }}>
              @{profile.username}
            </p>
          </div>
          <ThemeToggle />
        </Link>
        <button
          onClick={handleSignOut}
          className="sidebar-nav-link w-full"
          style={{ color: "hsl(0 72% 65%)" }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
