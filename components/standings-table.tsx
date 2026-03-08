import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { StandingRow } from "@/types"

interface StandingsTableProps {
  rows: StandingRow[]
  currentUserId?: string
}

export function StandingsTable({ rows, currentUserId }: StandingsTableProps) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">Henüz puan tablosu oluşmadı.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Kullanıcı</TableHead>
          <TableHead className="text-right">Tahmin</TableHead>
          <TableHead className="text-right">Puan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.user_id}
            className={row.user_id === currentUserId ? "bg-primary/5 font-medium" : ""}
          >
            <TableCell>
              {row.rank === 1 ? (
                <span className="text-2xl leading-none" title="Lider">👑</span>
              ) : row.rank === 2 ? (
                <Badge variant="secondary" className="w-7 h-7 flex items-center justify-center rounded-full p-0">2</Badge>
              ) : row.rank === 3 ? (
                <Badge variant="secondary" className="w-7 h-7 flex items-center justify-center rounded-full p-0">3</Badge>
              ) : (
                <span className="text-muted-foreground">{row.rank}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <div>
                  <div className="font-medium">{row.display_name || row.username}</div>
                  <div className="text-xs text-muted-foreground">@{row.username}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right text-muted-foreground">{row.predictions_made}</TableCell>
            <TableCell className="text-right font-bold">{row.total_points}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
