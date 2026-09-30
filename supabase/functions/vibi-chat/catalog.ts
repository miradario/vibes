import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";
import {
  type Candidate,
  type Row,
  distance,
  matchesPerson,
  strings,
  text,
  visibleActivity,
} from "./core.ts";

async function rows(query: any): Promise<Row[]> {
  const result: Row[] = [];
  // Page all visible rows before filtering/ranking, avoiding a biased first-page pool.
  for (let from = 0; ; from += 500) {
    const { data, error } = await query.range(from, from + 499);
    if (error) throw error;
    result.push(...(data ?? []));
    if (!data || data.length < 500) return result;
  }
}
const preferenceFields =
  "user_id,spiritual_path,spiritual_path_details,other_tags,languages,onboarding_purpose,looking_for,profile_answers,gender,height_cm,smoking,vegetarian,education,family_plan,pets,zodiac,personality,communication_style,love_style,open_to";
export async function loadCatalog(db: SupabaseClient, userId: string) {
  const [
    profiles,
    preferences,
    ownResult,
    blocks,
    swipes,
    events,
    challenges,
    eventJoins,
    challengeJoins,
  ] = await Promise.all([
    rows(
      db
        .from("profiles")
        .select(
          "id,display_name,birth_date,gender_id,is_active,deleted_at,latitude,longitude"
        )
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("id")
    ),
    rows(db.from("user_preferences").select(preferenceFields).order("user_id")),
    db
      .from("user_preferences")
      .select(
        `${preferenceFields},discover_age_min,discover_age_max,discover_gender_id,discover_genders,discover_diets,discover_smoking,discover_spiritual_paths,discover_answer_filters,discover_distance_min_km,discover_distance_max_km`
      )
      .eq("user_id", userId)
      .maybeSingle(),
    rows(
      db
        .from("user_blocks")
        .select("id,blocker_id,blocked_user_id")
        .or(`blocker_id.eq.${userId},blocked_user_id.eq.${userId}`)
        .order("id")
    ),
    rows(
      db
        .from("swipes")
        .select("id,target_id,direction,created_at")
        .eq("swiper_id", userId)
        .order("id")
    ),
    rows(
      db
        .from("events")
        .select(
          "id,type,title,description,tags,image_url,created_by,starts_at,capacity,participant_count,location,modality"
        )
        .eq("type", "event")
        .gt("starts_at", new Date().toISOString())
        .order("id")
    ),
    rows(
      db
        .from("challenges")
        .select(
          "id,title,description,tags,image_url,created_by,duration_days,visibility"
        )
        .eq("visibility", "public")
        .order("id")
    ),
    rows(
      db
        .from("event_participants")
        .select("id,event_id,event_type")
        .eq("user_id", userId)
        .order("id")
    ),
    rows(
      db
        .from("challenge_participants")
        .select("id,challenge_id")
        .eq("user_id", userId)
        .order("id")
    ),
  ]);
  if (ownResult.error) throw ownResult.error;
  const own = profiles.find((p) => p.id === userId);
  if (!own) throw new Error("inactive_profile");
  const ownPreferences = ownResult.data ?? {};
  const blocked = new Set(
    blocks.map((b) =>
      b.blocker_id === userId ? b.blocked_user_id : b.blocker_id
    )
  );
  const hidden = new Set(
    swipes
      .filter(
        (s) =>
          s.direction === "like" ||
          Date.now() - new Date(s.created_at).getTime() < 30 * 86400000
      )
      .map((s) => s.target_id)
  );
  const creators = new Set(
    profiles.filter((p) => !blocked.has(p.id)).map((p) => p.id)
  );
  const preferencesById = new Map(preferences.map((p) => [p.user_id, p]));
  const candidates: Candidate[] = [];
  for (const [type, items, joined] of [
    [
      "event",
      events,
      new Set(
        eventJoins
          .filter((j) => j.event_type === "event")
          .map((j) => j.event_id)
      ),
    ],
    [
      "challenge",
      challenges,
      new Set([
        ...challengeJoins.map((j) => j.challenge_id),
        ...eventJoins
          .filter((j) => j.event_type === "challenge")
          .map((j) => j.event_id),
      ]),
    ],
  ] as const) {
    for (const item of items) {
      if (!visibleActivity(item, type, joined, creators)) continue;
      candidates.push({
        id: item.id,
        type,
        title: text(item.title, 150),
        description: text(item.description, 1000).replace(
          /\[\[[^\]]+\]\]/g,
          ""
        ),
        tags: strings(item.tags),
        thumbnail: text(item.image_url, 2000) || null,
        startsAt:
          item.starts_at ??
          item.description?.match(/\[\[starts_at:([^\]]+)\]\]/)?.[1] ??
          null,
        durationDays: item.duration_days,
        location: text(item.location, 150) || null,
        modality: item.modality,
      });
    }
  }
  const people = profiles.filter(
    (p) =>
      !blocked.has(p.id) &&
      !hidden.has(p.id) &&
      matchesPerson(p, preferencesById.get(p.id) ?? {}, own, ownPreferences)
  );
  const photos = new Map<string, string>();
  for (let i = 0; i < people.length; i += 50) {
    const photoRows = await rows(
      db
        .from("profile_photos")
        .select("id,profile_id,url,is_primary,order")
        .in(
          "profile_id",
          people.slice(i, i + 50).map((p) => p.id)
        )
        .order("is_primary", { ascending: false })
        .order("order")
        .order("id")
    );
    for (const p of photoRows)
      if (!photos.has(p.profile_id)) photos.set(p.profile_id, p.url);
  }
  for (const person of people) {
    const p = preferencesById.get(person.id) ?? {};
    const interests = [
      ...strings(p.other_tags),
      ...strings(p.spiritual_path),
      ...strings(p.profile_answers?.hobbies),
      ...strings(p.profile_answers?.favoritePlans),
    ];
    candidates.push({
      id: person.id,
      type: "person",
      title: text(person.display_name, 150),
      description: interests.join(", ").slice(0, 500),
      tags: interests.slice(0, 20),
      thumbnail: photos.get(person.id) ?? null,
      distanceKm: distance(own, person),
    });
  }
  return { candidates, preferences: ownPreferences };
}
export async function hydrateCards(
  db: SupabaseClient,
  cards: Row[],
  catalog: Candidate[]
) {
  const hydrated = await Promise.all(
    cards.map(async (card) => {
      const current = catalog.find(
        (c) => c.id === card.id && c.type === card.type
      );
      if (!current) return null;
      let thumbnail = current.thumbnail;
      if (thumbnail && current.type === "person") {
        let path: string | null = thumbnail;
        if (/^https?:\/\//i.test(thumbnail)) {
          const match = thumbnail.match(
            /\/object\/(?:public|sign)\/profile(?:%20| )pictures\/(.+?)(?:\?|$)/i
          );
          path = match ? decodeURIComponent(match[1]) : null;
        }
        if (path) {
          const { data, error } = await db.storage
            .from("profile pictures")
            .createSignedUrl(path, 3600);
          thumbnail = error ? null : data.signedUrl;
        }
      }
      if (thumbnail && !/^https?:\/\//i.test(thumbnail)) thumbnail = null;
      return {
        ...current,
        thumbnail,
        reason: text(card.reason, 300),
        destination: { type: current.type, id: current.id },
      };
    })
  );
  return hydrated.filter((c) => c !== null);
}
