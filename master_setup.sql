-- ==========================================
-- MASTER SQL SETUP GYMRACE
-- Ejecuta todo esto junto en el SQL Editor
-- ==========================================

-- 1. TABLA PERFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code TEXT UNIQUE NOT NULL,
  user_name TEXT UNIQUE NOT NULL,
  email_internal TEXT,
  avatar_url TEXT DEFAULT '🦍',
  total_completions INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Asegurar que las columnas existen (por si la tabla ya estaba creada)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_internal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '🦍';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_completions INTEGER DEFAULT 0;

-- 2. TABLA HÁBITOS
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color_theme TEXT NOT NULL,
  history JSONB DEFAULT '{}'::jsonb,
  streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE
);

-- 3. TABLA AMISTADES
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' o 'accepted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, friend_id)
);

-- 4. HABILITAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS (BORRAR ANTIGUAS Y CREAR NUEVAS)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Habits viewable by owner and friends" ON habits;
DROP POLICY IF EXISTS "Users can insert own habits" ON habits;
DROP POLICY IF EXISTS "Users can update own habits" ON habits;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Habits owner access" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Habits friends view" ON habits FOR SELECT USING (
  EXISTS (SELECT 1 FROM friendships WHERE (user_id = auth.uid() AND friend_id = habits.user_id AND status = 'accepted'))
);

CREATE POLICY "Friendships access" ON friendships FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 6. TABLAS PARA HÁBITOS COMPARTIDOS
CREATE TABLE IF NOT EXISTS habit_participants (
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (habit_id, user_id)
);

CREATE TABLE IF NOT EXISTS habit_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE habit_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants visibility" ON habit_participants FOR SELECT USING (true);
CREATE POLICY "Participants insert own" ON habit_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Invitations visibility" ON habit_invitations FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "Invitations insert own" ON habit_invitations FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Invitations update receiver" ON habit_invitations FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Invitations delete" ON habit_invitations FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
