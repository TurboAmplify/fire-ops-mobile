
-- Add OF-297 shift ticket fields to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS miles numeric;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_first_last boolean DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS transport_retained boolean;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS incident_number text;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS financial_code text;

-- Add operating/standby time splits to shift_crew for OF-297 compliance
ALTER TABLE shift_crew ADD COLUMN IF NOT EXISTS operating_start time;
ALTER TABLE shift_crew ADD COLUMN IF NOT EXISTS operating_stop time;
ALTER TABLE shift_crew ADD COLUMN IF NOT EXISTS standby_start time;
ALTER TABLE shift_crew ADD COLUMN IF NOT EXISTS standby_stop time;
