-- Complete Database Migration for Ultravox Archive System
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to conversations table
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS full_transcript JSONB,
  ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- 2. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_conversations_recording_url 
  ON conversations(recording_url) WHERE recording_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_end_time 
  ON conversations(end_time) WHERE end_time IS NOT NULL;

-- 3. Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'conversations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;