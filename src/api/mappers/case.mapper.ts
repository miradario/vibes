export type AnyRecord = Record<string, unknown>;

const toCamelKey = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const toSnakeKey = (key: string) =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const mapKeysShallow = (value: AnyRecord, mapper: (key: string) => string) =>
  Object.entries(value).reduce<AnyRecord>((acc, [key, val]) => {
    acc[mapper(key)] = val;
    return acc;
  }, {});

export const toCamel = (value: AnyRecord) => mapKeysShallow(value, toCamelKey);

export const toSnake = (value: AnyRecord) => mapKeysShallow(value, toSnakeKey);

export const mapSupabaseSelect = <T>(data: T | T[] | null) => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.map((item) =>
      item && typeof item === "object" ? toCamel(item as AnyRecord) : item
    );
  }
  if (typeof data === "object") {
    return toCamel(data as AnyRecord);
  }
  return data;
};
