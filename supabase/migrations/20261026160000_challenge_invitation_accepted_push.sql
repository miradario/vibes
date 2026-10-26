-- Push al creador de un desafío privado cuando un invitado acepta y se une.
-- Deploy send-push (con soporte para challenge_invitations) ANTES de aplicar
-- esta migración: send-push viejo ignora el UPDATE (responde "unsupported").
--
-- Solo dispara en la transición a 'accepted'. Como una invitación aceptada es
-- final (respond_challenge_invitation devuelve sin tocar nada si ya está
-- aceptada y no permite volver atrás), cada invitación notifica a lo sumo una
-- vez: reintentos del RPC no duplican. invitee_id <> invited_by ya está
-- garantizado por el check de la tabla, así que nunca se notifica el propio join.
-- send-push vuelve a validar que el desafío sea privado y que invited_by sea su creador.
drop trigger if exists trg_send_push_challenge_invitation_accepted on public.challenge_invitations;
create trigger trg_send_push_challenge_invitation_accepted
  after update of status on public.challenge_invitations
  for each row
  when (new.status = 'accepted' and old.status is distinct from 'accepted')
  execute function private.notify_send_push();
