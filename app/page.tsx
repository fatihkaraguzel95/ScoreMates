import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Trophy, Users, Target, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">ScoreMates</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Kayıt Ol</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Trophy className="h-4 w-4" />
          Süper Lig Tahmin Ligi
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-6">
          Arkadaşlarınla <span className="text-primary">tahmin ligi</span> kur
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Süper Lig maçlarını tahmin et, davet koduyla arkadaşlarını çağır, haftalık puan tablosunda
          zirvede ol.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/register">Hemen Başla</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Giriş Yap</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="h-8 w-8 text-primary" />}
            title="Özel Lig Oluştur"
            desc="Kendi ligi oluştur, benzersiz davet koduyla arkadaşlarını davet et."
          />
          <FeatureCard
            icon={<Target className="h-8 w-8 text-primary" />}
            title="Maç Tahmini Yap"
            desc="Her hafta Süper Lig maçlarına skor tahmini gir. Maç başlamadan önce tahminini kaydet."
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-primary" />}
            title="Puan Kazan"
            desc="Doğru skor 4 puan, doğru fark 3 puan, doğru sonuç 2 puan. Haftalık sıralamada yüksel!"
          />
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2024 ScoreMates — Türkiye Süper Lig Tahmin Platformu
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}
