-- Optional: if you created `profiles` earlier with column `level`, rename it to match the app.
-- Safe to run once; does nothing if `level` does not exist.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'level'
  ) then
    alter table public.profiles rename column level to experience_level;
  end if;
end $$;
