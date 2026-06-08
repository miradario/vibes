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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
const shouldDelete = env.CONFIRM_DELETE_USERS === "1";
const allowMissingKeepCriteria = env.OVERRIDE_MISSING_KEEP === "1";

const keepEmail = "asobralr@gmail.com";
const keepNameFragments = ["hernan", "monica"];

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase admin env.");
  console.error("Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const listAllAuthUsers = async () => {
  const users = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < perPage) break;
  }

  return users;
};

const listProfilesById = async (userIds) => {
  const profilesById = new Map();
  const chunkSize = 500;

  for (let index = 0; index < userIds.length; index += chunkSize) {
    const chunk = userIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", chunk);

    if (error) throw error;

    for (const profile of data ?? []) {
      profilesById.set(profile.id, profile);
    }
  }

  return profilesById;
};

const main = async () => {
  const authUsers = await listAllAuthUsers();
  const profilesById = await listProfilesById(authUsers.map((user) => user.id));

  const keepIds = new Set();
  const matchedCriteria = new Map([
    [`email:${keepEmail}`, []],
    ...keepNameFragments.map((name) => [`name:${name}`, []]),
  ]);

  const rows = authUsers.map((user) => {
    const email = normalize(user.email);
    const profile = profilesById.get(user.id);
    const displayName = profile?.display_name ?? "";
    const normalizedDisplayName = normalize(displayName);
    const reasons = [];

    if (email === keepEmail) {
      reasons.push(`email:${keepEmail}`);
    }

    for (const fragment of keepNameFragments) {
      if (normalizedDisplayName.includes(fragment)) {
        reasons.push(`name:${fragment}`);
      }
    }

    if (reasons.length > 0) {
      keepIds.add(user.id);
      for (const reason of reasons) {
        matchedCriteria.get(reason)?.push(user.id);
      }
    }

    return {
      id: user.id,
      email: user.email ?? "",
      displayName,
      createdAt: user.created_at,
      keep: reasons.length > 0,
      reasons,
    };
  });

  const missingCriteria = Array.from(matchedCriteria.entries())
    .filter(([, ids]) => ids.length === 0)
    .map(([criterion]) => criterion);

  console.log(`Auth users found: ${authUsers.length}`);
  console.log(`Users to keep: ${keepIds.size}`);
  console.log(`Users to delete: ${rows.length - keepIds.size}`);

  console.log("\nKeep:");
  for (const row of rows.filter((item) => item.keep)) {
    console.log(
      `- ${row.id} | ${row.email || "(no email)"} | ${row.displayName || "(no profile name)"} | ${row.reasons.join(", ")}`,
    );
  }

  if (missingCriteria.length > 0) {
    console.error(`\nMissing keep criteria: ${missingCriteria.join(", ")}`);
    if (!allowMissingKeepCriteria) {
      console.error("Aborting. Set OVERRIDE_MISSING_KEEP=1 only if this is expected.");
      process.exit(1);
    }
  }

  const deleteRows = rows.filter((row) => !row.keep);
  console.log("\nDelete candidates:");
  for (const row of deleteRows) {
    console.log(`- ${row.id} | ${row.email || "(no email)"} | ${row.displayName || "(no profile name)"}`);
  }

  if (!shouldDelete) {
    console.log("\nDry run only. Re-run with CONFIRM_DELETE_USERS=1 to delete these auth users.");
    return;
  }

  for (const row of deleteRows) {
    const { error } = await supabase.auth.admin.deleteUser(row.id);
    if (error) {
      console.error(`Failed to delete ${row.id} (${row.email}): ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    console.log(`Deleted ${row.id} | ${row.email || "(no email)"}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
