export function authorizedWebhook(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

export function isConnectionRequest(record: Record<string, unknown>, old?: Record<string, unknown> | null) {
  return record.direction === "like" && old?.direction !== "like" &&
    typeof record.swiper_id === "string" && typeof record.target_id === "string" &&
    !!record.swiper_id && !!record.target_id && record.swiper_id !== record.target_id;
}
