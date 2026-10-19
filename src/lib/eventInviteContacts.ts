export function eligibleInviteContacts<T extends { isActive: boolean; otherUserId: string; otherUserName: string }>(
  contacts: T[], participantIds: string[], creatorId?: string | null, search = "",
): T[] {
  const excluded = new Set(participantIds.map(String));
  if (creatorId) excluded.add(String(creatorId));
  const query = search.trim().toLocaleLowerCase();
  return contacts.filter(contact => contact.isActive && !excluded.has(String(contact.otherUserId)) && contact.otherUserName.toLocaleLowerCase().includes(query));
}
