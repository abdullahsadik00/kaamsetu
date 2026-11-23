-- Turn on row-level security for every table in public (D-040).
-- Supabase serves the public schema over its Data API (PostgREST) with the
-- public anon key; with RLS on and no policies, those roles see nothing.
-- The API connects as the table owner, which RLS does not apply to (no FORCE).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
