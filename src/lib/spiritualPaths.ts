export const SPIRITUAL_PATH_OPTIONS = [
  "Meditación",
  "Yoga",
  "Astrología",
  "Reiki",
  "El Arte de Vivir",
  "Ashtanga",
  "Kundalini",
  "Hatha Yoga",
  "Tantra",
  "Otro",
] as const;

export type SpiritualPathDetail = {
  role?: string;
  years?: string;
  notes?: string;
};

export type SpiritualPathDetails = Record<string, SpiritualPathDetail>;

type SpiritualPathDetailFieldConfig = {
  key: keyof SpiritualPathDetail;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
  options?: string[];
};

export const SPIRITUAL_PATH_DETAIL_FIELDS: readonly SpiritualPathDetailFieldConfig[] = [
  {
    key: "role",
    label: "Rol",
    placeholder: "Opcional",
    options: ["Instructor", "Alumno"],
  },
  {
    key: "years",
    label: "Años de práctica",
    placeholder: "Ej. 5",
    keyboardType: "number-pad",
  },
  {
    key: "notes",
    label: "Dato relevante",
    placeholder: "Todo lo que quieras sumar",
    multiline: true,
  },
] as const;

type SpiritualPathDetailField = SpiritualPathDetailFieldConfig;

const sanitizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const normalizeSpiritualPathDetail = (
  value: unknown,
): SpiritualPathDetail => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const legacyRole = sanitizeText(source.role ?? source.instructor);

  return SPIRITUAL_PATH_DETAIL_FIELDS.reduce<SpiritualPathDetail>(
    (acc, field) => {
      const nextValue =
        field.key === "role"
          ? legacyRole
          : sanitizeText(source[field.key]);
      if (nextValue) {
        acc[field.key] = nextValue;
      }
      return acc;
    },
    {},
  );
};

export const normalizeSpiritualPathDetails = (
  value: unknown,
): SpiritualPathDetails => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<SpiritualPathDetails>(
    (acc, [path, detail]) => {
      const trimmedPath = sanitizeText(path);
      if (!trimmedPath) {
        return acc;
      }

      acc[trimmedPath] = normalizeSpiritualPathDetail(detail);
      return acc;
    },
    {},
  );
};

export const getSelectedSpiritualPaths = (
  pathsValue: unknown,
  detailsValue?: unknown,
) => {
  const selectedPaths = Array.isArray(pathsValue)
    ? pathsValue
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const detailPaths = Object.keys(normalizeSpiritualPathDetails(detailsValue));

  return Array.from(new Set([...selectedPaths, ...detailPaths]));
};

export const getSpiritualPathDetailEntries = (detail?: SpiritualPathDetail) => {
  const normalized = normalizeSpiritualPathDetail(detail);

  return SPIRITUAL_PATH_DETAIL_FIELDS.reduce<
    Array<SpiritualPathDetailField & { value: string }>
  >((acc, field) => {
    const value = normalized[field.key];
    if (value) {
      acc.push({ ...field, value });
    }
    return acc;
  }, []);
};

export const hasSpiritualPathDetail = (detail?: SpiritualPathDetail) =>
  getSpiritualPathDetailEntries(detail).length > 0;