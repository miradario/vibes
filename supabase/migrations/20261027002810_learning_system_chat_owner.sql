-- Class chats are system-owned, matching the current deployed group schema.
alter table public.community_groups alter column created_by drop not null;
