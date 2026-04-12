-- Sold lots: one row per sell with cost basis and realized P/L (open lots stay in holdings).
-- Replaces execute_paper_sell to insert here, update cash, log transactions, and trim/remove holdings.

-- ---------------------------------------------------------------------------
-- sold_stocks — closed partial/full sales (not open positions)
-- ---------------------------------------------------------------------------

create table if not exists public.sold_stocks (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  stock_symbol text not null,
  company_name text,
  shares_sold numeric(18, 8) not null check (shares_sold > 0),
  sale_price_per_share numeric(14, 4) not null,
  proceeds numeric(14, 2) not null,
  avg_cost_per_share_at_sale numeric(14, 4) not null,
  cost_basis numeric(14, 2) not null,
  realized_pnl numeric(14, 2) not null,
  recorded_at timestamptz not null default now(),
  transaction_id uuid references public.transactions (id) on delete set null
);

create index if not exists sold_stocks_user_id_idx on public.sold_stocks (user_id);
create index if not exists sold_stocks_user_symbol_idx on public.sold_stocks (user_id, stock_symbol);
create index if not exists sold_stocks_recorded_at_idx on public.sold_stocks (recorded_at desc);

alter table public.sold_stocks enable row level security;

drop policy if exists "sold_stocks_select_own" on public.sold_stocks;
create policy "sold_stocks_select_own" on public.sold_stocks for select using (auth.uid() = user_id);

grant select on public.sold_stocks to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic sell: cash, transaction row, sold_stocks row, then holdings
-- ---------------------------------------------------------------------------

drop function if exists public.execute_paper_sell(text, numeric, numeric) cascade;

create or replace function public.execute_paper_sell(
  p_symbol text,
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
  sym text := upper(trim(p_symbol));
  proceeds numeric(14, 2);
  held_shares numeric(18, 8);
  new_shares numeric(18, 8);
  avg_cost numeric(14, 4);
  co_name text;
  cost_basis numeric(14, 2);
  realized_pnl numeric(14, 2);
  tx_id uuid;
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

  perform 1 from public.profiles where user_id = uid for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  select h.shares, h.avg_buy_price, h.company_name
  into held_shares, avg_cost, co_name
  from public.holdings h
  where h.user_id = uid and h.stock_symbol = sym
  for update;

  if not found then
    raise exception 'No shares to sell';
  end if;

  if p_shares > held_shares then
    raise exception 'Insufficient shares';
  end if;

  proceeds := round(p_shares * p_price, 2);
  if proceeds <= 0 then
    raise exception 'Proceeds too small';
  end if;

  cost_basis := round(p_shares * avg_cost, 2);
  realized_pnl := proceeds - cost_basis;

  update public.profiles
  set cash_balance = cash_balance + proceeds, updated_at = now()
  where user_id = uid;

  insert into public.transactions (user_id, stock_symbol, type, shares, prices, recorded_at)
  values (uid, sym, 'SELL', p_shares, p_price, now())
  returning id into tx_id;

  insert into public.sold_stocks (
    user_id,
    stock_symbol,
    company_name,
    shares_sold,
    sale_price_per_share,
    proceeds,
    avg_cost_per_share_at_sale,
    cost_basis,
    realized_pnl,
    recorded_at,
    transaction_id
  )
  values (
    uid,
    sym,
    co_name,
    p_shares,
    p_price,
    proceeds,
    avg_cost,
    cost_basis,
    realized_pnl,
    now(),
    tx_id
  );

  new_shares := held_shares - p_shares;
  if new_shares <= 0 then
    delete from public.holdings where user_id = uid and stock_symbol = sym;
  else
    update public.holdings
    set shares = new_shares, updated_at = now()
    where user_id = uid and stock_symbol = sym;
  end if;

  return json_build_object(
    'ok', true,
    'proceeds', proceeds,
    'cost_basis', cost_basis,
    'realized_pnl', realized_pnl
  );
end;
$$;

grant execute on function public.execute_paper_sell(text, numeric, numeric) to authenticated;
