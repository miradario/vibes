/** Separate only explicitly written logistics; never invent an admission time. */
export function learningDescriptionDetails(description: string) {
  const schedule = description.match(/^(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)[^\n]*\d{1,2}[:.]\d{2}[^\n]*$/im)?.[0];
  const admission = description.match(/Ingreso desde\s+(?:las\s+)?\d{1,2}[:.]\d{2}/i)?.[0];
  let body = description;
  if (schedule) body = body.replace(schedule, "");
  if (admission) body = body.replace(new RegExp(admission.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.?\\s*", "i"), "");
  return { body: body.replace(/\n{3,}/g, "\n\n").trim(), schedule, admission };
}
