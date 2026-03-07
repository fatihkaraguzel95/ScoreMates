"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/dashboard", label: "Ana Sayfa", icon: LayoutDashboard },
  { href: "/leagues", label: "Ligler", icon: Trophy },
]

export function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t safe-area-bottom">
      <div className="flex">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
              isActive(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 transition-transform", isActive(href) && "scale-110")} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
