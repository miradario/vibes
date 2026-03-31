import type { ImageSourcePropType } from "react-native";
import type { Candidate } from "../api/modules/candidates/candidates.types";

const FALLBACK_PROFILE_IMAGE = require("../../assets/images/logo.png");

type PhotoLike = {
  url?: string | null;
  isPrimary?: boolean | null;
  order?: number | null;
};

type ProfileLike = Record<string, any>;

export type ConnectionProfile = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  images: ImageSourcePropType[];
  location?: string;
  description?: string;
  message?: string;
  vibe?: string;
  intention?: string;
  prompt?: string;
  tags?: string[];
  match?: string;
  isOnline: boolean;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const toImageSource = (url?: string | null): ImageSourcePropType =>
  isNonEmptyString(url) ? { uri: url.trim() } : FALLBACK_PROFILE_IMAGE;

const getPhotoUrls = (photos: unknown): string[] => {
  if (!Array.isArray(photos)) return [];

  return photos
    .map((photo, index) => {
      if (isNonEmptyString(photo)) {
        return {
          url: photo.trim(),
          order: index,
          isPrimary: index === 0,
        };
      }

      if (photo && typeof photo === "object") {
        const candidate = photo as PhotoLike;
        if (isNonEmptyString(candidate.url)) {
          return {
            url: candidate.url.trim(),
            order: typeof candidate.order === "number" ? candidate.order : index,
            isPrimary: Boolean(candidate.isPrimary),
          };
        }
      }

      return null;
    })
    .filter((item): item is { url: string; order: number; isPrimary: boolean } => Boolean(item))
    .sort((left, right) => {
      if (left.isPrimary && !right.isPrimary) return -1;
      if (!left.isPrimary && right.isPrimary) return 1;
      return left.order - right.order;
    })
    .map((photo) => photo.url);
};

const buildTags = (profile: ProfileLike): string[] => {
  const tags: string[] = [];

  if (Array.isArray(profile.orientation)) {
    tags.push(
      ...profile.orientation.filter((item: unknown): item is string => isNonEmptyString(item)),
    );
  }

  if (Array.isArray(profile.path)) {
    tags.push(
      ...profile.path.filter((item: unknown): item is string => isNonEmptyString(item)),
    );
  }

  return tags.slice(0, 6);
};

export const mapCandidateToConnectionProfile = (
  candidate: Candidate | ProfileLike,
): ConnectionProfile => {
  const photos = getPhotoUrls((candidate as ProfileLike).photos);
  const photoSources = photos.map((url) => ({ uri: url }));
  const displayName =
    (isNonEmptyString((candidate as ProfileLike).displayName) &&
      (candidate as ProfileLike).displayName.trim()) ||
    (isNonEmptyString((candidate as ProfileLike).name) &&
      (candidate as ProfileLike).name.trim()) ||
    "Vibes";
  const location =
    (isNonEmptyString((candidate as ProfileLike).location) &&
      (candidate as ProfileLike).location.trim()) ||
    (isNonEmptyString((candidate as ProfileLike).country) &&
      (candidate as ProfileLike).country.trim()) ||
    undefined;

  return {
    id: String((candidate as ProfileLike).id ?? displayName),
    name: displayName,
    image: photoSources[0] ?? FALLBACK_PROFILE_IMAGE,
    images: photoSources.length > 0 ? photoSources : [FALLBACK_PROFILE_IMAGE],
    location,
    description:
      (isNonEmptyString((candidate as ProfileLike).bio) &&
        (candidate as ProfileLike).bio.trim()) ||
      (isNonEmptyString((candidate as ProfileLike).about) &&
        (candidate as ProfileLike).about.trim()) ||
      undefined,
    message:
      (isNonEmptyString((candidate as ProfileLike).lastMessage) &&
        (candidate as ProfileLike).lastMessage.trim()) ||
      undefined,
    vibe:
      (isNonEmptyString((candidate as ProfileLike).vibe) &&
        (candidate as ProfileLike).vibe.trim()) ||
      undefined,
    intention:
      (isNonEmptyString((candidate as ProfileLike).intention) &&
        (candidate as ProfileLike).intention.trim()) ||
      undefined,
    prompt:
      (isNonEmptyString((candidate as ProfileLike).prompt) &&
        (candidate as ProfileLike).prompt.trim()) ||
      undefined,
    tags: buildTags(candidate as ProfileLike),
    match:
      typeof (candidate as ProfileLike).match === "number"
        ? String((candidate as ProfileLike).match)
        : isNonEmptyString((candidate as ProfileLike).match)
          ? (candidate as ProfileLike).match.trim()
          : undefined,
    isOnline: Boolean((candidate as ProfileLike).isActive ?? (candidate as ProfileLike).isOnline),
  };
};

export const mapOwnProfileToConnectionProfile = (
  profile: ProfileLike | null | undefined,
  fallbackName?: string | null,
): ConnectionProfile => {
  if (!profile) {
    return {
      id: "self",
      name: isNonEmptyString(fallbackName) ? fallbackName.trim() : "Vibes",
      image: FALLBACK_PROFILE_IMAGE,
      images: [FALLBACK_PROFILE_IMAGE],
      isOnline: true,
    };
  }

  return {
    ...mapCandidateToConnectionProfile(profile),
    name:
      (isNonEmptyString(profile.displayName) && profile.displayName.trim()) ||
      (isNonEmptyString(profile.name) && profile.name.trim()) ||
      (isNonEmptyString(fallbackName) && fallbackName.trim()) ||
      "Vibes",
    image: toImageSource(getPhotoUrls(profile.photos)[0]),
  };
};
