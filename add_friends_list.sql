-- Add friends_list column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friends_list UUID[] DEFAULT '{}';

-- Atomic function to add friends to both lists
CREATE OR REPLACE FUNCTION add_friend_to_list(user_a UUID, user_b UUID)
RETURNS void AS $$
BEGIN
  -- Add B to A's list
  UPDATE profiles 
  SET friends_list = array_append(friends_list, user_b)
  WHERE id = user_a AND NOT (friends_list @> ARRAY[user_b]);
  
  -- Add A to B's list
  UPDATE profiles 
  SET friends_list = array_append(friends_list, user_a)
  WHERE id = user_b AND NOT (friends_list @> ARRAY[user_a]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
