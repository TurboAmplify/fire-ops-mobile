ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_category_check
CHECK (category = ANY (ARRAY['fuel'::text, 'ppe'::text, 'food'::text, 'lodging'::text, 'equipment'::text, 'supplies'::text, 'other'::text]));