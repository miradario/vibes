-- ============================================================
-- Delete message policies
-- ============================================================

-- Sender can delete their own messages (for everyone)
create policy "event_messages_delete_own"
on public.event_messages for delete
to authenticated
using (auth.uid() = sender_id);

-- Event/challenge creator (admin) can delete any message
create policy "event_messages_delete_admin"
on public.event_messages for delete
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_messages.event_id
      and e.created_by = auth.uid()
  )
  or exists (
    select 1 from public.challenges c
    where c.id = event_messages.event_id
      and c.created_by = auth.uid()
  )
);

-- ============================================================
-- Admin kick policy
-- ============================================================

-- Event/challenge creator (admin) can kick participants
create policy "event_participants_delete_admin"
on public.event_participants for delete
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_participants.event_id
      and e.created_by = auth.uid()
  )
  or exists (
    select 1 from public.challenges c
    where c.id = event_participants.event_id
      and c.created_by = auth.uid()
  )
);
