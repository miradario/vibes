const terms = (profile: Record<string, any>): Set<string> => {
  const answers = profile.profileAnswers ?? profile.profile_answers ?? {};
  const values = [
    profile.spiritualPath ?? profile.spiritual_path,
    profile.otherTags ?? profile.other_tags,
    answers.hobbies,
    answers.favoritePlans,
    answers.lookingFor,
    profile.lookingFor ?? profile.looking_for,
  ];
  return new Set(
    values
      .flat()
      .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
      .map((v) =>
        v
          .trim()
          .toLocaleLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      )
  );
};
export const affinityScore = (
  own: Record<string, any>,
  other: Record<string, any>
) => {
  const mine = terms(own);
  return [...terms(other)].filter((term) => mine.has(term)).length;
};
export const compareDiscoveryProfiles = (
  own: Record<string, any>,
  a: Record<string, any>,
  b: Record<string, any>
) => {
  const distance = (p: Record<string, any>) =>
    typeof p.distanceKm === "number" && Number.isFinite(p.distanceKm)
      ? p.distanceKm
      : Infinity;
  const left = distance(a),
    right = distance(b);
  if (left !== right) return left < right ? -1 : 1;
  return (
    affinityScore(own, b) - affinityScore(own, a) ||
    String(a.id).localeCompare(String(b.id))
  );
};
export const isSwipeHidden = (
  swipe: { direction: string; created_at: string },
  now = Date.now()
) =>
  swipe.direction === "like" ||
  now - new Date(swipe.created_at).getTime() < 30 * 86400000;
