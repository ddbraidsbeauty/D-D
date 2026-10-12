-- REFERENCE ONLY: Applied to Supabase on 2026-10-12.
-- DO NOT run this as part of the static site deployment.
-- Existing data and SECURITY DEFINER checks are preserved.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
DO $fix$
DECLARE rec record;
DECLARE sql_def text;
BEGIN
 FOR rec IN
   SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS definition
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public'
     AND p.proname IN ('admin_save_category','admin_save_method','admin_save_professional','admin_save_service','admin_save_variation')
 LOOP
   IF rec.definition NOT LIKE '%unaccent(%' THEN
     RAISE EXCEPTION 'expected unaccent() reference missing in %', rec.proname;
   END IF;
   IF rec.definition NOT LIKE '%SET search_path TO ''''%' THEN
     RAISE EXCEPTION 'security search_path differs in %', rec.proname;
   END IF;
   sql_def := replace(rec.definition, 'unaccent(', 'extensions.unaccent(');
   EXECUTE sql_def;
 END LOOP;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN
     ('admin_save_category','admin_save_method','admin_save_professional','admin_save_service','admin_save_variation')
     AND pg_get_functiondef(p.oid) LIKE '%extensions.unaccent(%') <> 5 THEN
   RAISE EXCEPTION 'five protected admin functions not upgraded';
 END IF;
END $fix$;
