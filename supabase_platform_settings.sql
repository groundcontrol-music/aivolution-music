-- Platform Settings: globale Schluessel/Werte fuer UI-Logik
create table if not exists public.platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

create index if not exists platform_settings_key_idx on public.platform_settings (key);

alter table public.platform_settings enable row level security;

-- Lesen fuer alle (Startseite braucht Zugriff)
create policy "platform_settings_read_all"
  on public.platform_settings for select
  using (true);

-- Schreiben nur fuer Admins
create policy "platform_settings_write_admin"
  on public.platform_settings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Default: meistgekauft
insert into public.platform_settings (key, value)
values ('homepage_track_filter', 'most_purchased')
on conflict (key) do nothing;
