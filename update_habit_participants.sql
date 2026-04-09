-- Update habit_participants to store individual progress
ALTER TABLE habit_participants ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '{}'::jsonb;
ALTER TABLE habit_participants ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;

-- Grant permissions
GRANT ALL ON habit_participants TO authenticated;
GRANT ALL ON habit_participants TO service_role;
