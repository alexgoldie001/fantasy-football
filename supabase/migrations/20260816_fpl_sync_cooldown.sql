-- One shared, database-backed lock: works even when Vercel serves requests from multiple instances.
create table if not exists public.fpl_sync_control (
  id text primary key default 'live_fpl',
  status text not null default 'idle' check (status in ('idle', 'running')),
  started_at timestamptz,
  completed_at timestamptz,
  cooldown_until timestamptz,
  last_error text
);

alter table public.fpl_sync_control enable row level security;
revoke all on public.fpl_sync_control from anon, authenticated;

create or replace function public.claim_fpl_sync()
returns table (claimed boolean, retry_after_seconds integer, message text)
language plpgsql security definer set search_path = public as $$
declare control public.fpl_sync_control%rowtype;
begin
  insert into public.fpl_sync_control (id) values ('live_fpl') on conflict (id) do nothing;
  update public.fpl_sync_control set status = 'running', started_at = now(), last_error = null
  where id = 'live_fpl'
    and (status <> 'running' or started_at < now() - interval '10 minutes')
    and (cooldown_until is null or cooldown_until <= now())
  returning * into control;
  if found then return query select true, 0, 'Refresh started'; return; end if;
  select * into control from public.fpl_sync_control where id = 'live_fpl';
  if control.status = 'running' then
    return query select false, greatest(1, ceil(extract(epoch from (control.started_at + interval '10 minutes') - now()))::integer), 'An update is already in progress';
  else
    return query select false, greatest(1, ceil(extract(epoch from control.cooldown_until - now()))::integer), 'Stats were updated recently';
  end if;
end; $$;

create or replace function public.finish_fpl_sync(success boolean, detail text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.fpl_sync_control
  set status = 'idle', completed_at = now(), cooldown_until = now() + interval '1 minute', last_error = case when success then null else detail end
  where id = 'live_fpl';
end; $$;

revoke all on function public.claim_fpl_sync() from public;
revoke all on function public.finish_fpl_sync(boolean, text) from public;
