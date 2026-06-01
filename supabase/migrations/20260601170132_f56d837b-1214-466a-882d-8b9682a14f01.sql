
-- Insert R1-R10 regions (Forest Service)
INSERT INTO public.gacc_regions (id, name, states, sort_order) VALUES
  ('R1',  'Region 1 — Northern',           ARRAY['MT','ND','northern ID','northwestern SD'], 1),
  ('R2',  'Region 2 — Rocky Mountain / Great Plains', ARRAY['CO','KS','NE','SD','WY'],       2),
  ('R3',  'Region 3 — Southwestern',       ARRAY['AZ','NM'],                                 3),
  ('R4',  'Region 4 — Intermountain',      ARRAY['southern ID','NV','UT','western WY'],     4),
  ('R5',  'Region 5 — Pacific Southwest',  ARRAY['CA','HI'],                                 5),
  ('R6',  'Region 6 — Pacific Northwest',  ARRAY['OR','WA'],                                 6),
  ('R8',  'Region 8 — Southern',           ARRAY['AL','AR','FL','GA','KY','LA','MS','NC','OK','SC','TN','TX','VA','PR'], 7),
  ('R9',  'Region 9 — Eastern',            ARRAY['CT','DE','IA','IL','IN','ME','MD','MA','MI','MN','MO','NH','NJ','NY','OH','PA','RI','VT','WV','WI'], 8),
  ('R10', 'Region 10 — Alaska',            ARRAY['AK'],                                      9)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  states = EXCLUDED.states,
  sort_order = EXCLUDED.sort_order;

-- Remap existing finance_officers from old GACC codes -> R codes
UPDATE public.finance_officers SET region_id = CASE region_id
  WHEN 'NWCC' THEN 'R6'
  WHEN 'NOCC' THEN 'R5'
  WHEN 'OSCC' THEN 'R5'
  WHEN 'NRCC' THEN 'R1'
  WHEN 'GBCC' THEN 'R4'
  WHEN 'RMCC' THEN 'R2'
  WHEN 'SWCC' THEN 'R3'
  WHEN 'SACC' THEN 'R8'
  WHEN 'EACC' THEN 'R9'
  WHEN 'AKCC' THEN 'R10'
  ELSE region_id
END
WHERE region_id IN ('NWCC','NOCC','OSCC','NRCC','GBCC','RMCC','SWCC','SACC','EACC','AKCC');

-- Same remap for incidents
UPDATE public.incidents SET region_id = CASE region_id
  WHEN 'NWCC' THEN 'R6'
  WHEN 'NOCC' THEN 'R5'
  WHEN 'OSCC' THEN 'R5'
  WHEN 'NRCC' THEN 'R1'
  WHEN 'GBCC' THEN 'R4'
  WHEN 'RMCC' THEN 'R2'
  WHEN 'SWCC' THEN 'R3'
  WHEN 'SACC' THEN 'R8'
  WHEN 'EACC' THEN 'R9'
  WHEN 'AKCC' THEN 'R10'
  ELSE region_id
END
WHERE region_id IN ('NWCC','NOCC','OSCC','NRCC','GBCC','RMCC','SWCC','SACC','EACC','AKCC');

-- Remove obsolete GACC rows
DELETE FROM public.gacc_regions
WHERE id IN ('NWCC','NOCC','OSCC','NRCC','GBCC','RMCC','SWCC','SACC','EACC','AKCC');
