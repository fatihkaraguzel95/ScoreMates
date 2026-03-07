/**
 * Migration runner — runs pending SQL migrations against Supabase.
 * Usage: node scripts/migrate.mjs
 */

import { createRequire } from "module"
import { readFileSync } from "fs"

const require = createRequire(import.meta.url)
const { Client } = require("pg")

// Load .env.local
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").trim().split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const dbPassword = env.SUPABASE_DB_PASSWORD

if (!supabaseUrl || !dbPassword) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_DB_PASSWORD eksik")
  process.exit(1)
}

const ref = supabaseUrl.replace("https://", "").split(".")[0]

// Try multiple connection formats (different regions + direct)
const candidates = [
  `postgresql://postgres.${ref}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${ref}:${dbPassword}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${ref}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${ref}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${ref}:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres:${dbPassword}@db.${ref}.supabase.co:5432/postgres`,
]

const migrations = [
  {
    name: "league_messages",
    sql: `
      CREATE TABLE IF NOT EXISTS league_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
        user_id uuid REFERENCES profiles(id),
        content text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE league_messages ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='league_messages' AND policyname='league_messages_select') THEN
          CREATE POLICY league_messages_select ON league_messages FOR SELECT
            USING (EXISTS (SELECT 1 FROM league_members lm WHERE lm.league_id = league_messages.league_id AND lm.user_id = auth.uid()));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='league_messages' AND policyname='league_messages_insert') THEN
          CREATE POLICY league_messages_insert ON league_messages FOR INSERT
            WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM league_members lm WHERE lm.league_id = league_messages.league_id AND lm.user_id = auth.uid()));
        END IF;
      END $$;
    `,
  },
  {
    name: "team_logos",
    sql: `
      CREATE TABLE IF NOT EXISTS team_logos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_name text UNIQUE NOT NULL,
        logo_base64 text NOT NULL,
        size_percent int NOT NULL DEFAULT 100,
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE team_logos ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_logos' AND policyname='team_logos_select') THEN
          CREATE POLICY team_logos_select ON team_logos FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_logos' AND policyname='team_logos_insert') THEN
          CREATE POLICY team_logos_insert ON team_logos FOR INSERT
            WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_logos' AND policyname='team_logos_update') THEN
          CREATE POLICY team_logos_update ON team_logos FOR UPDATE
            USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_logos' AND policyname='team_logos_delete') THEN
          CREATE POLICY team_logos_delete ON team_logos FOR DELETE
            USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
        END IF;
      END $$;
    `,
  },
]

async function tryConnect(url) {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
  await client.connect()
  return client
}

async function run() {
  console.log(`\n🔌  Supabase'e bağlanılıyor (${ref})…`)

  let client = null
  for (const url of candidates) {
    const region = url.includes("db.") ? "direct" : url.split("aws-0-")[1]?.split(".")[0]
    process.stdout.write(`   Deneniyor (${region ?? "?"})… `)
    try {
      client = await tryConnect(url)
      console.log("✅  Bağlandı!")
      break
    } catch (e) {
      console.log(`❌  ${e.message.slice(0, 60)}`)
    }
  }

  if (!client) {
    console.error(`
❌  Hiçbir bağlantı çalışmadı.

Kontrol et:
  1. SUPABASE_DB_PASSWORD değeri doğru mu?
  2. Supabase Dashboard → Settings → Database → "Database password" kısmındaki şifreyi kullandın mı?
  3. Şifrenin başında/sonunda boşluk yok mu?
`)
    process.exit(1)
  }

  try {
    for (const m of migrations) {
      process.stdout.write(`\n▶   Migration: ${m.name}… `)
      try {
        await client.query(m.sql)
        console.log("✅")
      } catch (e) {
        console.log(`❌  ${e.message}`)
      }
    }

    process.stdout.write(`▶   Realtime aktif ediliyor (league_messages)… `)
    try {
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE league_messages;`)
      console.log("✅")
    } catch (e) {
      console.log(e.message.toLowerCase().includes("already") ? "zaten aktif ✅" : `⚠️  ${e.message}`)
    }

    console.log("\n✅  Tüm migration'lar tamamlandı!\n")
  } finally {
    await client.end()
  }
}

run()
