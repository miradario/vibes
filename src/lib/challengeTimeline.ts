import { getChallengeDay } from "./challengeProgress";
type ChallengeTimelineStatus = "upcoming" | "active" | "finished";

export type ChallengeTimeline = {
  status: ChallengeTimelineStatus;
  currentDay: number;
  totalDays: number;
  startsInDays: number;
};

export const getChallengeTimeline = (
  startsAt: string | null | undefined,
  durationDays: number | null | undefined,
): ChallengeTimeline => {
  const totalDays = Math.max(Number(durationDays ?? 0) || 0, 1);

  if (!startsAt) {
    return {
      status: "active",
      currentDay: 1,
      totalDays,
      startsInDays: 0,
    };
  }

  const parsedStart = new Date(startsAt);
  if (Number.isNaN(parsedStart.getTime())) {
    return {
      status: "active",
      currentDay: 1,
      totalDays,
      startsInDays: 0,
    };
  }

  const diffDays = getChallengeDay(startsAt) - 1;

  if (diffDays < 0) {
    return {
      status: "upcoming",
      currentDay: 0,
      totalDays,
      startsInDays: Math.abs(diffDays),
    };
  }

  if (diffDays >= totalDays) {
    return {
      status: "finished",
      currentDay: totalDays,
      totalDays,
      startsInDays: 0,
    };
  }

  return {
    status: "active",
    currentDay: diffDays + 1,
    totalDays,
    startsInDays: 0,
  };
};

export const getChallengeStartsInLabel = (startsInDays: number) =>
  `Comienza en ${startsInDays} día${startsInDays === 1 ? "" : "s"}`;
