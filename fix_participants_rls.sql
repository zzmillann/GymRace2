-- Add missing UPDATE policy for habit_participants
ALTER TABLE habit_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants update own" ON habit_participants;
CREATE POLICY "Participants update own" ON habit_participants 
FOR UPDATE USING (auth.uid() = user_id);

-- Ensure all other tables have correct update policies
DROP POLICY IF EXISTS "Invitations update receiver" ON habit_invitations;
CREATE POLICY "Invitations update receiver" ON habit_invitations FOR UPDATE USING (auth.uid() = receiver_id);
