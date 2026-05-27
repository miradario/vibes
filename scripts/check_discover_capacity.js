#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(process.cwd(), ".env");
const fileEnv = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs
        .readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((line) => {
          const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
          if (!match) return null;
          return [match[1], match[2].replace(/^['"]|['"]$/g, "")];
        })
        .filter(Boolean),
    )
  : {};

const env = { ...fileEnv, ...process.env };
const supabaseUrl = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SERVICE_ROLE_KEY ||
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const currentUserId = env.USER_ID || process.argv[2];
const usingServiceRole = Boolean(env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env. Need EXPO_PUBLIC_SUPABASE_URL and a key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const toCoordinate = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toRadians = (value) => (value * Math.PI) / 180;

const distanceKm = (originLat, originLng, targetLat, targetLng) => {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLng = toRadians(targetLng - originLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(originLat)) *
      Math.cos(toRadians(targetLat)) *
      Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ageFromBirthDate = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age > 0 ? age : null;
};

const countQuery = async (name, query) => {
  const { count, error, status } = await query;
  if (error) {
    console.log(`${name}: ERROR ${status ?? ""} ${error.message || JSON.stringify(error)}`);
    return null;
  }
  console.log(`${name}: ${count ?? 0}`);
  return count ?? 0;
};

const main = async () => {
  console.log(`Supabase access: ${usingServiceRole ? "service role" : "anon"}`);
  if (!usingServiceRole) {
    console.log(
      "Tip: profiles/profile_photos are private. For a real count run with SUPABASE_SERVICE_ROLE_KEY=...",
    );
  }

  await countQuery(
    "profiles total",
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  );
  await countQuery(
    "profiles active",
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  );
  await countQuery(
    "swipes total",
    supabase.from("swipes").select("id", { count: "exact", head: true }),
  );

  if (!currentUserId) {
    console.log("\nPass USER_ID=<uuid> or the uuid as first arg to check available Discover users.");
    return;
  }

  const [{ data: currentProfile, error: currentProfileError }, { data: swipes, error: swipesError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,latitude,longitude")
        .eq("id", currentUserId)
        .maybeSingle(),
      supabase.from("swipes").select("target_id").eq("swiper_id", currentUserId),
    ]);

  if (currentProfileError) {
    console.log(`current profile: ERROR ${currentProfileError.message}`);
    return;
  }
  if (swipesError) {
    console.log(`user swipes: ERROR ${swipesError.message}`);
    return;
  }

  const swipedIds = new Set((swipes ?? []).map((row) => String(row.target_id)));
  const { data: candidates, error: candidatesError } = await supabase
    .from("profiles")
    .select("id,display_name,birth_date,age,smoking,latitude,longitude,is_active,created_at")
    .eq("is_active", true)
    .neq("id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (candidatesError) {
    console.log(`candidate rows: ERROR ${candidatesError.message}`);
    return;
  }

  const afterSwipes = (candidates ?? []).filter((row) => !swipedIds.has(String(row.id)));
  const originLat = toCoordinate(currentProfile?.latitude);
  const originLng = toCoordinate(currentProfile?.longitude);
  const afterDefaultClientFilters = afterSwipes.filter((row) => {
    const age = ageFromBirthDate(row.age ?? row.birth_date);
    if (age !== null && (age < 18 || age > 80)) return false;

    const targetLat = toCoordinate(row.latitude);
    const targetLng = toCoordinate(row.longitude);
    if (
      originLat !== null &&
      originLng !== null &&
      targetLat !== null &&
      targetLng !== null &&
      distanceKm(originLat, originLng, targetLat, targetLng) > 250
    ) {
      return false;
    }

    return true;
  });

  console.log(`\ncurrent user: ${currentUserId}`);
  console.log(`already swiped/dismissed by user: ${swipedIds.size}`);
  console.log(`active candidates before swipe exclusion: ${(candidates ?? []).length}`);
  console.log(`available after swipe exclusion: ${afterSwipes.length}`);
  console.log(`available after default client filters: ${afterDefaultClientFilters.length}`);
  console.log(`Discover can show "Mostrar más": ${afterDefaultClientFilters.length > 30 ? "yes" : "no"}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
