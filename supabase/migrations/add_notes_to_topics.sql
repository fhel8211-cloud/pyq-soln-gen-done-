/*
  # Add notes column to topics table and ensure RLS
  1. New Columns: topics.notes (text)
  2. Security: Enable RLS and add a read policy for authenticated users on the topics table.
*/
ALTER TABLE IF EXISTS topics
ADD COLUMN IF NOT EXISTS notes text;

-- Ensure RLS is enabled for topics table
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read topics
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read topics"
ON topics FOR SELECT TO authenticated
USING (true);