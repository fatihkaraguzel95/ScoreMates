import { redirect } from "next/navigation"

export default function LeaguePage({ params }: { params: { id: string } }) {
  redirect(`/leagues/${params.id}/standings`)
}
