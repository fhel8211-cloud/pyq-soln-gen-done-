/*
  # Add answer and solution columns to questions_topic_wise table and ensure RLS
  1. New Columns: questions_topic_wise.answer (text), questions_topic_wise.solution (text)
  2. Security: Enable RLS and add read/update policies for authenticated users on the questions_topic_wise table.
*/
ALTER TABLE IF EXISTS questions_topic_wise
ADD COLUMN IF NOT EXISTS answer text,
ADD COLUMN IF NOT EXISTS solution text;

-- Ensure RLS is enabled for questions_topic_wise table
ALTER TABLE questions_topic_wise ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read questions
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read questions"
ON questions_topic_wise FOR SELECT TO authenticated
USING (true);

-- Policy to allow authenticated users to update questions (for the solution generator)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update questions"
ON questions_topic_wise FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);