-- 1. Create the "profile pictures" storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile pictures', 'profile pictures', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow authenticated users to update/overwrite their own files
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Allow any authenticated user to read profile pictures (needed for discover)
CREATE POLICY "Authenticated users can view all profile pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile pictures'
);
