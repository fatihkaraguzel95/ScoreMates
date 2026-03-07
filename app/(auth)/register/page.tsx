"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    display_name: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (form.username.length < 3) {
      toast({
        title: "Hata",
        description: "Kullanıcı adı en az 3 karakter olmalı.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username,
          display_name: form.display_name || form.username,
        },
      },
    });

    if (error) {
      toast({ title: "Kayıt hatası", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Kayıt başarılı!", description: "Hesabınız oluşturuldu. Giriş yapılıyor..." });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">ScoreMates</h1>
          <p className="text-muted-foreground mt-1">Süper Lig Tahmin Ligi</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kayıt Ol</CardTitle>
            <CardDescription>Yeni bir hesap oluşturun</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  placeholder="kullanici_adi"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "_") })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Görünen Ad</Label>
                <Input
                  id="display_name"
                  placeholder="Ahmet Yılmaz"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="En az 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Zaten hesabınız var mı?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Giriş Yap
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
