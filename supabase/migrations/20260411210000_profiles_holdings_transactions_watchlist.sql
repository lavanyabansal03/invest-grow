-- Executable schema aligned with your tables: profiles, holdings, transactions, watchlist.
-- Auth source of truth is auth.users — no separate public.users table (avoids sync drift).
-- Run once in Supabase SQL Editor (backup first if you have data).

-- ---------------------------------------------------------------------------
-- Remove legacy objects from earlier app versions (safe if missing)
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.execute_paper_buy(text, text, numeric, numeric) cascade;
drop table if exists public.trades cascade;
drop table if exists public.positions cascade;
drop table if exists public.watchlist cascade;
drop table if exists public.transactions cascade;
drop table if exists public.holdings cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------------
-- profiles — keyed by auth user (user_id = auth.users.id)
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  username text not null default '',
  email text not null default '',
  age_group text check (age_group is null or age_group in ('14-18', '18+')),
  experience_level text check (experience_level is null or experience_level in ('beginner', 'intermediate', 'pro')),
  cash_balance numeric(14, 2) not null default 0,
  starting_cash numeric(14, 2) not null default 0,
  max_cap numeric(14, 2),
  confidence_score smallint not null default 0 check (confidence_score >= 0 and confidence_score <= 100),
  streak smallint not null default 0 check (streak >= 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- holdings — open positions (your naming: stock_symbol, avg_buy_price)
-- ---------------------------------------------------------------------------

create table public.holdings (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  stock_symbol text not null,
  shares numeric(18, 8) not null check (shares > 0),
  avg_buy_price numeric(14, 4) not null,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, stock_symbol)
);

create index holdings_user_id_idx on public.holdings (user_id);

-- ---------------------------------------------------------------------------
-- transactions — trade log (type BUY / SELL; prices = per-share)
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  stock_symbol text not null,
  type text not null check (type in ('BUY', 'SELL')),
  shares numeric(18, 8) not null,
  prices numeric(14, 4) not null,
  recorded_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_recorded_at_idx on public.transactions (recorded_at desc);

-- ---------------------------------------------------------------------------
-- watchlist
-- ---------------------------------------------------------------------------

create table public.watchlist (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  stock_symbol text not null,
  display_name text,
  created_at timestamptz not null default now(),
  unique (user_id, stock_symbol)
);

create index watchlist_user_id_idx on public.watchlist (user_id);

-- ---------------------------------------------------------------------------
-- New user → profile row
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', ''),
    coalesce(new.email, '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic buy: debit cash, log transaction, merge holding
-- ---------------------------------------------------------------------------

create or replace function public.execute_paper_buy(
  p_symbol text,
  p_company_name text,
  p_shares numeric,
  p_price numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cost numeric(14, 2);
  cur_cash numeric(14, 2);
  old_shares numeric(18, 8);
  old_avg numeric(14, 4);
  sym text := upper(trim(p_symbol));
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if sym is null or length(sym) = 0 then
    raise exception 'Invalid symbol';
  end if;
  if p_shares is null or p_shares <= 0 then
    raise exception 'Shares must be positive';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'Invalid price';
  end if;

  cost := round(p_shares * p_price, 2);
  if cost <= 0 then
    raise exception 'Order total too small';
  end if;

  select cash_balance into cur_cash from public.profiles where user_id = uid for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if cur_cash < cost then
    raise exception 'Insufficient cash';
  end if;

  update public.profiles
  set cash_balance = cash_balance - cost, updated_at = now()
  where user_id = uid;

  insert into public.transactions (user_id, stock_symbol, type, shares, prices, recorded_at)
  values (uid, sym, 'BUY', p_shares, p_price, now());

  select shares, avg_buy_price into old_shares, old_avg
  from public.holdings
  where user_id = uid and stock_symbol = sym;

  if found then
    update public.holdings
    set
      shares = old_shares + p_shares,
      avg_buy_price = (old_shares * old_avg + p_shares * p_price) / (old_shares + p_shares),
      company_name = coalesce(nullif(trim(p_company_name), ''), company_name),
      updated_at = now()
    where user_id = uid and stock_symbol = sym;
  else
    insert into public.holdings (user_id, stock_symbol, shares, avg_buy_price, company_name)
    values (uid, sym, p_shares, p_price, nullif(trim(p_company_name), ''));
  end if;

  return json_build_object('ok', true, 'total', cost);
end;
$$;

grant execute on function public.execute_paper_buy(text, text, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.watchlist enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists "holdings_select_own" on public.holdings;
create policy "holdings_select_own" on public.holdings for select using (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);

drop policy if exists "watchlist_select_own" on public.watchlist;
create policy "watchlist_select_own" on public.watchlist for select using (auth.uid() = user_id);

drop policy if exists "watchlist_insert_own" on public.watchlist;
create policy "watchlist_insert_own" on public.watchlist for insert with check (auth.uid() = user_id);

drop policy if exists "watchlist_delete_own" on public.watchlist;
create policy "watchlist_delete_own" on public.watchlist for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to postgres, anon, authenticated, service_role;
grant select, insert, update on public.profiles to authenticated;
grant select on public.holdings to authenticated;
grant select on public.transactions to authenticated;
grant select, insert, delete on public.watchlist to authenticated;
