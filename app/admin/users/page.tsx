"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Shield, ShieldOff } from "lucide-react"
import type { Profile } from "@/types"

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  async function fetchUsers() {
    const res = await fetch("/api/admin/users")
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    setToggling(userId)
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, is_admin: !currentIsAdmin }),
    })
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u)
      )
      toast({ title: "Güncellendi", description: `Admin rolü ${!currentIsAdmin ? "verildi" : "alındı"}.` })
    } else {
      toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" })
    }
    setToggling(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kullanıcılar</h1>
        <p className="text-muted-foreground mt-1">Kullanıcı yönetimi ve admin rolü</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüm Kullanıcılar ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Yükleniyor...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı Adı</TableHead>
                  <TableHead>Görünen Ad</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">@{u.username}</TableCell>
                    <TableCell>{u.display_name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_admin ? "default" : "secondary"}>
                        {u.is_admin ? "Admin" : "Kullanıcı"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggling === u.id}
                        onClick={() => toggleAdmin(u.id, u.is_admin)}
                      >
                        {u.is_admin ? (
                          <><ShieldOff className="h-3.5 w-3.5 mr-1.5" />Admin Al</>
                        ) : (
                          <><Shield className="h-3.5 w-3.5 mr-1.5" />Admin Ver</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
