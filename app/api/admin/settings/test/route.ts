import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { api_key, base_url } = await req.json()

  // Always SportAPI7 via RapidAPI
  const headers: Record<string, string> = {
    "x-rapidapi-key": api_key,
    "x-rapidapi-host": "sportapi7.p.rapidapi.com",
  }
  const testUrl = "https://sportapi7.p.rapidapi.com/api/v1/unique-tournament/52"

  try {
    const res = await fetch(testUrl, { headers })

    if (!res.ok) {
      return NextResponse.json({ error: `API yanıtı: ${res.status} ${res.statusText}` }, { status: 400 })
    }

    const data = await res.json()

    // API-Football specific error check
    if (data?.errors?.token || data?.message?.includes?.("not subscribed")) {
      return NextResponse.json({ error: "Geçersiz key veya abonelik yok" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Bağlantı başarısız" }, { status: 502 })
  }
}
