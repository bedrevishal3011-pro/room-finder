-- Room Finder: payment control and three-state room management
-- Run in Supabase SQL Editor. This migration preserves all existing records.

alter table public.settings
  add column if not exists payment_enabled boolean not null default true;

alter table public.rooms
  add column if not exists status text;

update public.rooms
set status = case
  when rented then 'rented'
  when hidden then 'inactive'
  else 'available'
end
where status is null
   or status not in ('available', 'rented', 'inactive');

alter table public.rooms
  alter column status set default 'available',
  alter column status set not null;

alter table public.rooms
  drop constraint if exists rooms_status_check;

alter table public.rooms
  add constraint rooms_status_check
  check (status in ('available', 'rented', 'inactive'));

create or replace function public.sync_room_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'rented' then
      new.rented := true;
      new.hidden := false;
    elsif new.status = 'inactive' then
      new.rented := false;
      new.hidden := true;
    else
      new.status := 'available';
      new.rented := false;
      new.hidden := false;
    end; 
  else
    if new.status is distinct from old.status then
      if new.status = 'rented' then
        new.rented := true;
        new.hidden := false;
      elsif new.status = 'inactive' then
        new.rented := false;
        new.hidden := true;
      else
        new.status := 'available';
        new.rented := false;
        new.hidden := false;
      end if;
    elsif new.rented is distinct from old.rented then
      new.status := case when new.rented then 'rented' else 'available' end;
      new.hidden := case when new.rented then false else new.hidden end;
    elsif new.hidden is distinct from old.hidden then
      new.status := case when new.hidden then 'inactive' else 'available' end;
      new.rented := case when new.hidden then false else new.rented end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_room_status_trg on public.rooms;
create trigger sync_room_status_trg
before insert or update on public.rooms
for each row execute function public.sync_room_status();

create or replace function public.rooms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.featured := false;
      new.hidden := false;
      new.status := 'available';
      new.rented := false;
      if (select count(*) from public.rooms where owner_id = auth.uid()) >= 5 then
        raise exception 'एका खात्यावर जास्तीत जास्त 5 रूम';
      end if;
    else
      new.featured := old.featured;
      new.hidden := old.hidden;
      new.rented := old.rented;
      new.status := old.status;
      new.owner_id := old.owner_id;

      if auth.uid() = old.owner_id then
        if new.status is distinct from old.status then
          new.hidden := old.hidden;
          new.rented := old.rented;
        end if;
        new.featured := old.featured;
        new.owner_id := old.owner_id;
        new.hidden := old.hidden;
        new.rented := old.rented;
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists rooms_guard_trg on public.rooms;
create trigger rooms_guard_trg before insert or update on public.rooms
  for each row execute function public.rooms_guard();

-- The prior trigger now prevents owners changing status; replace it with owner-safe logic.
create or replace function public.rooms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end;

  if tg_op = 'INSERT' then
    new.featured := false;
    new.hidden := false;
    new.status := 'available';
    new.rented := false;
    if (select count(*) from public.rooms where owner_id = auth.uid()) >= 5 then
      raise exception 'एका खात्यावर जास्तीत जास्त 5 रूम';
    end if;
  else
    if auth.uid() <> old.owner_id then
      raise exception 'फक्त रूमचा अधिकृत मालक किंवा admin status बदलू शकतो';
    end if;
    new.featured := old.featured;
    new.owner_id := old.owner_id;

    if new.status is distinct from old.status then
      -- status trigger will synchronize hidden/rented after this guard
      null;
    elsif new.rented is distinct from old.rented then
      new.status := case when new.rented then 'rented' else 'available' end;
    elsif new.hidden is distinct from old.hidden then
      new.status := case when new.hidden then 'inactive' else 'available' end;
    end if;
  end if;
  return new;
end $$;

-- Public reads: available rooms only. Owners and admins can still manage hidden states.
drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select
  using (
    status = 'available'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create index if not exists rooms_status_idx
  on public.rooms (status, featured desc, created_at desc);
