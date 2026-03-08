import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { BottomNav } from "@/components/bottom-nav"
import { TutorialModal } from "@/components/tutorial-modal"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  return (
    <>
      <div className="min-h-screen flex bg-background">
        {/* Desktop sidebar */}
        <AppSidebar profile={profile} />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top header */}
          <MobileHeader profile={profile} />

          {/* Page content */}
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-24 md:pb-8 md:px-6">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <BottomNav />
        </div>
      </div>
      <TutorialModal />
    </>
  )
}
