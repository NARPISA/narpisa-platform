-- LinkedIn account association and opt-in network graph data.
-- The graph MVP is intentionally based on first-party opt-in data, not the
-- restricted LinkedIn Connections API.

create table public.profile_social_accounts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  display_name text,
  email text,
  avatar_url text,
  profile_url text,
  scopes text[] not null default '{}',
  raw_identity_data jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default timezone('utc', now()),
  last_synced_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, provider),
  unique (provider, provider_subject),
  constraint profile_social_accounts_provider_not_blank check (length(trim(provider)) > 0),
  constraint profile_social_accounts_subject_not_blank check (length(trim(provider_subject)) > 0),
  constraint profile_social_accounts_raw_identity_object check (jsonb_typeof(raw_identity_data) = 'object')
);

comment on table public.profile_social_accounts is
'Verified OAuth identities linked to a NaRPISA profile. Do not store provider access tokens here.';

create table public.network_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  is_visible boolean not null default false,
  headline text,
  company text,
  role_category text,
  disciplines text[] not null default '{}',
  regions text[] not null default '{}',
  bio text,
  linkedin_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.network_profiles is
'Opt-in public mining-industry profile used by the network feature.';

create table public.network_affiliations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  company text not null,
  title text,
  affiliation_type text not null default 'current',
  starts_on date,
  ends_on date,
  is_current boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint network_affiliations_company_not_blank check (length(trim(company)) > 0),
  constraint network_affiliations_type_check check (affiliation_type in ('current', 'past', 'advisor', 'investor', 'partner'))
);

create table public.network_interests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  interest_type text not null,
  commodity_id integer references public.commodities (id) on delete cascade,
  country_id integer references public.countries (id) on delete cascade,
  site_id integer references public.sites (id) on delete cascade,
  label text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint network_interests_type_check check (interest_type in ('commodity', 'country', 'site', 'region', 'discipline')),
  constraint network_interests_label_or_reference_check check (
    label is not null
    or commodity_id is not null
    or country_id is not null
    or site_id is not null
  )
);

create unique index network_interests_unique_label_idx
  on public.network_interests (
    profile_id,
    interest_type,
    lower(coalesce(label, '')),
    coalesce(commodity_id, 0),
    coalesce(country_id, 0),
    coalesce(site_id, 0)
  );

create table public.network_connections (
  requester_profile_id uuid not null references public.profiles (id) on delete cascade,
  addressee_profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (requester_profile_id, addressee_profile_id),
  constraint network_connections_no_self check (requester_profile_id <> addressee_profile_id),
  constraint network_connections_status_check check (status in ('pending', 'accepted', 'blocked'))
);

create index profile_social_accounts_profile_idx
  on public.profile_social_accounts (profile_id);

create index network_profiles_visible_idx
  on public.network_profiles (is_visible, company, role_category);

create index network_affiliations_profile_idx
  on public.network_affiliations (profile_id);

create index network_interests_profile_idx
  on public.network_interests (profile_id, interest_type);

create index network_connections_addressee_idx
  on public.network_connections (addressee_profile_id, status);

create trigger profile_social_accounts_set_updated_at
before update on public.profile_social_accounts
for each row execute procedure public.set_updated_at();

create trigger network_profiles_set_updated_at
before update on public.network_profiles
for each row execute procedure public.set_updated_at();

create trigger network_affiliations_set_updated_at
before update on public.network_affiliations
for each row execute procedure public.set_updated_at();

create trigger network_connections_set_updated_at
before update on public.network_connections
for each row execute procedure public.set_updated_at();

alter table public.profile_social_accounts enable row level security;
alter table public.network_profiles enable row level security;
alter table public.network_affiliations enable row level security;
alter table public.network_interests enable row level security;
alter table public.network_connections enable row level security;

create policy "users can read their own linked accounts"
on public.profile_social_accounts
for select
to authenticated
using ((select auth.uid()) = profile_id);

create policy "users can insert their own linked accounts"
on public.profile_social_accounts
for insert
to authenticated
with check ((select auth.uid()) = profile_id);

create policy "users can update their own linked accounts"
on public.profile_social_accounts
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "users can delete their own linked accounts"
on public.profile_social_accounts
for delete
to authenticated
using ((select auth.uid()) = profile_id);

create policy "authenticated users can read visible network profiles"
on public.network_profiles
for select
to authenticated
using (is_visible or (select auth.uid()) = profile_id);

create policy "users can insert their own network profile"
on public.network_profiles
for insert
to authenticated
with check ((select auth.uid()) = profile_id);

create policy "users can update their own network profile"
on public.network_profiles
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "users can delete their own network profile"
on public.network_profiles
for delete
to authenticated
using ((select auth.uid()) = profile_id);

create policy "authenticated users can read visible network affiliations"
on public.network_affiliations
for select
to authenticated
using (
  exists (
    select 1
    from public.network_profiles network_profiles
    where network_profiles.profile_id = network_affiliations.profile_id
      and (network_profiles.is_visible or network_profiles.profile_id = (select auth.uid()))
  )
);

create policy "users can manage their own network affiliations"
on public.network_affiliations
for all
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "authenticated users can read visible network interests"
on public.network_interests
for select
to authenticated
using (
  exists (
    select 1
    from public.network_profiles network_profiles
    where network_profiles.profile_id = network_interests.profile_id
      and (network_profiles.is_visible or network_profiles.profile_id = (select auth.uid()))
  )
);

create policy "users can manage their own network interests"
on public.network_interests
for all
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "connection participants can read connections"
on public.network_connections
for select
to authenticated
using (
  (select auth.uid()) = requester_profile_id
  or (select auth.uid()) = addressee_profile_id
);

create policy "users can request network connections"
on public.network_connections
for insert
to authenticated
with check ((select auth.uid()) = requester_profile_id);

create policy "connection participants can update connections"
on public.network_connections
for update
to authenticated
using (
  (select auth.uid()) = requester_profile_id
  or (select auth.uid()) = addressee_profile_id
)
with check (
  (select auth.uid()) = requester_profile_id
  or (select auth.uid()) = addressee_profile_id
);

create policy "connection participants can delete connections"
on public.network_connections
for delete
to authenticated
using (
  (select auth.uid()) = requester_profile_id
  or (select auth.uid()) = addressee_profile_id
);

grant select, insert, update, delete on public.profile_social_accounts to authenticated;
grant select, insert, update, delete on public.network_profiles to authenticated;
grant select, insert, update, delete on public.network_affiliations to authenticated;
grant select, insert, update, delete on public.network_interests to authenticated;
grant select, insert, update, delete on public.network_connections to authenticated;
