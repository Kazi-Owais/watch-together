-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can view rooms they are part of" ON public.rooms;

-- Create a security definer function to check if user is a room participant
CREATE OR REPLACE FUNCTION public.is_user_in_room(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_participants
    WHERE user_id = _user_id
      AND room_id = _room_id
  );
$$;

-- Create a security definer function to get user's room IDs
CREATE OR REPLACE FUNCTION public.get_user_room_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT room_id
  FROM public.room_participants
  WHERE user_id = _user_id;
$$;

-- Recreate the room_participants policy without recursion
CREATE POLICY "Users can view participants in their rooms"
ON public.room_participants
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  public.is_user_in_room(auth.uid(), room_id)
);

-- Recreate the rooms policy without recursion
CREATE POLICY "Users can view rooms they are part of"
ON public.rooms
FOR SELECT
USING (
  auth.uid() = created_by
  OR
  id IN (SELECT public.get_user_room_ids(auth.uid()))
);