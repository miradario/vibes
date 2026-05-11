import type { AVPlaybackSource } from "expo-av";
import type { ImageSourcePropType } from "react-native";

export type ChallengeMediaPresetId =
  | "VibesHome"
  | "welcome"
  | "challenge"
  | "events"
  | "name"
  | "signup"
  | "login";

export type ChallengeMediaPreset = {
  id: ChallengeMediaPresetId;
  label: string;
  image: ImageSourcePropType;
  video: AVPlaybackSource;
  progressVideos?: [
    AVPlaybackSource,
    AVPlaybackSource,
    AVPlaybackSource,
    AVPlaybackSource,
    AVPlaybackSource,
  ];
};

const PRESET_PREFIX = "preset:";
const PRESET_DESCRIPTION_MARKER_START = "[[preset:";
const PRESET_DESCRIPTION_MARKER_END = "]]";
const STARTS_AT_DESCRIPTION_MARKER_START = "[[starts_at:";
const STARTS_AT_DESCRIPTION_MARKER_END = "]]";

export const challengeMediaPresets: ChallengeMediaPreset[] = [
  {
    id: "VibesHome",
    label: "Vibes Home",
    image: require("../../assets/images/challenges/vibesLogo.png"),
    video: require("../../assets/videos/challenges/VibesHome/VibesHome.mp4"),
    progressVideos: [
      require("../../assets/videos/challenges/VibesHome/VibesHome_part_01.mp4"),
      require("../../assets/videos/challenges/VibesHome/VibesHome_part_02.mp4"),
      require("../../assets/videos/challenges/VibesHome/VibesHome_part_03.mp4"),
      require("../../assets/videos/challenges/VibesHome/VibesHome_part_04.mp4"),
      require("../../assets/videos/challenges/VibesHome/VibesHome_part_05.mp4"),
    ],
  },
  {
    id: "welcome",
    label: "Bienvenida",
    image: require("../../assets/images/challenges/vibesLogo.png"),
    video: require("../../assets/videos/bienvenidx.mp4"),
  },
  {
    id: "challenge",
    label: "Desafío",
    image: require("../../assets/images/challenges/challengetree.png"),
    video: require("../../assets/videos/challenge.mp4"),
  },
  {
    id: "events",
    label: "Evento",
    image: require("../../assets/images/challenges/events.png"),
    video: require("../../assets/videos/challenges/events/events.mp4"),
    progressVideos: [
      require("../../assets/videos/challenges/events/events_part_01.mp4"),
      require("../../assets/videos/challenges/events/events_part_02.mp4"),
      require("../../assets/videos/challenges/events/events_part_03.mp4"),
      require("../../assets/videos/challenges/events/events_part_04.mp4"),
      require("../../assets/videos/challenges/events/events_part_05.mp4"),
    ],
  },
  {
    id: "name",
    label: "Nombre",
    image: require("../../assets/images/challenges/login.png"),
    video: require("../../assets/videos/challenges/name/name.mp4"),
    progressVideos: [
      require("../../assets/videos/challenges/name/name_part_01.mp4"),
      require("../../assets/videos/challenges/name/name_part_02.mp4"),
      require("../../assets/videos/challenges/name/name_part_03.mp4"),
      require("../../assets/videos/challenges/name/name_part_04.mp4"),
      require("../../assets/videos/challenges/name/name_part_05.mp4"),
    ],
  },
  {
    id: "signup",
    label: "Signup",
    image: require("../../assets/images/challenges/signup.png"),
    video: require("../../assets/videos/signup.mp4"),
  },
  {
    id: "login",
    label: "Login",
    image: require("../../assets/images/challenges/login.png"),
    video: require("../../assets/videos/challenges/login/login.mp4"),
    progressVideos: [
      require("../../assets/videos/challenges/login/login_part_01.mp4"),
      require("../../assets/videos/challenges/login/login_part_02.mp4"),
      require("../../assets/videos/challenges/login/login_part_03.mp4"),
      require("../../assets/videos/challenges/login/login_part_04.mp4"),
      require("../../assets/videos/challenges/login/login_part_05.mp4"),
    ],
  },
];

const CHALLENGE_PRESET_PATTERN =
  "VibesHome|welcome|challenge|events|name|signup|login";

export const serializeChallengeMediaPreset = (
  presetId: ChallengeMediaPresetId,
) => `${PRESET_PREFIX}${presetId}`;

export const parseChallengeMediaPreset = (
  value?: string | null,
): ChallengeMediaPresetId | null => {
  if (!value || !value.startsWith(PRESET_PREFIX)) return null;

  const presetId = value.slice(PRESET_PREFIX.length) as ChallengeMediaPresetId;
  return challengeMediaPresets.some((preset) => preset.id === presetId)
    ? presetId
    : null;
};

export const getChallengeMediaPreset = (
  presetId?: ChallengeMediaPresetId | null,
) => challengeMediaPresets.find((preset) => preset.id === presetId) ?? null;

export const encodeChallengeDescriptionWithPreset = (
  description: string | null | undefined,
  presetId?: ChallengeMediaPresetId | null,
  startsAt?: string | null,
) => {
  const cleanDescription = (description ?? "").trim();
  const markers: string[] = [];

  if (presetId) {
    markers.push(
      `${PRESET_DESCRIPTION_MARKER_START}${presetId}${PRESET_DESCRIPTION_MARKER_END}`,
    );
  }
  if (startsAt) {
    markers.push(
      `${STARTS_AT_DESCRIPTION_MARKER_START}${startsAt}${STARTS_AT_DESCRIPTION_MARKER_END}`,
    );
  }
  if (markers.length === 0) return cleanDescription || null;

  return cleanDescription
    ? `${cleanDescription}\n${markers.join("\n")}`
    : markers.join("\n");
};

export const extractChallengePresetFromDescription = (
  description?: string | null,
): ChallengeMediaPresetId | null => {
  if (!description) return null;

  const match = description.match(
    new RegExp(`\\[\\[preset:(${CHALLENGE_PRESET_PATTERN})\\]\\]`),
  );
  return match?.[1] ? (match[1] as ChallengeMediaPresetId) : null;
};

export const stripChallengePresetFromDescription = (
  description?: string | null,
) => {
  if (!description) return null;

  const cleaned = description
    .replace(
      new RegExp(`\\n?\\[\\[preset:(${CHALLENGE_PRESET_PATTERN})\\]\\]`, "g"),
      "",
    )
    .replace(/\n?\[\[starts_at:[^\]]+\]\]/g, "")
    .trim();

  return cleaned || null;
};

export const getChallengeProgressVideo = (
  presetId: ChallengeMediaPresetId | null | undefined,
  percent: number,
) => {
  const preset = getChallengeMediaPreset(presetId);
  if (!preset?.progressVideos) return preset?.video ?? null;

  const normalizedPercent = Math.max(0, Math.min(100, percent));
  const stage = Math.min(4, Math.floor(normalizedPercent / 20));
  return preset.progressVideos[stage] ?? preset.video;
};

export const extractChallengeStartsAtFromDescription = (
  description?: string | null,
) => {
  if (!description) return null;

  const match = description.match(/\[\[starts_at:([^\]]+)\]\]/);
  return match?.[1]?.trim() || null;
};
