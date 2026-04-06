import { config } from 'dotenv';
config();
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.log('Missing env vars. url:', !!url, 'key:', !!key); process.exit(1); }

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(url, key);

const { data: photos, error } = await supabase.from('profile_photos').select('id, profile_id, url, order, is_primary');
if (error) { console.error('DB error:', error); process.exit(1); }
console.log('Total profile_photos rows:', photos.length);
console.log('---');

for (const photo of photos) {
  const path = photo.url;
  const { data, error: signError } = await supabase.storage
    .from('profile pictures')
    .createSignedUrl(path, 60);
  const exists = !signError;
  const status = exists ? 'OK' : 'MISSING';
  const err = exists ? '' : ` | ${signError.message}`;
  console.log(`${status} ${path} | profile: ${photo.profile_id} | order: ${photo.order}${err}`);
}
