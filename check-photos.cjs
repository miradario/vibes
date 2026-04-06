const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // 0. List all buckets
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error('Error listing buckets:', bucketsErr.message);
  } else {
    console.log('=== All buckets ===');
    for (const b of buckets) {
      console.log(`  "${b.name}" | public: ${b.public} | id: ${b.id}`);
    }
    console.log('');
  }

  // 1. Try upload a test file
  const testPath = 'test/check-upload.txt';
  const testBody = new TextEncoder().encode('test');
  const { error: testUploadErr } = await supabase.storage
    .from('profile pictures')
    .upload(testPath, testBody, { contentType: 'text/plain', upsert: true });
  if (testUploadErr) {
    console.log('Test upload FAILED:', testUploadErr.message);
  } else {
    console.log('Test upload OK');
    // Clean up
    await supabase.storage.from('profile pictures').remove([testPath]);
  }
  console.log('');

  // 1. List all folders (user IDs) in the bucket
  const { data: folders, error: foldersErr } = await supabase.storage
    .from('profile pictures')
    .list('', { limit: 100 });

  if (foldersErr) {
    console.error('Error listing bucket root:', foldersErr.message);
    return;
  }

  console.log('=== Bucket "profile pictures" contents ===\n');
  console.log('Root items:', folders.length);

  for (const folder of folders) {
    if (folder.id === null || folder.metadata) {
      // It's a file at root level
      console.log(`  [file] ${folder.name}`);
      continue;
    }
    // It's a folder (user ID)
    const { data: files, error: filesErr } = await supabase.storage
      .from('profile pictures')
      .list(folder.name, { limit: 100 });

    if (filesErr) {
      console.log(`  [folder] ${folder.name} - ERROR: ${filesErr.message}`);
      continue;
    }

    console.log(`\n  [folder] ${folder.name} (${files.length} files)`);
    for (const file of files) {
      const path = `${folder.name}/${file.name}`;
      const size = file.metadata?.size ? `${Math.round(file.metadata.size / 1024)}KB` : '?';
      console.log(`    ${file.name} (${size})`);
    }
  }

  // 2. Cross-check with profile_photos table
  console.log('\n\n=== profile_photos table ===\n');
  const { data: dbPhotos, error: dbErr } = await supabase
    .from('profile_photos')
    .select('id, profile_id, url, order, is_primary')
    .order('profile_id')
    .order('order');

  if (dbErr) {
    console.error('DB error:', dbErr.message);
    return;
  }

  console.log('Total rows:', dbPhotos.length, '\n');

  for (const row of dbPhotos) {
    const { data: signData, error: signErr } = await supabase.storage
      .from('profile pictures')
      .createSignedUrl(row.url, 60);

    const status = signErr ? 'MISSING' : 'OK';
    console.log(`${status} | profile: ${row.profile_id} | order: ${row.order} | primary: ${row.is_primary} | path: ${row.url}`);
  }
}

main().catch(console.error);
