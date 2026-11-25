-- Applied to prod 2026-11-25 with Agus's OK (reviewed in SAFETY_REVIEW_2026-11-25.md).
-- Session pricing and payment (decisions of 2026-11-17):
--   * The facilitator sets a price and one or more payment methods per service (mercadopago / cash / transfer).
--   * Mercado Pago: the slot is held 15 minutes (booking `pending`, order.hold_expires_at). When the webhook
--     credits the payment (portal_appointment_server('confirm_payment') -> order `paid`), the booking is
--     confirmed automatically. If it isn't credited in time, the hold is released (cron + lazy release).
--   * Cash / transfer: booking confirmed directly; order stays `pending` until the facilitator marks it paid.
--   * The money goes to the facilitator's own account: checkout keeps using connectedMercadoAccount(organizer)
--     (private.studio_mercadopago_connections, OAuth "Conectar Mercado Pago" in the portal).
--   * Cancelling after paying: no automatic refund (unchanged; orders stay `paid`).
--   * Out-of-availability requests: pending for the facilitator as before. The student may pick a payment
--     method with the request; when the facilitator approves it, an order with the service price is created
--     (Mercado Pago -> pay after confirmation as usual; cash / transfer -> paid to the facilitator).
--   * No grace: the hold is released exactly at hold_expires_at, with a push to the student. A payment
--     credited after that never reinstates the booking: cancelled + paid, settled with the facilitator.
-- Requires 20261117120000_student_session_confirmation.sql (replaces its portal_student_sessions with a superset).

-- 1) Price and payment methods per service (organizer + availability title + location).
create table if not exists private.appointment_service_pricing (
  organizer_id uuid not null references public.learning_profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  location text not null default '' check (length(location) <= 500),
  price numeric(12,2) not null check (price >= 0 and price <= 9999999999.99),
  currency text not null default 'ARS' check (currency = 'ARS'),
  payment_methods text[] not null default '{}'::text[]
    check (payment_methods <@ array['mercadopago','cash','transfer']::text[]),
  payment_instructions text not null default '' check (length(payment_instructions) <= 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint appointment_service_pricing_pkey primary key (organizer_id, title, location),
  check (price = 0 or cardinality(payment_methods) > 0)
);
alter table private.appointment_service_pricing enable row level security;
revoke all on table private.appointment_service_pricing from public, anon, authenticated;

-- 2) Order: chosen method and the Mercado Pago hold. payment_method null = legacy facilitator order (Mercado Pago).
alter table private.appointment_orders
  add column if not exists payment_method text check (payment_method in ('mercadopago','cash','transfer')),
  add column if not exists hold_expires_at timestamptz,
  add column if not exists hold_released_at timestamptz,
  -- Where the cached checkout link returns to ('app' or null = web portal); a link is reused only for the same target.
  add column if not exists checkout_return text check (checkout_return in ('app'));
create index if not exists appointment_orders_active_holds on private.appointment_orders (hold_expires_at)
  where status = 'pending' and hold_expires_at is not null;

create or replace function private.mercadopago_ready(p_organizer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.studio_mercadopago_connections where organizer_id = p_organizer and active);
$$;
revoke all on function private.mercadopago_ready(uuid) from public, anon, authenticated;

-- 3) Release holds whose payment wasn't credited, exactly at hold_expires_at (no grace).
--    The booking update carries vibes.appointment_push_event = 'released' so the push trigger
--    (20261117120100_appointment_push.sql) sends "se liberó el horario" instead of "cancelada".
create table if not exists private.appointment_payment_requests (
  booking_id uuid primary key references private.appointment_bookings(id) on delete cascade,
  payment_method text not null check (payment_method in ('mercadopago','cash','transfer')),
  created_at timestamptz not null default now()
);
alter table private.appointment_payment_requests enable row level security;
revoke all on table private.appointment_payment_requests from public, anon, authenticated;

create or replace function private.release_session_hold(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  select o.id order_id, o.status order_status, b.id booking_id, b.slot_id into item
    from private.appointment_orders o join private.appointment_bookings b on b.id = o.booking_id
   where o.id = p_order and o.hold_expires_at is not null and o.hold_expires_at <= now() and b.status = 'pending'
   for update of o, b;
  if not found then return; end if;
  perform set_config('vibes.appointment_push_event', 'released', true);
  update private.appointment_bookings set status = 'cancelled', cancelled_at = now() where id = item.booking_id and status = 'pending';
  perform set_config('vibes.appointment_push_event', '', true);
  update private.appointment_slots set active = false where id = item.slot_id;
  -- A paid order stays paid (late payment, settled with the facilitator).
  update private.appointment_orders set hold_released_at = now(), checkout_url = null,
    status = case when status = 'pending' then 'cancelled' else status end where id = item.order_id;
end $$;
revoke all on function private.release_session_hold(uuid) from public, anon, authenticated;

create or replace function private.release_expired_session_holds()
returns integer language plpgsql security definer set search_path = '' as $$
declare item record; total integer := 0;
begin
  for item in
    select o.id from private.appointment_orders o join private.appointment_bookings b on b.id = o.booking_id
     where o.status = 'pending' and o.hold_expires_at <= now() and b.status = 'pending'
     for update of o, b skip locked
  loop
    perform private.release_session_hold(item.id);
    total := total + 1;
  end loop;
  return total;
end $$;
revoke all on function private.release_expired_session_holds() from public, anon, authenticated;

-- 4) A payment hold can only be confirmed by its payment (blocks portal_appointments('confirm') on it).
create or replace function private.appointment_booking_guard_payment_hold()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' and new.status = 'confirmed' and exists(
       select 1 from private.appointment_orders o where o.booking_id = old.id and o.status = 'pending' and o.hold_expires_at is not null) then
    raise exception 'AWAITING_PAYMENT';
  end if;
  return new;
end $$;
revoke all on function private.appointment_booking_guard_payment_hold() from public, anon, authenticated;
drop trigger if exists trg_appointment_booking_guard_payment_hold on private.appointment_bookings;
create trigger trg_appointment_booking_guard_payment_hold
  before update of status on private.appointment_bookings
  for each row execute function private.appointment_booking_guard_payment_hold();

-- 5) Payment credited -> confirm the held booking, only while the hold is still valid.
--    Credited at or after hold_expires_at: no reinstatement. The hold is released (if the cron didn't yet)
--    and the order stays paid: "Cancelada · pago a resolver" with the facilitator.
create or replace function private.appointment_order_paid()
returns trigger language plpgsql security definer set search_path = '' as $$
declare booking private.appointment_bookings; slot private.appointment_slots;
begin
  if new.status <> 'paid' or old.status = 'paid' or new.hold_expires_at is null then return new; end if;
  select * into booking from private.appointment_bookings where id = new.booking_id for update;
  if booking.status <> 'pending' then return new; end if;
  if new.hold_expires_at <= now() then
    perform private.release_session_hold(new.id);
    return new;
  end if;
  select * into slot from private.appointment_slots where id = booking.slot_id;
  update private.appointment_bookings set status = 'confirmed' where id = booking.id and status = 'pending';
  perform private.studio_queue(slot.organizer_id, booking.user_id, 'booking_confirmed', 'appointment:confirmed:' || booking.id::text,
    jsonb_build_object('title', slot.title, 'starts_at', slot.starts_at, 'appointment_id', booking.id));
  return new;
end $$;
revoke all on function private.appointment_order_paid() from public, anon, authenticated;
drop trigger if exists trg_appointment_order_paid on private.appointment_orders;
create trigger trg_appointment_order_paid
  after update of status on private.appointment_orders
  for each row execute function private.appointment_order_paid();

-- 5b) Approving an out-of-availability request (or any student-created pending booking without order)
--     creates the order with the service price and the method the student picked with the request
--     (default: Mercado Pago if available, else the first method). Mercado Pago orders are paid after
--     confirmation through the usual checkout; cash / transfer are paid to the facilitator.
create or replace function private.appointment_request_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare slot private.appointment_slots; pricing private.appointment_service_pricing; method text; methods text[];
begin
  if not (old.status = 'pending' and new.status = 'confirmed') or new.user_id is null or new.created_by is distinct from new.user_id then return new; end if;
  if exists(select 1 from private.appointment_orders where booking_id = new.id) then return new; end if;
  select * into slot from private.appointment_slots where id = new.slot_id;
  select x.* into pricing from private.appointment_service_pricing x join private.appointment_availability a
      on a.organizer_id = x.organizer_id and a.title = x.title and a.location = x.location
   where a.id = slot.availability_id;
  if pricing.organizer_id is null then return new; end if;
  if pricing.price = 0 then
    insert into private.appointment_orders(id, booking_id, organizer_id, amount, currency, status)
      values (gen_random_uuid(), new.id, slot.organizer_id, 0, pricing.currency, 'free');
    return new;
  end if;
  methods := array(select m from unnest(pricing.payment_methods) m where m <> 'mercadopago' or private.mercadopago_ready(slot.organizer_id));
  if cardinality(methods) = 0 then return new; end if;  -- nothing enabled: coordinated with the facilitator
  select r.payment_method into method from private.appointment_payment_requests r where r.booking_id = new.id;
  if method is null or not (method = any(methods)) then
    method := case when 'mercadopago' = any(methods) then 'mercadopago' else methods[1] end;
  end if;
  insert into private.appointment_orders(id, booking_id, organizer_id, amount, currency, status, payment_method)
    values (gen_random_uuid(), new.id, slot.organizer_id, pricing.price, pricing.currency, 'pending', method);
  return new;
end $$;
revoke all on function private.appointment_request_order() from public, anon, authenticated;
drop trigger if exists trg_appointment_request_order on private.appointment_bookings;
create trigger trg_appointment_request_order
  after update of status on private.appointment_bookings
  for each row execute function private.appointment_request_order();

-- 6) Facilitator (portal): pricing per service and marking offline payments.
--    get:       p_organizer -> {pricing:[...], services:[{title,location}], mercadopago_connected}
--    set:       p_data {title, location, price, payment_methods[], payment_instructions}
--    delete:    p_data {title, location}
--    mark_paid / mark_unpaid: p_id = order id (cash / transfer orders only)
create or replace function public.portal_session_payments(p_action text, p_organizer uuid, p_id uuid default null, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare actor uuid := private.learning_actor(); methods text[]; price numeric; title text := trim(p_data->>'title');
  location text := coalesce(p_data->>'location', ''); ord private.appointment_orders;
begin
  if p_organizer is null or not private.learning_can_manage(p_organizer) then raise exception 'FORBIDDEN'; end if;
  if p_action = 'set' then
    price := (p_data->>'price')::numeric;
    select coalesce(array_agg(distinct value), '{}') into methods from jsonb_array_elements_text(coalesce(p_data->'payment_methods', '[]'::jsonb));
    if title is null or length(title) not between 1 and 120 or length(location) > 500 then raise exception 'INVALID_CONTENT'; end if;
    if price is null or price < 0 or price > 9999999999.99 or price <> round(price, 2) then raise exception 'INVALID_PAYMENT'; end if;
    if not methods <@ array['mercadopago','cash','transfer']::text[] or (price > 0 and cardinality(methods) = 0) then raise exception 'INVALID_PAYMENT_METHOD'; end if;
    if 'mercadopago' = any(methods) and not private.mercadopago_ready(p_organizer) then raise exception 'MERCADOPAGO_NOT_CONNECTED'; end if;
    insert into private.appointment_service_pricing as x (organizer_id, title, location, price, payment_methods, payment_instructions, updated_at, updated_by)
      values (p_organizer, title, location, price, methods, left(coalesce(p_data->>'payment_instructions', ''), 500), now(), actor)
      on conflict on constraint appointment_service_pricing_pkey do update set price = excluded.price, payment_methods = excluded.payment_methods,
        payment_instructions = excluded.payment_instructions, updated_at = now(), updated_by = actor;
  elsif p_action = 'delete' then
    delete from private.appointment_service_pricing x where x.organizer_id = p_organizer and x.title = title and x.location = location;
  elsif p_action in ('mark_paid', 'mark_unpaid') then
    select * into ord from private.appointment_orders where id = p_id and organizer_id = p_organizer for update;
    if not found then raise exception 'FORBIDDEN'; end if;
    if ord.payment_method not in ('cash', 'transfer') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
    if p_action = 'mark_paid' and ord.status = 'pending' then
      update private.appointment_orders set status = 'paid', paid_at = now() where id = ord.id;
    elsif p_action = 'mark_unpaid' and ord.status = 'paid' then
      update private.appointment_orders set status = 'pending', paid_at = null where id = ord.id;
    end if;
  elsif p_action <> 'get' then raise exception 'INVALID_ACTION';
  end if;
  return jsonb_build_object(
    'mercadopago_connected', private.mercadopago_ready(p_organizer),
    'pricing', coalesce((select jsonb_agg(jsonb_build_object('title', x.title, 'location', x.location, 'price', x.price, 'currency', x.currency,
        'payment_methods', to_jsonb(x.payment_methods), 'payment_instructions', x.payment_instructions, 'updated_at', x.updated_at) order by x.title, x.location)
      from private.appointment_service_pricing x where x.organizer_id = p_organizer), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(jsonb_build_object('title', y.title, 'location', y.location) order by y.title, y.location)
      from (select distinct a.title, a.location from private.appointment_availability a where a.organizer_id = p_organizer and a.active) y), '[]'::jsonb));
end $$;
revoke all on function public.portal_session_payments(text, uuid, uuid, jsonb) from public, anon;
grant execute on function public.portal_session_payments(text, uuid, uuid, jsonb) to authenticated;

-- 7) Student RPC (app). Superset of the one in 20261117120000: list / accept / decline / contact + pricing / book / set_payment_method.
--    pricing: p_id = organizer -> {services:[{title,location,price,currency,payment_methods,payment_instructions}], hold_minutes}
--             (mercadopago only listed when the facilitator has an active connection).
--    book:    p_id = availability id, p_data {starts_at, duration, payment_method}
--             -> list result + {booking_id, order_id, hold_expires_at}. Outside availability: pending request,
--             the method is kept in appointment_payment_requests until approval.
--    set_payment_method: p_id = booking id, p_data {payment_method} (student-created, pending order without hold).
create or replace function public.portal_student_sessions(p_action text default 'list', p_id uuid default null, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.learning_actor(); booking private.appointment_bookings; slot private.appointment_slots;
  avail private.appointment_availability; pricing private.appointment_service_pricing; method text;
  begins timestamptz; finishes timestamptz; minutes integer; new_slot uuid; new_booking uuid; new_order uuid; hold_until timestamptz;
begin
  if not exists(select 1 from public.profiles where id = actor and is_active and deleted_at is null) then raise exception 'AUTH_REQUIRED'; end if;
  perform private.appointment_claim_account();
  perform private.release_expired_session_holds();

  if p_action in ('accept', 'decline') then
    select * into booking from private.appointment_bookings where id = p_id and user_id = actor;
    if not found then raise exception 'FORBIDDEN'; end if;
    if p_action = 'decline' then
      perform public.portal_scheduler('cancel', null, p_id, '{}'::jsonb);
    else
      select * into slot from private.appointment_slots where id = booking.slot_id;
      perform 1 from public.learning_profiles where id = slot.organizer_id for update;
      perform 1 from public.profiles where id = actor for update;
      select * into booking from private.appointment_bookings where id = p_id for update;
      select * into slot from private.appointment_slots where id = booking.slot_id for update;
      if booking.status <> 'pending' or booking.created_by = booking.user_id then raise exception 'NOT_PENDING'; end if;
      if not slot.active or slot.starts_at <= now() then raise exception 'BOOKING_CLOSED'; end if;
      if exists(select 1 from private.appointment_bookings b join private.appointment_slots s on s.id = b.slot_id
                where b.id <> booking.id and b.user_id = actor and b.status in ('pending','confirmed')
                  and s.starts_at < slot.ends_at and s.ends_at > slot.starts_at) then raise exception 'APPOINTMENT_OVERLAP'; end if;
      update private.appointment_bookings set status = 'confirmed' where id = booking.id and status = 'pending';
      perform private.studio_queue(slot.organizer_id, actor, 'booking_confirmed', 'appointment:confirmed:' || booking.id::text,
        jsonb_build_object('title', slot.title, 'starts_at', slot.starts_at, 'appointment_id', booking.id));
    end if;
    p_action := 'list';
  end if;

  if p_action = 'contact' then
    if p_id is null or not exists(select 1 from public.learning_profiles where id = p_id and published and approved) then raise exception 'FORBIDDEN'; end if;
    return jsonb_build_object('whatsapp_phone', (select nullif(trim(whatsapp_phone), '') from private.studio_settings where organizer_id = p_id));
  end if;

  if p_action = 'pricing' then
    if p_id is null or not exists(select 1 from public.learning_profiles where id = p_id and published and approved) then raise exception 'FORBIDDEN'; end if;
    return jsonb_build_object('hold_minutes', 15, 'services', coalesce((select jsonb_agg(jsonb_build_object(
        'title', x.title, 'location', x.location, 'price', x.price, 'currency', x.currency,
        'payment_methods', to_jsonb(array(select m from unnest(x.payment_methods) m where m <> 'mercadopago' or private.mercadopago_ready(p_id))),
        'payment_instructions', x.payment_instructions) order by x.title, x.location)
      from private.appointment_service_pricing x where x.organizer_id = p_id), '[]'::jsonb));
  end if;

  if p_action = 'book' then
    select * into avail from private.appointment_availability where id = p_id;
    if not found then raise exception 'FORBIDDEN'; end if;
    begins := (p_data->>'starts_at')::timestamptz; minutes := (p_data->>'duration')::integer;
    if minutes is null or minutes not between 5 and 480 or begins is null then raise exception 'INVALID_APPOINTMENT_TIME'; end if;
    finishes := begins + make_interval(mins => minutes);
    select * into pricing from private.appointment_service_pricing x
      where x.organizer_id = avail.organizer_id and x.title = avail.title and x.location = avail.location;
    method := nullif(p_data->>'payment_method', '');
    if pricing.organizer_id is null or not (begins >= avail.starts_at and finishes <= avail.ends_at) then
      -- No price configured, or an out-of-availability request: pending for the facilitator as before.
      -- The chosen method (optional) is kept until approval creates the order (trigger 5b).
      perform public.portal_scheduler('reserve', avail.organizer_id, avail.id, jsonb_build_object('starts_at', begins, 'duration', minutes));
      if pricing.organizer_id is not null and method in ('mercadopago','cash','transfer') and method = any(pricing.payment_methods) then
        select b.id into new_booking from private.appointment_bookings b join private.appointment_slots s on s.id = b.slot_id
          where s.availability_id = avail.id and s.starts_at = begins and s.ends_at = finishes and b.user_id = actor and b.status in ('pending','confirmed');
        insert into private.appointment_payment_requests(booking_id, payment_method) values (new_booking, method)
          on conflict (booking_id) do update set payment_method = excluded.payment_method;
      end if;
    else
      if pricing.price = 0 then method := null;
      elsif method is null or not (method = any(pricing.payment_methods))
         or (method = 'mercadopago' and not private.mercadopago_ready(avail.organizer_id)) then raise exception 'PAYMENT_METHOD_UNAVAILABLE';
      end if;
      if method = 'mercadopago' then
        -- Same checks as scheduler_ranges('reserve') + portal_appointments('book'), but the booking starts
        -- pending (held for payment) and no booking_confirmed message is queued until the payment is credited.
        -- 2026-11-25 review: also require approval (Simon's audit; the app only lists published+approved profiles).
        if not exists(select 1 from public.learning_profiles where id = avail.organizer_id and published and approved) then raise exception 'FORBIDDEN'; end if;
        perform 1 from public.learning_profiles where id = avail.organizer_id for update;
        select * into avail from private.appointment_availability where id = p_id for update;
        perform 1 from public.profiles where id = actor for update;
        if not avail.active or begins <= now() or begins > now() + interval '366 days' then raise exception 'INVALID_APPOINTMENT_TIME'; end if;
        if exists(select 1 from private.appointment_slots s join private.appointment_bookings b on b.slot_id = s.id
                   where (s.organizer_id = avail.organizer_id or b.user_id = actor) and b.status in ('pending','confirmed')
                     and s.starts_at < finishes and s.ends_at > begins)
           or exists(select 1 from public.learning_sessions s join public.learning_activities a on a.id = s.activity_id
                   where a.status = 'published' and (a.organizer_id = avail.organizer_id or avail.organizer_id = any(a.teacher_ids))
                     and s.starts_at < finishes and s.ends_at > begins) then raise exception 'APPOINTMENT_OVERLAP'; end if;
        hold_until := least(now() + interval '15 minutes', begins);
        insert into private.appointment_slots(organizer_id, title, location, starts_at, ends_at, availability_id, outside_availability)
          values (avail.organizer_id, avail.title, avail.location, begins, finishes, avail.id, false) returning id into new_slot;
        insert into private.appointment_bookings(slot_id, user_id, created_by, status)
          values (new_slot, actor, actor, 'pending') returning id into new_booking;
        insert into private.appointment_orders(id, booking_id, organizer_id, amount, currency, status, payment_method, hold_expires_at)
          values (gen_random_uuid(), new_booking, avail.organizer_id, pricing.price, pricing.currency, 'pending', 'mercadopago', hold_until)
          returning id into new_order;
      else
        perform public.portal_scheduler('reserve', avail.organizer_id, avail.id, jsonb_build_object('starts_at', begins, 'duration', minutes));
        select b.id into new_booking from private.appointment_bookings b join private.appointment_slots s on s.id = b.slot_id
          where s.availability_id = avail.id and s.starts_at = begins and s.ends_at = finishes and b.user_id = actor and b.status in ('pending','confirmed');
        insert into private.appointment_orders(id, booking_id, organizer_id, amount, currency, status, payment_method)
          values (gen_random_uuid(), new_booking, avail.organizer_id, pricing.price, pricing.currency,
                  case when pricing.price = 0 then 'free' else 'pending' end, method)
          on conflict (booking_id) do nothing returning id into new_order;
      end if;
    end if;
    if new_booking is null then
      select b.id into new_booking from private.appointment_bookings b join private.appointment_slots s on s.id = b.slot_id
        where s.availability_id = avail.id and s.starts_at = begins and s.ends_at = finishes and b.user_id = actor and b.status in ('pending','confirmed');
    end if;
    return public.portal_student_sessions('list', null, '{}'::jsonb)
      || jsonb_build_object('booking_id', new_booking, 'order_id', new_order, 'hold_expires_at', hold_until);
  end if;

  if p_action = 'set_payment_method' then
    -- Student-created booking with a pending order (no hold): switch among the service's enabled methods.
    method := nullif(p_data->>'payment_method', '');
    select b.* into booking from private.appointment_bookings b where b.id = p_id and b.user_id = actor and b.created_by = actor;
    if not found then raise exception 'FORBIDDEN'; end if;
    select * into slot from private.appointment_slots where id = booking.slot_id;
    select x.* into pricing from private.appointment_service_pricing x join private.appointment_availability a
        on a.organizer_id = x.organizer_id and a.title = x.title and a.location = x.location where a.id = slot.availability_id;
    if pricing.organizer_id is null or method is null or not (method = any(pricing.payment_methods))
       or (method = 'mercadopago' and not private.mercadopago_ready(slot.organizer_id)) then raise exception 'PAYMENT_METHOD_UNAVAILABLE'; end if;
    if booking.status = 'pending' then
      insert into private.appointment_payment_requests(booking_id, payment_method) values (booking.id, method)
        on conflict (booking_id) do update set payment_method = excluded.payment_method;
    else
      update private.appointment_orders o set payment_method = method, checkout_url = null, checkout_expires_at = null
       where o.booking_id = booking.id and o.status = 'pending' and o.hold_expires_at is null
         and not (o.checkout_lease is not null and o.checkout_claimed_at > now() - interval '1 minute');
      if not found then raise exception 'NOT_PENDING'; end if;
    end if;
    p_action := 'list';
  end if;

  if p_action <> 'list' then raise exception 'INVALID_ACTION'; end if;
  return jsonb_build_object('sessions', coalesce((select jsonb_agg(x order by x.starts_at) from (
    select b.id, b.status, s.title, s.starts_at, s.ends_at, s.organizer_id, p.name organizer_name, s.location, s.outside_availability,
      b.created_by = actor created_by_me,
      case when b.status = 'pending' then
        case when o.status = 'pending' and o.hold_expires_at is not null then 'payment'
             when b.created_by = b.user_id then 'facilitator' else 'student' end end awaiting,
      o.id order_id, o.amount, o.currency, o.status payment_status,
      coalesce(o.payment_method, case when o.id is not null then 'mercadopago' end) payment_method,
      o.hold_expires_at,
      case when o.payment_method in ('cash','transfer') then nullif(pr.payment_instructions, '') end payment_instructions,
      (b.status = 'cancelled' and o.status = 'paid') late_payment,
      (b.status = 'cancelled' and o.hold_released_at is not null and o.status <> 'paid') released,
      case when o.id is null then pr.price end service_price,
      case when o.id is null then rq.payment_method end requested_payment_method,
      case when b.created_by = actor and b.status <> 'cancelled' and pr.price > 0 and (o.id is null or (o.status = 'pending' and o.hold_expires_at is null))
        then to_jsonb(array(select m from unnest(pr.payment_methods) m where m <> 'mercadopago' or private.mercadopago_ready(s.organizer_id))) end payment_methods,
      nullif(trim(st.whatsapp_phone), '') whatsapp_phone
    from private.appointment_bookings b
    join private.appointment_slots s on s.id = b.slot_id
    join public.learning_profiles p on p.id = s.organizer_id
    left join private.appointment_orders o on o.booking_id = b.id
    left join private.appointment_availability a on a.id = s.availability_id
    left join private.appointment_service_pricing pr on pr.organizer_id = a.organizer_id and pr.title = a.title and pr.location = a.location
    left join private.appointment_payment_requests rq on rq.booking_id = b.id
    left join private.studio_settings st on st.organizer_id = s.organizer_id
    where b.user_id = actor and s.ends_at > now()
      and (b.status in ('pending','confirmed') or (b.status = 'cancelled' and o.hold_expires_at is not null and (o.status = 'paid' or o.hold_released_at is not null)))
  ) x), '[]'::jsonb));
end $$;
revoke all on function public.portal_student_sessions(text, uuid, jsonb) from public, anon;
grant execute on function public.portal_student_sessions(text, uuid, jsonb) to authenticated;

-- 8) portal_appointment_server: identical to prod (read 2026-11-17) except the lines marked CHANGED.
CREATE OR REPLACE FUNCTION public.portal_appointment_server(p_action text, p_order uuid DEFAULT NULL::uuid, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare order_row private.appointment_orders; message private.appointment_mail; lease uuid; result jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_action='pending_mail' then
  return coalesce((select jsonb_agg(order_id) from (select order_id from private.appointment_mail where status='pending' order by created_at limit 10) x),'[]'::jsonb);
 elsif p_action='enqueue_payment' then
  if coalesce(p_data->>'payment_id','') !~ '^[0-9]{1,30}$' or length(coalesce(p_data->>'request_id','')) not between 1 and 200 then raise exception 'INVALID_PAYMENT'; end if;
  insert into private.appointment_payment_events(organizer_id,payment_id,request_id) values((p_data->>'organizer_id')::uuid,p_data->>'payment_id',p_data->>'request_id') on conflict(organizer_id,request_id) do nothing;
  return 'true';
 elsif p_action='pending_payments' then
  return coalesce((select jsonb_agg(x) from (select id,organizer_id,payment_id from private.appointment_payment_events where status='pending' and attempts<10 order by created_at limit 10) x),'[]'::jsonb);
 elsif p_action='payment_event_done' then
  update private.appointment_payment_events set status=case when coalesce((p_data->>'ok')::boolean,false) then 'done' else 'pending' end,attempts=attempts+1 where id=p_order;
  return 'true';
 end if;
 select * into order_row from private.appointment_orders where id=p_order for update;
 if not found then raise exception 'FORBIDDEN'; end if;
 if p_action='mail_claim' then
  select * into message from private.appointment_mail where order_id=p_order for update;
  if message.status='processing' and message.claimed_at<now()-interval '10 minutes' then update private.appointment_mail set status='failed',error='Envío sin confirmación: revisar proveedor antes de reintentar.' where order_id=p_order; return jsonb_build_object('status','failed'); end if;
  if message.status<>'pending' then return jsonb_build_object('status',message.status); end if;
  if exists(select 1 from private.appointment_bookings where id=order_row.booking_id and status='cancelled') then update private.appointment_mail set status='cancelled' where order_id=p_order; return jsonb_build_object('status','cancelled'); end if;
  update private.appointment_mail set status='processing',claimed_at=now() where order_id=p_order;
 elsif p_action='mail_finish' then
  if p_data->>'status' not in ('sent','failed') then raise exception 'INVALID_ACTION'; end if;
  update private.appointment_mail set status=p_data->>'status',provider_id=left(p_data->>'provider_id',250),error=left(p_data->>'error',500) where order_id=p_order and status='processing';
 elsif p_action='checkout_claim' then
  -- CHANGED: only Mercado Pago orders; a student's payment hold (pending booking) can pay until hold_expires_at.
 if order_row.status<>'pending' or coalesce(order_row.payment_method,'mercadopago')<>'mercadopago' or exists(select 1 from private.appointment_bookings b join private.appointment_slots s on s.id=b.slot_id where b.id=order_row.booking_id and (s.starts_at<=now() or not (b.status='confirmed' or (b.status='pending' and order_row.hold_expires_at>now()+interval '1 minute')))) then raise exception 'BOOKING_CLOSED'; end if;
  -- CHANGED: reuse the cached link only for the same return target (p_data.return_to: 'app' | null).
 if order_row.checkout_url is not null and order_row.checkout_expires_at>now() and order_row.checkout_return is not distinct from nullif(p_data->>'return_to','') then return jsonb_build_object('url',order_row.checkout_url); end if;
  if order_row.checkout_lease is not null and order_row.checkout_claimed_at>now()-interval '1 minute' then raise exception 'CONNECTION_BUSY'; end if;
  lease:=gen_random_uuid();
  update private.appointment_orders set checkout_lease=lease,checkout_claimed_at=now() where id=p_order;
  return jsonb_build_object('lease',lease);
 elsif p_action='checkout_save' then
  if order_row.checkout_lease is distinct from (p_data->>'lease')::uuid then raise exception 'CONNECTION_CHANGED'; end if;
  if p_data->>'url' !~ '^https://[a-zA-Z0-9.-]*mercadopago\.(com|com\.ar)/' then raise exception 'INVALID_PAYMENT'; end if;
  -- CHANGED: remember the return target of the saved link.
 update private.appointment_orders set checkout_url=p_data->>'url',checkout_expires_at=(p_data->>'expires_at')::timestamptz,checkout_lease=null,checkout_return=case when p_data->>'return_to'='app' then 'app' end where id=p_order;
 elsif p_action='checkout_release' then
  update private.appointment_orders set checkout_lease=null where id=p_order and checkout_lease=(p_data->>'lease')::uuid;
 elsif p_action='confirm_payment' then
  if (p_data->>'amount')::numeric is distinct from order_row.amount or p_data->>'currency' is distinct from order_row.currency or coalesce(p_data->>'payment_id','') !~ '^mercadopago:[0-9]{1,30}$' then raise exception 'INVALID_PAYMENT'; end if;
  if order_row.payment_id is not null and order_row.payment_id<>p_data->>'payment_id' then raise exception 'PAYMENT_ALREADY_LINKED'; end if;
  if p_data->>'status'='refunded' then
   update private.appointment_orders set status='refunded',payment_id=p_data->>'payment_id' where id=p_order;
  elsif p_data->>'status'='approved' and order_row.status<>'refunded' then
   update private.appointment_orders set status='paid',payment_id=p_data->>'payment_id',paid_at=coalesce(paid_at,now()) where id=p_order;
  end if;
 elsif p_action<>'read' then raise exception 'INVALID_ACTION';
 end if;
 -- CHANGED: left join studio_members (student self-bookings have no member row) and fall back to the profile name.
 select to_jsonb(o)||jsonb_build_object('student_name',coalesce(m.name,pr.display_name),'student_email',m.email,'user_id',b.user_id,'booking_status',b.status,'title',s.title,'starts_at',s.starts_at,'ends_at',s.ends_at,'organizer_name',p.name,'mail_kind',mail.kind,'mail_status',mail.status)
 into result from private.appointment_orders o join private.appointment_bookings b on b.id=o.booking_id join private.appointment_slots s on s.id=b.slot_id left join private.studio_members m on m.id=b.member_id left join public.profiles pr on pr.id=b.user_id join public.learning_profiles p on p.id=o.organizer_id left join private.appointment_mail mail on mail.order_id=o.id where o.id=p_order;
 return result;
end $function$;

-- 9) portal_appointment_order_access: identical to prod except the CHANGED select.
CREATE OR REPLACE FUNCTION public.portal_appointment_order_access(p_order uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=private.learning_actor(); result jsonb;
begin
 perform private.appointment_claim_account();
 -- CHANGED: adds payment_method, hold_expires_at and checkout_allowed (same rule as checkout_claim).
 select jsonb_build_object('id',o.id,'organizer_id',o.organizer_id,'amount',o.amount,'currency',o.currency,'status',o.status,'booking_status',b.status,'starts_at',s.starts_at,
  'payment_method',coalesce(o.payment_method,'mercadopago'),'hold_expires_at',o.hold_expires_at,
  'checkout_allowed',o.status='pending' and o.amount>0 and coalesce(o.payment_method,'mercadopago')='mercadopago' and s.starts_at>now()
   and (b.status='confirmed' or (b.status='pending' and o.hold_expires_at>now()+interval '1 minute'))) into result
 from private.appointment_orders o join private.appointment_bookings b on b.id=o.booking_id join private.appointment_slots s on s.id=b.slot_id
 where o.id=p_order and (b.user_id=actor or private.learning_can_manage(o.organizer_id));
 if result is null then raise exception 'FORBIDDEN'; end if;
 return result;
end $function$;

-- 10) Release unpaid holds every minute (pg_cron is installed; existing jobs: vibes-notification-reminders, vibes-reengagement-notifications).
-- 2026-11-25 review: pg_cron 1.6 upserts by job name, so re-running this is idempotent.
select cron.schedule('vibes-session-payment-holds', '* * * * *', 'select private.release_expired_session_holds()');
