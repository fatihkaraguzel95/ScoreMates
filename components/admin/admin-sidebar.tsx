"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Settings,
  Calendar,
  Users,
  Trophy,
  ArrowLeft,
  ImagePlus,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/matches", label: "Maçlar", icon: Calendar },
  { href: "/admin/leagues", label: "Ligler", icon: Trophy },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/team-logos", label: "Takım Logoları", icon: ImagePlus },
  { href: "/admin/special", label: "Özel Tahminler", icon: Sparkles },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-20 space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start mb-3" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Siteye Dön
          </Link>
        </Button>
        <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">
          Yönetim
        </p>
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
