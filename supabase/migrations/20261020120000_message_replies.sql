-- Responder a un mensaje (swipe a la derecha en chats).
-- Referencia opcional al mensaje citado; si se borra el original, la respuesta queda sin cita.

alter table public.messages
  add column if not exists reply_to_message_id uuid
  references public.messages(id) on delete set null;

create index if not exists messages_reply_to_idx
  on public.messages(reply_to_message_id)
  where reply_to_message_id is not null;

alter table public.community_group_messages
  add column if not exists reply_to_message_id uuid
  references public.community_group_messages(id) on delete set null;

create index if not exists community_group_messages_reply_to_idx
  on public.community_group_messages(reply_to_message_id)
  where reply_to_message_id is not null;
