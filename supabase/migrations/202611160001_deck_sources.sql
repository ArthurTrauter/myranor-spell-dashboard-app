-- NULL keeps all of the spell's sources. Existing deck entries retain that behavior.
ALTER TABLE public.user_decks
  ADD COLUMN IF NOT EXISTS selected_sources text[]
  CHECK (selected_sources IS NULL OR cardinality(selected_sources) > 0);

COMMENT ON COLUMN public.user_decks.selected_sources IS
  'Source names selected for this deck spell; NULL means all sources.';
