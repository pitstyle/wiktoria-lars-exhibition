-- Supabase Database Schema for Wiktoria-Lars Conversation System
-- Run this in your Supabase SQL Editor

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ultravox_call_id TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('lars', 'wiktoria', 'user')),
  stage TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_ultravox_call_id ON conversations(ultravox_call_id);
CREATE INDEX IF NOT EXISTS idx_conversations_start_time ON conversations(start_time);
CREATE INDEX IF NOT EXISTS idx_transcripts_conversation_id ON transcripts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_speaker ON transcripts(speaker);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON transcripts(timestamp);

-- 4. Enable full-text search on transcript content
CREATE INDEX IF NOT EXISTS idx_transcripts_content_fts ON transcripts USING gin(to_tsvector('english', content));

-- 5. Create RLS (Row Level Security) policies if needed
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- 6. Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create trigger for conversations table
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Sample data (optional - for testing)
-- INSERT INTO conversations (ultravox_call_id, user_name, topic) 
-- VALUES ('sample-call-123', 'Test User', 'Database Setup Test');

-- Verify tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename IN ('conversations', 'transcripts');