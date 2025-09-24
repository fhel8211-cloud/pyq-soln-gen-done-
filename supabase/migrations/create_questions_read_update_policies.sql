/*
  # Create RLS policies for questions_topic_wise table
  1. Security: Add read and update policies for authenticated users on the questions_topic_wise table, safely checking for existence.
*/
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions_topic_wise' AND policyname = 'Allow authenticated users to read questions') THEN
    CREATE POLICY "Allow authenticated users to read questions"
    ON questions_topic_wise FOR SELECT TO authenticated
    USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions_topic_wise' AND policyname = 'Allow authenticated users to update questions') THEN
    CREATE POLICY "Allow authenticated users to update questions"
    ON questions_topic_wise FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
  END IF;
END
$$;
