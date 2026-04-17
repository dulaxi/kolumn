-- Add tier column to profiles (default free)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro'));

-- Chat usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_count int NOT NULL DEFAULT 0,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, usage_date)
);

-- RLS
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON chat_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON chat_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON chat_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Atomic increment + check function
CREATE OR REPLACE FUNCTION increment_chat_usage(target_user_id uuid, daily_limit int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count int;
BEGIN
  INSERT INTO chat_usage (user_id, message_count, usage_date)
  VALUES (target_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET message_count = chat_usage.message_count + 1
  RETURNING message_count INTO current_count;

  RETURN json_build_object(
    'count', current_count,
    'limit', daily_limit,
    'allowed', current_count <= daily_limit
  );
END;
$$;
