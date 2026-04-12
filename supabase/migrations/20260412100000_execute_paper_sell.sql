-- Atomic paper sell: credit cash, log SELL, reduce or remove holding (avg_buy unchanged).

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

  select shares into held_shares from public.holdings where user_id = uid and stock_symbol = sym for update;
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

  update public.profiles
  set cash_balance = cash_balance + proceeds, updated_at = now()
  where user_id = uid;

  insert into public.transactions (user_id, stock_symbol, type, shares, prices, recorded_at)
  values (uid, sym, 'SELL', p_shares, p_price, now());

  new_shares := held_shares - p_shares;
  if new_shares <= 0 then
    delete from public.holdings where user_id = uid and stock_symbol = sym;
  else
    update public.holdings
    set shares = new_shares, updated_at = now()
    where user_id = uid and stock_symbol = sym;
  end if;

  return json_build_object('ok', true, 'proceeds', proceeds);
end;
$$;

grant execute on function public.execute_paper_sell(text, numeric, numeric) to authenticated;
