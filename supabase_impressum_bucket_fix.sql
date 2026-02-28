
-- Update creator-impressum bucket to allow SVG
DO $$
BEGIN
    UPDATE storage.buckets
    SET allowed_mime_types = array_append(allowed_mime_types, 'image/svg+xml')
    WHERE id = 'creator-impressum' AND NOT ('image/svg+xml' = ANY(allowed_mime_types));
    
    -- If allowed_mime_types is null (all allowed), we don't need to do anything, 
    -- but if it's set to specific types, we need to ensure svg is there.
    -- If the bucket doesn't exist, we should probably create it or ensure it allows public access.
    
    -- Ensure the bucket is public
    UPDATE storage.buckets
    SET public = true
    WHERE id = 'creator-impressum';
END $$;
