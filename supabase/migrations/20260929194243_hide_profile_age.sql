ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS hide_age boolean NOT NULL DEFAULT false;
