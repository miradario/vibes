const OBJECTIONABLE_PATTERNS = [
  /\bfuck\b/i,
  /\bshit\b/i,
  /\bbitch\b/i,
  /\basshole\b/i,
  /\bcunt\b/i,
  /\bputa\b/i,
  /\bputo\b/i,
  /\bpelotud[oa]s?\b/i,
  /\bbolud[oa]s?\b/i,
  /\bidiot[ae]s?\b/i,
  /\bimb[eé]cil(es)?\b/i,
  /\bkill yourself\b/i,
  /\bsuicidate\b/i,
  /\bnazi\b/i,
  /\bracist\b/i,
  /\bracista\b/i,
];

export const OBJECTIONABLE_CONTENT_MESSAGE =
  "No podemos publicar contenido ofensivo o abusivo. Editalo para cuidar la comunidad.";

export const hasObjectionableContent = (value?: string | null) => {
  if (!value) return false;
  return OBJECTIONABLE_PATTERNS.some((pattern) => pattern.test(value));
};

export const assertAcceptableContent = (
  values: Array<string | null | undefined>
) => {
  if (values.some(hasObjectionableContent)) {
    throw new Error(OBJECTIONABLE_CONTENT_MESSAGE);
  }
};
