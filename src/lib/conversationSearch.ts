const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

/** Search conversation names and their visible message preview, ignoring accents. */
export const matchesConversationSearch = (query: string, ...values: (string | null | undefined)[]) => {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const text = normalize(values.filter(Boolean).join(" "));
  return terms.every(term => text.includes(term));
};
