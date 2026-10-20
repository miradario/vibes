import { getChallengeTimeline } from "./challengeTimeline";
import { nextEventSession } from "./eventSchedule";
import type { EventFeedItem } from "../queries/events.queries";

export type HomeSection = "events" | "challenges" | "people";

// Fallback order when there is no signal (or on ties).
export const DEFAULT_HOME_SECTION_ORDER: HomeSection[] = [
  "people",
  "events",
  "challenges",
];

const normalize = (value: unknown) =>
  typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
    : "";

const listOf = (value: unknown) =>
  (Array.isArray(value) ? value : []).map(normalize).filter(Boolean);

// What the user said they came to Vibes for (onboarding "purpose", saved in open_to).
const PURPOSE_WEIGHTS: Record<string, Partial<Record<HomeSection, number>>> = {
  eventos: { events: 3 },
  clases: { events: 2 },
  "hacer servicio": { events: 1, challenges: 1 },
  desafios: { challenges: 3 },
  "conocer gente (descubrir)": { people: 3 },
  citas: { people: 3 },
};

export type HomeInterestSignals = {
  preferences?: Record<string, any> | null;
  joined: EventFeedItem[];
  matchesCount: number;
};

export function homeSectionScores({
  preferences,
  joined,
  matchesCount,
}: HomeInterestSignals) {
  const scores: Record<HomeSection, number> = {
    events: 0,
    challenges: 0,
    people: 0,
  };
  for (const purpose of listOf(preferences?.openTo ?? preferences?.open_to)) {
    const weights = PURPOSE_WEIGHTS[purpose] ?? {};
    for (const section of DEFAULT_HOME_SECTION_ORDER)
      scores[section] += weights[section] ?? 0;
  }
  const joinedEvents = joined.filter((item) => item.type === "event").length;
  const joinedChallenges = joined.filter(
    (item) => item.type === "challenge"
  ).length;
  scores.events += Math.min(joinedEvents, 5);
  scores.challenges += Math.min(joinedChallenges, 5);
  scores.people += Math.min(matchesCount, 10) * 0.5;
  return scores;
}

export function orderHomeSections(signals: HomeInterestSignals): HomeSection[] {
  const scores = homeSectionScores(signals);
  return [...DEFAULT_HOME_SECTION_ORDER].sort(
    (a, b) =>
      scores[b] - scores[a] ||
      DEFAULT_HOME_SECTION_ORDER.indexOf(a) -
        DEFAULT_HOME_SECTION_ORDER.indexOf(b)
  );
}

const SPIRITUAL_CATEGORIES = new Set(["spirituality", "wellness"]);
const SERVICE_CATEGORIES = new Set(["service", "volunteering"]);

const startTime = (item: EventFeedItem, now: number) => {
  const session =
    item.type === "event"
      ? nextEventSession(item.schedule, item.startsAt, now)
      : null;
  const time = Date.parse(session?.startsAt ?? item.startsAt ?? "");
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};

export const isFeaturable = (item: EventFeedItem, now: number) => {
  if ((item.visibility ?? "public") !== "public") return false;
  if (item.type === "event")
    return nextEventSession(item.schedule, item.startsAt, now) !== null;
  return (
    getChallengeTimeline(item.startsAt, item.durationDays).status !== "finished"
  );
};

export function homeItemScore(
  item: EventFeedItem,
  joined: EventFeedItem[],
  preferences: Record<string, any> | null | undefined,
  now: number
) {
  let score = 0;
  // Categories and tags the user already joined, by frequency.
  if (item.category && joined.length) {
    const same = joined.filter(
      (other) => other.category === item.category
    ).length;
    score += (2 * same) / joined.length;
  }
  const joinedTags = new Set(joined.flatMap((other) => listOf(other.tags)));
  score += Math.min(
    listOf(item.tags).filter((tag) => joinedTags.has(tag)).length * 0.5,
    1.5
  );
  // Declared profile interests.
  const purposes = listOf(preferences?.openTo ?? preferences?.open_to);
  if (
    item.category &&
    SERVICE_CATEGORIES.has(item.category) &&
    purposes.includes("hacer servicio")
  )
    score += 1.5;
  if (
    item.category &&
    SPIRITUAL_CATEGORIES.has(item.category) &&
    listOf(preferences?.spiritualPath ?? preferences?.spiritual_path).length
  )
    score += 1;
  // Popularity and closeness in time.
  score += Math.min(item.participantCount ?? 0, 20) / 20;
  const days = (startTime(item, now) - now) / 86_400_000;
  if (days >= 0 && days <= 30) score += 1 - days / 30;
  return score;
}

// One "Para ti" pick among items the user has not joined yet.
export function pickFeaturedItem(
  candidates: EventFeedItem[],
  joined: EventFeedItem[],
  preferences: Record<string, any> | null | undefined,
  now: number
): EventFeedItem | null {
  const joinedIds = new Set(joined.map((item) => item.id));
  return (
    candidates
      .filter((item) => !joinedIds.has(item.id) && isFeaturable(item, now))
      .map((item) => ({
        item,
        score: homeItemScore(item, joined, preferences, now),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          startTime(a.item, now) - startTime(b.item, now) ||
          a.item.id.localeCompare(b.item.id)
      )[0]?.item ?? null
  );
}
