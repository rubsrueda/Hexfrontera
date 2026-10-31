-- Competencia asíncrona · repeticiones del Top por mapa.
-- Ejecutar una vez en el SQL Editor de Supabase sobre la tabla ya existente.
-- Sin esta columna, los rankings y las puntuaciones siguen funcionando; solo
-- dejan de estar disponibles los botones ▶ de repetición.

ALTER TABLE public.hf_map_scores
  ADD COLUMN IF NOT EXISTS replay_code TEXT;

-- Acelera el puesto del jugador y la descarga de su repetición.
CREATE INDEX IF NOT EXISTS idx_map_scores_player
  ON public.hf_map_scores (player_id, score DESC);
