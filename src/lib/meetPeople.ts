/** Existing accounts keep discovery enabled unless they explicitly opt out. */
export const isMeetPeopleEnabled = (preferences?: Record<string, unknown> | null) =>
  preferences?.meetPeopleEnabled !== false && preferences?.meet_people_enabled !== false;
