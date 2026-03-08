"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Trophy, Target, Sparkles, BarChart3, Users,
  Heart, TrendingUp, Rocket, History, User,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Slide {
  icon: React.ReactNode
  title: string
  description: string
  details?: string[]
}

const SLIDES: Slide[] = [
  {
    icon: <Trophy className="h-16 w-16 text-primary" />,
    title: "ScoreMates'e Hoş Geldin! 👋",
    description: "Süper Lig maçlarını tahmin et, arkadaşlarınla yarış, puan tablosunda zirveye çık!",
  },
  {
    icon: <Users className="h-16 w-16 text-blue-500" />,
    title: "Ligler 🏆",
    description: "Kendi ligi oluştur ya da davet koduyla birinin ligine katıl. Ligindeki herkes aynı maçları tahmin eder.",
    details: [
      "Birden fazla ligde bulunabilirsin",
      "Lig oluştur → davet kodunu paylaş",
      "Kod ile arkadaşlarını ligine ekle",
    ],
  },
  {
    icon: <Target className="h-16 w-16 text-green-500" />,
    title: "Tahmin Gir 🎯",
    description: "Her hafta Süper Lig maçlarına skor tahmini gir. Maç başlamadan önce kaydetmeyi unutma!",
    details: [
      "Birebir doğru skor → 4 puan",
      "Doğru gol farkı → 3 puan",
      "Doğru sonuç (kimin kazandığı) → 2 puan",
    ],
  },
  {
    icon: <Heart className="h-16 w-16 text-red-500" />,
    title: "Tuttuğun Takım ❤️",
    description: "Profilinden tuttuğun takımı seç. O takımın maçında tam skor tahmin edersen ekstra puan!",
    details: [
      "Profil sayfasından takımını seç",
      "Favori takım maçı + tam skor → 5 puan",
      "Normal tam skor tahmini 4 puandı",
    ],
  },
  {
    icon: <Sparkles className="h-16 w-16 text-yellow-500" />,
    title: "Özel Tahminler ✨",
    description: "Her hafta 5 istatistik sorusu gelir. En yakın tahmini yapan ekstra bonus puan kazanır!",
    details: [
      "Haftada 5 sayısal soru (toplam gol, ev galibi vb.)",
      "Tüm soruları cevapla",
      "Toplam farkı en az olan → 5 bonus puan",
    ],
  },
  {
    icon: <BarChart3 className="h-16 w-16 text-purple-500" />,
    title: "Puan Durumu 📊",
    description: "Genel ve haftalık sıralamada yerini takip et. Lider 👑 taç ile gösterilir!",
    details: [
      "Genel sıralama — tüm sezon boyunca",
      "Haftalık sıralama — o haftaya özel",
      "Özel tahmin bonusları da dahil",
    ],
  },
  {
    icon: <TrendingUp className="h-16 w-16 text-orange-500" />,
    title: "Geçmiş Sonuçlar & Takımlar 📈",
    description: "Biten maçların tahminlerini ve puanlarını gör. Takım adına tıkla, son maçlarını incele.",
    details: [
      "Hafta hafta geçmiş sonuçları görüntüle",
      "Herkesın tahmini ve puanı görünür",
      "Takım adına tıkla → form + son 10 maç",
    ],
  },
  {
    icon: <History className="h-16 w-16 text-cyan-500" />,
    title: "Bu Hafta Durumu 📋",
    description: "Bu hafta henüz bitmemiş maçlardaki tahminleri ve mevcut durumu takip et.",
    details: [
      "Ligdeki herkesin tahmini",
      "Maç sonuçlandıkça puanlar güncellenir",
      "Kimin önde olduğunu anlık gör",
    ],
  },
  {
    icon: <User className="h-16 w-16 text-pink-500" />,
    title: "Profil Ayarları 👤",
    description: "Sol alttaki adına tıkla: görünen adını, şifreni ve tuttuğun takımı güncelleyebilirsin.",
    details: [
      "Görünen adını istediğin zaman değiştir",
      "Mevcut şifreyle güvenli şifre değişimi",
      "Şifreni unuttuysan giriş ekranından sıfırla",
    ],
  },
  {
    icon: <Rocket className="h-16 w-16 text-primary" />,
    title: "Hazırsın! 🚀",
    description: "ScoreMates'i artık tam olarak biliyorsun. Ligine katıl ve ilk tahmini yap, iyi şanslar!",
  },
]

export const TUTORIAL_KEY = "scoremates_tutorial_v1"

export function TutorialModal() {
  const [show, setShow] = useState(false)
  const [slide, setSlide] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY)
    if (!done) setShow(true)

    function handler() {
      setSlide(0)
      setShow(true)
    }
    window.addEventListener("show-tutorial", handler)
    return () => window.removeEventListener("show-tutorial", handler)
  }, [])

  function goTo(index: number) {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setSlide(index)
      setAnimating(false)
    }, 150)
  }

  function handleNext() {
    if (slide < SLIDES.length - 1) {
      goTo(slide + 1)
    } else {
      handleClose()
    }
  }

  function handleClose() {
    localStorage.setItem(TUTORIAL_KEY, "true")
    setShow(false)
  }

  if (!show) return null

  const current = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border">

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-1 bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }}
          />
        </div>

        <div
          className={cn(
            "p-7 transition-opacity duration-150",
            animating ? "opacity-0" : "opacity-100"
          )}
        >
          {/* Slide count */}
          <p className="text-[11px] text-muted-foreground text-right mb-4 font-medium tabular-nums">
            {slide + 1} / {SLIDES.length}
          </p>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="p-4 rounded-2xl bg-muted/50">
              {current.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-2 leading-snug">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-center text-sm text-muted-foreground mb-4 leading-relaxed">
            {current.description}
          </p>

          {/* Details */}
          {current.details && (
            <ul className="space-y-2 mb-5 bg-muted/40 rounded-xl p-4">
              {current.details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === slide
                    ? "w-5 bg-primary"
                    : i < slide
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/25"
                )}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {!isLast ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-muted-foreground text-xs px-2"
                >
                  Geç
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Devam →
                </Button>
              </>
            ) : (
              <Button onClick={handleClose} className="flex-1 text-base py-5">
                Başlayalım! 🚀
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
