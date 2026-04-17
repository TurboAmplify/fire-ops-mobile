-- 1. Add template_type column
ALTER TABLE public.inspection_templates
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'walkaround';

ALTER TABLE public.inspection_templates
  DROP CONSTRAINT IF EXISTS inspection_templates_template_type_check;

ALTER TABLE public.inspection_templates
  ADD CONSTRAINT inspection_templates_template_type_check
  CHECK (template_type IN ('walkaround','inventory'));

-- 2. For each existing template, create a sibling Inventory template in the same org
--    and move inventory-classified items into it. Keep walk-around items in the original.

-- Inventory keyword classifier (case-insensitive). If label matches → inventory.
-- We use a CTE-based approach.

DO $$
DECLARE
  tpl RECORD;
  inv_tpl_id uuid;
  inv_pattern text := '(hose|nozzle|fitting|wye|gated|valve|chainsaw|saw|axe|pulaski|mcleod|shovel|rake|drip torch|fusee|fuel can|jerry can|gas can|ppe|helmet|goggle|gloves|fire shelter|nomex|boots|first aid|extinguisher|backpack pump|bladder bag|pump|foam|class a foam|water cooler|cooler|mre|food|water (jug|bottle)|radio|gps|map|chain|strap|tow|jumper cable|spare tire|jack|tool box|wrench|tarp|flagging|flare|cone|battery|flashlight|headlamp|lantern|bar oil|chain oil|spark plug|filter (kit|set)|spare (parts|fuse))';
BEGIN
  FOR tpl IN SELECT id, organization_id, name FROM public.inspection_templates WHERE template_type = 'walkaround'
  LOOP
    -- Skip if no inventory-like items
    IF NOT EXISTS (
      SELECT 1 FROM public.inspection_template_items
      WHERE template_id = tpl.id AND label ~* inv_pattern
    ) THEN
      CONTINUE;
    END IF;

    -- Create inventory template in same org (not default)
    INSERT INTO public.inspection_templates (organization_id, name, is_default, template_type)
    VALUES (tpl.organization_id, 'Inventory Check', false, 'inventory')
    RETURNING id INTO inv_tpl_id;

    -- Move inventory items
    UPDATE public.inspection_template_items
    SET template_id = inv_tpl_id
    WHERE template_id = tpl.id AND label ~* inv_pattern;

    -- Rename original to make role clear (only if it kept generic names)
    UPDATE public.inspection_templates
    SET name = 'Walk-Around Inspection'
    WHERE id = tpl.id AND name ~* '(default|inspection|checklist|walk)';
  END LOOP;
END $$;

-- 3. Re-sequence sort_order in each template so it stays clean
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY template_id ORDER BY sort_order, label) - 1 AS new_order
  FROM public.inspection_template_items
)
UPDATE public.inspection_template_items i
SET sort_order = r.new_order
FROM ranked r
WHERE i.id = r.id;

-- 4. Ensure every org has at least one inventory template (empty if none was needed)
INSERT INTO public.inspection_templates (organization_id, name, is_default, template_type)
SELECT o.id, 'Inventory Check', false, 'inventory'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.inspection_templates t
  WHERE t.organization_id = o.id AND t.template_type = 'inventory'
);

-- 5. Index for filtered lookups
CREATE INDEX IF NOT EXISTS idx_inspection_templates_org_type
  ON public.inspection_templates(organization_id, template_type);