-- Add saturday and sunday slots JSONB columns with empty array default
ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "saturdaySlotsJson" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "sundaySlotsJson" JSONB DEFAULT '[]'::jsonb;

