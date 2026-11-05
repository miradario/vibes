-- Responder a un mensaje (swipe a la derecha) en chats de eventos y desafíos.
-- Referencia opcional al mensaje citado; si se borra el original, la respuesta queda sin cita.

alter table public.event_messages
  add column if not exists reply_to_message_id uuid
  references public.event_messages(id) on delete set null;

create index if not exists event_messages_reply_to_idx
  on public.event_messages(reply_to_message_id)
  where reply_to_message_id is not null;
