
-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true);

-- Anyone can read receipts (public bucket)
CREATE POLICY "Public read receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

-- Anyone can upload receipts (no auth yet)
CREATE POLICY "Allow upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts');

-- Anyone can update receipts
CREATE POLICY "Allow update receipts" ON storage.objects
  FOR UPDATE USING (bucket_id = 'receipts');

-- Anyone can delete receipts
CREATE POLICY "Allow delete receipts" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts');
