-- favorite_team column on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_team TEXT;

-- special_questions
CREATE TABLE IF NOT EXISTS special_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  question_text text NOT NULL,
  correct_answer integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(league_id, week_number, sort_order)
);
ALTER TABLE special_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='special_questions' AND policyname='sq_all') THEN
    CREATE POLICY sq_all ON special_questions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- special_predictions
CREATE TABLE IF NOT EXISTS special_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES special_questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  predicted_value integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(question_id, user_id)
);
ALTER TABLE special_predictions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='special_predictions' AND policyname='sp_all') THEN
    CREATE POLICY sp_all ON special_predictions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- special_bonuses
CREATE TABLE IF NOT EXISTS special_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, league_id, week_number)
);
ALTER TABLE special_bonuses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='special_bonuses' AND policyname='sb_all') THEN
    CREATE POLICY sb_all ON special_bonuses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- question_suggestions
CREATE TABLE IF NOT EXISTS question_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'approved', 'rejected')),
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, league_id)
);
ALTER TABLE question_suggestions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='question_suggestions' AND policyname='qs_all') THEN
    CREATE POLICY qs_all ON question_suggestions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- suggestion_votes
CREATE TABLE IF NOT EXISTS suggestion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid REFERENCES question_suggestions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(suggestion_id, user_id)
);
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='suggestion_votes' AND policyname='sv_all') THEN
    CREATE POLICY sv_all ON suggestion_votes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;