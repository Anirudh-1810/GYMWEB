-- IronPulse Gym — Supabase Tables, Timestamps & Row Level Security (RLS)
-- Copy and run this SQL once in your Supabase Dashboard -> SQL Editor.

-- 1. Automatic updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Members table (each gym owner's private client roster)
create table if not exists public.members (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  plan text not null default '1 Month',
  fees integer not null check (fees > 0),
  amount_paid integer not null check (amount_paid >= 0),
  payment_mode text not null default 'UPI',
  manual_status text not null default 'active' check (manual_status in ('active', 'paused')),
  paid_date text not null,
  renewal_date text not null,
  joined_date text not null,
  avatar_url text,
  notes text,
  last_messaged_at text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_members_user_renewal
  on public.members (user_id, renewal_date);

drop trigger if exists trg_members_updated_at on public.members;
create trigger trg_members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- 3. Gym Branding table (each owner's custom gym name, logo, and currency)
create table if not exists public.gym_branding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gym_name text not null default 'IronPulse Gym',
  logo_url text,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_gym_branding_updated_at on public.gym_branding;
create trigger trg_gym_branding_updated_at
  before update on public.gym_branding
  for each row execute function public.set_updated_at();

-- 4. Enable Row Level Security (RLS) so each login sees ONLY its own rows
alter table public.members enable row level security;
alter table public.gym_branding enable row level security;

-- Members RLS policies
drop policy if exists "Users can view their own members" on public.members;
create policy "Users can view their own members"
  on public.members
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own members" on public.members;
create policy "Users can insert their own members"
  on public.members
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own members" on public.members;
create policy "Users can update their own members"
  on public.members
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own members" on public.members;
create policy "Users can delete their own members"
  on public.members
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Gym Branding RLS policies
drop policy if exists "Users can view their own gym branding" on public.gym_branding;
create policy "Users can view their own gym branding"
  on public.gym_branding
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own gym branding" on public.gym_branding;
create policy "Users can insert their own gym branding"
  on public.gym_branding
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own gym branding" on public.gym_branding;
create policy "Users can update their own gym branding"
  on public.gym_branding
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own gym branding" on public.gym_branding;
create policy "Users can delete their own gym branding"
  on public.gym_branding
  for delete
  to authenticated
  using (auth.uid() = user_id);
