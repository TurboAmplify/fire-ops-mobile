ALTER TABLE public.personnel_evals
  ADD COLUMN IF NOT EXISTS work_categories text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.personnel_evals
SET work_categories = ARRAY[coalesce(work_category, 'hot_line')]
WHERE cardinality(work_categories) = 0;