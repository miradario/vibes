const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const url = 'https://mhmpjezgdvnqyqsnabuq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obXBqZXpnZHZucXlxc25hYnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzcwOTYsImV4cCI6MjA4NTIxMzA5Nn0.WfNQUNf7SSSYaK3cJ_F--GQeAn0AOgvRZNizw37hfK0';

const supabase = createClient(url, key);

async function main() {
  // Test the /swipe edge function
  console.log("=== Testing /swipe edge function ===\n");
  try {
    const res = await axios.post(`${url}/functions/v1/swipe`, {
      targetUserId: "00000000-0000-0000-0000-000000000001",
      direction: "like"
    }, {
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "apikey": key
      },
      validateStatus: () => true // don't throw on error status
    });
    console.log("status:", res.status);
    console.log("response:", JSON.stringify(res.data));
  } catch (e) {
    console.log("error calling /swipe:", e.message);
  }

  // List all edge functions available
  console.log("\n=== Testing other function endpoints ===");
  for (const fn of ["swipe", "swipes", "match"]) {
    try {
      const res = await axios.get(`${url}/functions/v1/${fn}`, {
        headers: { "Authorization": `Bearer ${key}`, "apikey": key },
        validateStatus: () => true
      });
      console.log(`GET /${fn}: status=${res.status}`);
    } catch (e) {
      console.log(`GET /${fn}: ${e.message}`);
    }
  }
}

main().catch(console.error);

main().catch(console.error);
