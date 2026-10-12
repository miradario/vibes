/** Navigation can merge a new link's ID with an older inline event object. */
export function resolvePublicContentRoute<T extends { id: string }>(routeId: unknown, inlineEvent?: T) {
  const id = typeof routeId === "string" && routeId.trim() ? routeId.trim() : inlineEvent?.id;
  return { id, inlineEvent: inlineEvent?.id === id ? inlineEvent : undefined };
}
