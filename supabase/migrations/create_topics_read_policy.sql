/*
  # Create RLS policy for topics table
  1. Security: Add read policy for authenticated users on the topics table, safely checking for existence.
*/
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'topics' AND policyname = 'Allow authenticated users to read topics') THEN
    CREATE POLICY "Allow authenticated users to read topics"
    ON topics FOR SELECT TO authenticated
    USING (true);
  END IF;
END
$$;
