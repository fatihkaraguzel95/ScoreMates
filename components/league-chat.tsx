"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { cn, formatChatTime } from "@/lib/utils"
import type { LeagueMessage } from "@/types"

function getInitials(profile: { username: string; display_name: string | null } | null) {
  const name = profile?.display_name || profile?.username || "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  leagueId: string
  currentUserId: string
  initialMessages: LeagueMessage[]
}

export function LeagueChat({ leagueId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<LeagueMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initial scroll without animation
  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`league_chat_${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "league_messages",
          filter: `league_id=eq.${leagueId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("league_messages")
            .select("*, profiles(username, display_name)")
            .eq("id", (payload.new as { id: string }).id)
            .single()
          if (data) setMessages((prev) => [...prev, data as LeagueMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leagueId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput("")
    await supabase.from("league_messages").insert({
      league_id: leagueId,
      user_id: currentUserId,
      content: text,
    })
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Henüz mesaj yok. İlk sen yaz!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === currentUserId
          const initials = getInitials(msg.profiles)
          const name = msg.profiles?.display_name || msg.profiles?.username || "?"
          return (
            <div key={msg.id} className={cn("flex gap-2 items-end", isMe && "flex-row-reverse")}>
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className={cn("max-w-[78%]", isMe && "items-end flex flex-col")}>
                {!isMe && (
                  <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">{name}</span>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-3 py-1.5 text-sm leading-snug break-words",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                  {formatChatTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-2 flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Mesaj yaz..."
          className="flex-1 h-9 text-sm"
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={sendMessage}
          disabled={sending || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
