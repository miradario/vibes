const { createClient } = require('@supabase/supabase-js');
const url = 'https://mhmpjezgdvnqyqsnabuq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obXBqZXpnZHZucXlxc25hYnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzcwOTYsImV4cCI6MjA4NTIxMzA5Nn0.WfNQUNf7SSSYaK3cJ_F--GQeAn0AOgvRZNizw37hfK0';
const sb = createClient(url, key);

async function main() {
  console.log('=== SWIPES ===');
  const { data: swipes, error: se } = await sb.from('swipes').select('*');
  console.log('error:', se?.message ?? 'none');
  console.log('count:', swipes?.length ?? 0);
  if (swipes) swipes.forEach(s => console.log(JSON.stringify(s)));

  console.log('\n=== MATCHES ===');
  const { data: matches, error: me } = await sb.from('matches').select('*');
  console.log('error:', me?.message ?? 'none');
  console.log('count:', matches?.length ?? 0);
  if (matches) matches.forEach(m => console.log(JSON.stringify(m)));

  console.log('\n=== MATCHES TABLE SCHEMA ===');
  const { data: cols, error: ce } = await sb.rpc('to_jsonb', {}).catch(() => ({}));
  // Fallback: try inserting with wrong data to see column info
  const { error: testErr } = await sb.from('matches').insert({ user1_id: '00000000-0000-0000-0000-000000000000', user2_id: '00000000-0000-0000-0000-000000000000' });
  console.log('test insert error:', testErr?.message ?? 'none', testErr?.code ?? '');
}

main();
