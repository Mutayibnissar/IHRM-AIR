-- Private per-user study snapshot storage for IHRM AIR.
create table if not exists public.study_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_snapshots enable row level security;

create policy "Users can read their own study snapshot"
  on public.study_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert their own study snapshot"
  on public.study_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own study snapshot"
  on public.study_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.study_snapshots to authenticated;
