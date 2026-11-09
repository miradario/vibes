import { readCommunities, matchesCommunities } from "./communities";
/** Backwards-compatible storage names; the product calls these communities. */
export const readDiscoverSpiritualPaths = readCommunities;
export const matchesDiscoverSpiritualPaths = (profile: Record<string, any>, selected: string[]) => matchesCommunities(profile, selected);
