-- =============================================================
-- SaaS Foundation: Plans + Usage Tracking
-- =============================================================

-- Plans table — one row per pricing tier (just 'free' for now)
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  limits jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Seed the free plan
INSERT INTO plans (id, name, limits) VALUES
  ('free', 'Free', '{"boards": null, "members_per_board": null}')
ON CONFLICT (id) DO NOTHING;

-- Add plan reference to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan_id text DEFAULT 'free' REFERENCES plans(id);
  END IF;
END $$;

-- RLS for plans (public read, no write from client)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans"
  ON plans FOR SELECT
  USING (true);

-- =============================================================
-- Usage Metrics
-- =============================================================

CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  period text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, metric, period)
);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own metrics"
  ON usage_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_period
  ON usage_metrics(user_id, period);

-- =============================================================
-- Tracking Triggers
-- =============================================================

-- Helper: upsert a usage metric (increment by 1)
CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_user_id uuid,
  p_metric text,
  p_period text
) RETURNS void AS $$
BEGIN
  INSERT INTO usage_metrics (user_id, metric, value, period, updated_at)
  VALUES (p_user_id, p_metric, 1, p_period, now())
  ON CONFLICT (user_id, metric, period)
  DO UPDATE SET value = usage_metrics.value + 1, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track boards_created
CREATE OR REPLACE FUNCTION track_board_created() RETURNS trigger AS $$
BEGIN
  PERFORM increment_usage_metric(
    NEW.owner_id,
    'boards_created',
    to_char(now(), 'YYYY-MM')
  );
  PERFORM increment_usage_metric(
    NEW.owner_id,
    'total_boards',
    'lifetime'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_board_created ON boards;
CREATE TRIGGER trg_track_board_created
  AFTER INSERT ON boards
  FOR EACH ROW EXECUTE FUNCTION track_board_created();

-- Track cards_created (use the board's owner_id via join)
CREATE OR REPLACE FUNCTION track_card_created() RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM boards WHERE id = NEW.board_id;
  IF v_owner_id IS NOT NULL THEN
    PERFORM increment_usage_metric(
      v_owner_id,
      'cards_created',
      to_char(now(), 'YYYY-MM')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_card_created ON cards;
CREATE TRIGGER trg_track_card_created
  AFTER INSERT ON cards
  FOR EACH ROW EXECUTE FUNCTION track_card_created();

-- Track members_invited
CREATE OR REPLACE FUNCTION track_member_invited() RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM boards WHERE id = NEW.board_id;
  IF v_owner_id IS NOT NULL THEN
    PERFORM increment_usage_metric(
      v_owner_id,
      'members_invited',
      to_char(now(), 'YYYY-MM')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_member_invited ON board_invitations;
CREATE TRIGGER trg_track_member_invited
  AFTER INSERT ON board_invitations
  FOR EACH ROW EXECUTE FUNCTION track_member_invited();
