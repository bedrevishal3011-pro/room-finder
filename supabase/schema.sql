-- Room Finder – Supabase schema (Supabase SQL Editor मध्ये एकदा चालवा)

create table public.admins (
  user_id uuid primary key references auth.users on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  city text not null check (char_length(city) between 2 and 60),
  area text not null check (char_length(area) between 2 and 80),
  college text check (char_length(college) <= 80),
  rent int not null check (rent between 500 and 200000),
  deposit int check (deposit between 0 and 500000),
  room_type text not null check (room_type in ('Single room','Shared room','1 RK','PG')),
  gender text not null check (gender in ('मुलांसाठी','मुलींसाठी','दोघांसाठी')),
  amenities text[] not null default '{}',
  description text check (char_length(description) <= 1000),
  photos text[] not null default '{}' check (cardinality(photos) <= 3),
  featured boolean not null default false,
  featured_requested boolean not null default false,
  rented boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index rooms_city_idx on public.rooms (lower(city));
create index rooms_listing_idx on public.rooms (hidden, rented, featured desc, created_at desc);
create index rooms_owner_idx on public.rooms (owner_id);
create index rooms_amenities_idx on public.rooms using gin (amenities);

-- फोन नंबर आणि पूर्ण पत्ता वेगळ्या टेबलमध्ये: फक्त पैसे भरलेल्यांना (मर्यादित वेळेसाठी) दिसतात
create table public.room_contacts (
  room_id uuid primary key references public.rooms on delete cascade,
  owner_name text not null check (char_length(owner_name) between 2 and 60),
  phone text not null check (phone ~ '^91[6-9][0-9]{9}$'),
  address text not null check (char_length(address) between 5 and 300)
);

-- Maps लोकेशन वेगळ्या टेबलमध्ये: फक्त Featured रूमसाठी इतरांना दिसते
create table public.room_locations (
  room_id uuid primary key references public.rooms on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);

create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  room_id uuid not null references public.rooms on delete cascade,
  primary key (user_id, room_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  created_at timestamptz not null default now()
);

-- शुल्क आणि वेळ (admin ठरवतो)
create table public.settings (
  id int primary key default 1 check (id = 1),
  view_fee_paise int not null default 4900 check (view_fee_paise between 100 and 500000),
  unlock_minutes int not null default 30 check (unlock_minutes between 5 and 1440)
);
insert into public.settings default values;

-- पैसे भरून उघडलेले संपर्क (फक्त सर्व्हर, पेमेंट पडताळल्यावर, लिहितो)
create table public.unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  room_id uuid references public.rooms on delete set null,
  payment_id text not null unique,
  amount_paise int not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index unlocks_user_room_idx on public.unlocks (user_id, room_id, expires_at);

create or replace function public.has_unlock(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.unlocks
    where user_id = auth.uid() and room_id = rid and expires_at > now());
$$;

-- Featured/hidden फक्त admin बदलू शकतो; एका user ला जास्तीत जास्त 5 रूम
create or replace function public.rooms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.featured := false; new.hidden := false;
      if (select count(*) from public.rooms where owner_id = auth.uid()) >= 5 then
        raise exception 'एका खात्यावर जास्तीत जास्त 5 रूम';
      end if;
    else
      new.featured := old.featured; new.hidden := old.hidden; new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end $$;
create trigger rooms_guard_trg before insert or update on public.rooms
  for each row execute function public.rooms_guard();

alter table public.admins enable row level security;
alter table public.rooms enable row level security;
alter table public.room_contacts enable row level security;
alter table public.room_locations enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.settings enable row level security;
alter table public.unlocks enable row level security;

-- rooms: सर्वांना वाचता येतात (hidden सोडून)
create policy rooms_read on public.rooms for select
  using (not hidden or owner_id = auth.uid() or public.is_admin());
create policy rooms_insert on public.rooms for insert to authenticated
  with check (owner_id = auth.uid());
create policy rooms_update on public.rooms for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy rooms_delete on public.rooms for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- contacts: फक्त वैध unlock असलेला विद्यार्थी, रूम मालक किंवा admin वाचतो
create policy contacts_read on public.room_contacts for select to authenticated
  using (public.has_unlock(room_id) or public.is_admin()
    or exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()));
create policy contacts_write on public.room_contacts for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and (r.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.rooms r where r.id = room_id and (r.owner_id = auth.uid() or public.is_admin())));

-- locations: Featured रूमचे फक्त unlock असलेल्यांना; बाकीचे मालक/admin ला
create policy loc_read on public.room_locations for select
  using (exists (select 1 from public.rooms r where r.id = room_id
    and ((r.featured and not r.hidden and public.has_unlock(room_id)) or r.owner_id = auth.uid() or public.is_admin())));
create policy loc_write on public.room_locations for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and (r.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.rooms r where r.id = room_id and (r.owner_id = auth.uid() or public.is_admin())));

create policy fav_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy rep_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy rep_admin_read on public.reports for select to authenticated using (public.is_admin());
create policy rep_admin_del on public.reports for delete to authenticated using (public.is_admin());

create policy admins_self on public.admins for select to authenticated using (user_id = auth.uid());

-- फोटो storage (public वाचन, फक्त स्वतःच्या फोल्डरमध्ये upload, 2 MB, फक्त इमेज)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'room-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- settings: सर्वांना वाचता येतात (शुल्क दाखवायला), फक्त admin बदलतो
create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- unlocks: स्वतःचे (किंवा admin ला सर्व) वाचता येतात. लिहिण्याची policy नाही:
-- फक्त पेमेंट वेबहूक (service role) नवीन ओळ टाकू शकते.
create policy unlocks_read on public.unlocks for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create index reports_room_idx on public.reports (room_id);
