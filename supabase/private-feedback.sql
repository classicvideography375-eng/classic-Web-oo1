create table if not exists public.private_feedback (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  service text not null check (service in ('Weddings', 'Portraits', 'Events', 'Brand films', 'Something else')),
  rating smallint not null check (rating between 1 and 3),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.private_feedback_owners (
  owner_id uuid primary key references auth.users (id) on delete cascade
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  service text not null check (service in ('Weddings', 'Portraits', 'Events', 'Brand films', 'Something else')),
  requested_date date,
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  class_interest text not null check (class_interest in ('Photography & shooting', 'Photo editing', 'Both classes')),
  experience text not null check (experience in ('Just starting out', 'Some experience', 'Looking to improve')),
  created_at timestamptz not null default now()
);

alter table public.private_feedback enable row level security;
alter table public.private_feedback_owners enable row level security;
alter table public.booking_requests enable row level security;
alter table public.class_enrollments enable row level security;

create index if not exists private_feedback_created_at_idx
  on public.private_feedback (created_at desc);
create index if not exists booking_requests_created_at_idx
  on public.booking_requests (created_at desc);
create index if not exists class_enrollments_created_at_idx
  on public.class_enrollments (created_at desc);

revoke all on public.private_feedback from public, anon, authenticated;
revoke all on public.private_feedback_owners from public, anon, authenticated;
revoke all on public.booking_requests from public, anon, authenticated;
revoke all on public.class_enrollments from public, anon, authenticated;

grant insert (name, service, rating, message) on public.private_feedback to anon, authenticated;
grant select on public.private_feedback to authenticated;
grant select on public.private_feedback_owners to authenticated;
grant insert (name, email, service, requested_date, message) on public.booking_requests to anon, authenticated;
grant select on public.booking_requests to authenticated;
grant insert (name, email, class_interest, experience) on public.class_enrollments to anon, authenticated;
grant select on public.class_enrollments to authenticated;

drop policy if exists "Anyone can submit private feedback" on public.private_feedback;
create policy "Anyone can submit private feedback"
  on public.private_feedback
  for insert
  to anon, authenticated
  with check (rating between 1 and 3);

drop policy if exists "Only the registered owner can read private feedback" on public.private_feedback;
create policy "Only the registered owner can read private feedback"
  on public.private_feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.private_feedback_owners
      where owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can verify their own inbox access" on public.private_feedback_owners;
create policy "Owners can verify their own inbox access"
  on public.private_feedback_owners
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Anyone can submit a booking enquiry" on public.booking_requests;
create policy "Anyone can submit a booking enquiry"
  on public.booking_requests
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 100
    and char_length(btrim(email)) between 3 and 254
    and (requested_date is null or requested_date >= current_date)
  );

drop policy if exists "Only the registered owner can read booking enquiries" on public.booking_requests;
create policy "Only the registered owner can read booking enquiries"
  on public.booking_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.private_feedback_owners
      where owner_id = (select auth.uid())
    )
  );

drop policy if exists "Anyone can register interest in classes" on public.class_enrollments;
create policy "Anyone can register interest in classes"
  on public.class_enrollments
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 100
    and char_length(btrim(email)) between 3 and 254
  );

drop policy if exists "Only the registered owner can read class registrations" on public.class_enrollments;
create policy "Only the registered owner can read class registrations"
  on public.class_enrollments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.private_feedback_owners
      where owner_id = (select auth.uid())
    )
  );
