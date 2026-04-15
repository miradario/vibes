import type { ImageSourcePropType } from "react-native";
import type { Candidate } from "../api/modules/candidates/candidates.types";
import {
  getSelectedSpiritualPaths,
  normalizeSpiritualPathDetails,
  type SpiritualPathDetails,
} from "./spiritualPaths";

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
  age?: string;
  image: ImageSourcePropType;
  images: ImageSourcePropType[];
  location?: string;
  description?: string;
  message?: string;
  vibe?: string;
  intention?: string;
  prompt?: string;
  tags?: string[];
  preferences?: string[];
  spiritualPath?: string[];
  spiritualPathDetails?: SpiritualPathDetails;
  vegetarian?: string;
  smoking?: string;
  pets?: string;
  match?: string;
  isOnline: boolean;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const toImageSource = (url?: string | null): ImageSourcePropType =>
  isNonEmptyString(url) ? { uri: url.trim() } : FALLBACK_PROFILE_IMAGE;

const toAge = (value: unknown): string | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.floor(value));
  }

  if (isNonEmptyString(value)) {
    const trimmedValue = value.trim();
    const numericValue = Number(trimmedValue);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return String(Math.floor(numericValue));
    }

    const birthDate = new Date(trimmedValue);
    if (!Number.isNaN(birthDate.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - birthDate.getFullYear();
      const monthDiff = now.getMonth() - birthDate.getMonth();
      const hadBirthday =
        monthDiff > 0 ||
        (monthDiff === 0 && now.getDate() >= birthDate.getDate());

      if (!hadBirthday) age -= 1;

      return age > 0 ? String(age) : undefined;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const now = new Date();
    let age = now.getFullYear() - value.getFullYear();
    const monthDiff = now.getMonth() - value.getMonth();
    const hadBirthday =
      monthDiff > 0 || (monthDiff === 0 && now.getDate() >= value.getDate());

    if (!hadBirthday) age -= 1;

    return age > 0 ? String(age) : undefined;
  }

  return undefined;
};

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

const getTaggedValue = (tags: string[], prefixes: string[]) => {
  const lowerPrefixes = prefixes.map((prefix) => prefix.toLowerCase());
  const match = tags.find((tag) =>
    lowerPrefixes.some((prefix) => tag.toLowerCase().startsWith(prefix)),
  );

  if (!match) return undefined;

  const parts = match.split(":");
  if (parts.length > 1 && isNonEmptyString(parts.slice(1).join(":"))) {
    return parts.slice(1).join(":").trim();
  }

  return match.trim();
};

const buildPreferences = (profile: ProfileLike): string[] => {
  const preferences: string[] = [];
  const tags = buildTags(profile);
  const pushPreference = (label: string, value: unknown) => {
    if (Array.isArray(value)) {
      const cleaned = value.filter(isNonEmptyString).map((item) => item.trim());
      if (cleaned.length > 0) {
        preferences.push(`${label}: ${cleaned.join(", ")}`);
      }
      return;
    }

    if (isNonEmptyString(value)) {
      preferences.push(`${label}: ${value.trim()}`);
    }
  };

  if (tags.length > 0) {
    preferences.push(...tags);
  }

  if (isNonEmptyString(profile.intention)) {
    preferences.push(`Busca: ${profile.intention.trim()}`);
  }

  if (typeof profile.isTeacher === "boolean") {
    preferences.push(profile.isTeacher ? "Es guía/teacher" : "No es guía");
  }

  pushPreference("Camino espiritual", profile.spiritualPath ?? profile.spiritual_path);
  pushPreference("Vegetarianismo", profile.vegetarian);
  pushPreference("Fuma", profile.smoking);
  pushPreference("Sobre mí", profile.aboutMe ?? profile.about_me);
  pushPreference("Otros", profile.otherTags ?? profile.other_tags);
  pushPreference("Open to", profile.openTo ?? profile.open_to);
  pushPreference("Idiomas", profile.languages);
  pushPreference("Zodiaco", profile.zodiac);
  pushPreference("Educación", profile.education);
  pushPreference("Plan familiar", profile.familyPlan ?? profile.family_plan);
  pushPreference("Vacuna", profile.vaccine);
  pushPreference("Personalidad", profile.personality);
  pushPreference(
    "Comunicación",
    profile.communicationStyle ?? profile.communication_style,
  );
  pushPreference("Estilo de amor", profile.loveStyle ?? profile.love_style);
  pushPreference("Mascotas", profile.pets);

  return Array.from(new Set(preferences)).slice(0, 16);
};

export const mapCandidateToConnectionProfile = (
  candidate: Candidate | ProfileLike,
): ConnectionProfile => {
  const photos = getPhotoUrls((candidate as ProfileLike).photos);
  const photoSources = photos.map((url) => ({ uri: url }));
  const tags = buildTags(candidate as ProfileLike);
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
  const age =
    toAge((candidate as ProfileLike).age) ??
    toAge((candidate as ProfileLike).birthDate) ??
    toAge((candidate as ProfileLike).birth_date);
  const vegetarian =
    (isNonEmptyString((candidate as ProfileLike).vegetarian) &&
      (candidate as ProfileLike).vegetarian.trim()) ||
    getTaggedValue(tags, ["vegetarian", "vegetariano"]);
  const smoking =
    (isNonEmptyString((candidate as ProfileLike).smoking) &&
      (candidate as ProfileLike).smoking.trim()) ||
    getTaggedValue(tags, ["smoke", "fuma", "fumar"]);
  const pets =
    (isNonEmptyString((candidate as ProfileLike).pets) &&
      (candidate as ProfileLike).pets.trim()) ||
    getTaggedValue(tags, ["pets", "mascotas"]);
  const spiritualPath = getSelectedSpiritualPaths(
    (candidate as ProfileLike).spiritualPath ??
      (candidate as ProfileLike).spiritual_path,
    (candidate as ProfileLike).spiritualPathDetails ??
      (candidate as ProfileLike).spiritual_path_details,
  );
  const spiritualPathDetails = normalizeSpiritualPathDetails(
    (candidate as ProfileLike).spiritualPathDetails ??
      (candidate as ProfileLike).spiritual_path_details,
  );

  return {
    id: String((candidate as ProfileLike).id ?? displayName),
    name: displayName,
    age,
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
    tags,
    preferences: buildPreferences({
      ...(candidate as ProfileLike),
      spiritualPath,
      spiritualPathDetails,
    }),
    spiritualPath,
    spiritualPathDetails,
    vegetarian,
    smoking,
    pets,
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
