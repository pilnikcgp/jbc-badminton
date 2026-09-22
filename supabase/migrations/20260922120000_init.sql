-- JBC badminton – výchozí schéma (fáze 1, připraveno na fáze 2 a 3)
--
-- Tabulky:  editions, players, teams, registrations
-- Pohledy:  current_edition, edition_summary, player_results, player_stats,
--           registrations_public
-- Funkce:   register() – jediný doporučený vstup pro registraci z webu
--
-- Fáze 3 přidá tabulku zápasů navázanou na teams.id a politiky pro admina.

-- ---------------------------------------------------------------------------
-- Typy
-- ---------------------------------------------------------------------------

create type public.edition_status as enum (
  'planned',
  'registration_open',
  'registration_closed',
  'in_progress',
  'finished'
);

create type public.gender as enum ('male', 'female');

-- ---------------------------------------------------------------------------
-- Tabulky
-- ---------------------------------------------------------------------------

create table public.editions (
  id         bigint generated always as identity primary key,
  year       smallint not null unique check (year between 2000 and 2100),
  title      text not null check (char_length(btrim(title)) > 0),
  date       date,                                -- null = „Termín vybíráme“
  venue      text,
  status     public.edition_status not null default 'planned',
  poll_url   text,                                -- fáze 2: anketa na termín
  created_at timestamptz not null default now()
);

comment on table public.editions is 'Ročník turnaje. Aktuální ročník = nejvyšší year.';

create table public.players (
  id         bigint generated always as identity primary key,
  full_name  text not null unique check (char_length(btrim(full_name)) > 0),
  created_at timestamptz not null default now()
);

comment on table public.players is 'Hráč/hráčka. full_name je unikátní kvůli opakovatelnému importu.';

create table public.teams (
  id              bigint generated always as identity primary key,
  edition_id      bigint not null references public.editions (id) on delete cascade,
  player_1_id     bigint not null references public.players (id) on delete restrict,
  player_2_id     bigint not null references public.players (id) on delete restrict,
  final_placement smallint check (final_placement > 0),   -- null = ještě nedohráno
  created_at      timestamptz not null default now(),
  -- Kanonické pořadí: pár A+B má jediný možný zápis.
  constraint teams_players_ordered check (player_1_id < player_2_id)
);

comment on table public.teams is
  'Pár v ročníku. Unikátnost umístění záměrně nevynucujeme (dělená místa ve fázi 3); hlídá ji import.';

create index teams_edition_id_idx  on public.teams (edition_id);
create index teams_player_1_id_idx on public.teams (player_1_id);
create index teams_player_2_id_idx on public.teams (player_2_id);

-- Hráč smí být v jednom ročníku nejvýš v jednom týmu.
create function public.teams_check_player_once_per_edition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.teams t
    where t.edition_id = new.edition_id
      and t.id <> new.id
      and (t.player_1_id in (new.player_1_id, new.player_2_id)
        or t.player_2_id in (new.player_1_id, new.player_2_id))
  ) then
    raise exception 'Hráč už je v ročníku % v jiném týmu', new.edition_id
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

create trigger teams_player_once_per_edition
  before insert or update of edition_id, player_1_id, player_2_id on public.teams
  for each row execute function public.teams_check_player_once_per_edition();

create table public.registrations (
  id         bigint generated always as identity primary key,
  edition_id bigint not null references public.editions (id) on delete restrict,
  full_name  text not null check (char_length(btrim(full_name)) between 2 and 100),
  email      text not null check (
               char_length(email) <= 254
               and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
             ),
  gender     public.gender not null,
  note       text check (note is null or char_length(note) <= 500),
  player_id  bigint references public.players (id) on delete set null,  -- fáze 3
  created_at timestamptz not null default now()
);

comment on table public.registrations is
  'Přihlášky. Anonym smí jen vkládat (do otevřeného ročníku); číst surová data nesmí nikdo kromě service role.';

create unique index registrations_edition_email_key
  on public.registrations (edition_id, lower(email));

-- ---------------------------------------------------------------------------
-- Pohledy
-- ---------------------------------------------------------------------------
-- Všechny kromě registrations_public běží s právy volajícího (security_invoker),
-- takže na ně platí RLS podkladových tabulek.

create view public.current_edition
with (security_invoker = true) as
select id, year, title, date, venue, status, poll_url
from public.editions
order by year desc
limit 1;

create view public.edition_summary
with (security_invoker = true) as
select
  e.id                                                   as edition_id,
  e.year,
  e.title,
  count(t.id)::int                                       as team_count,
  coalesce(bool_or(t.final_placement is not null), false) as has_results
from public.editions e
left join public.teams t on t.edition_id = e.id
group by e.id, e.year, e.title;

-- Jeden řádek = jeden hráč v jednom ročníku (včetně spoluhráče a úspěšnosti).
create view public.player_results
with (security_invoker = true) as
with team_counts as (
  select edition_id, count(*)::int as team_count
  from public.teams
  group by edition_id
),
memberships as (
  select id as team_id, edition_id, final_placement, player_1_id as player_id, player_2_id as partner_id
  from public.teams
  union all
  select id, edition_id, final_placement, player_2_id, player_1_id
  from public.teams
)
select
  m.player_id,
  p.full_name,
  e.id               as edition_id,
  e.year,
  m.team_id,
  m.final_placement  as placement,
  tc.team_count,
  m.partner_id,
  partner.full_name  as partner_name,
  (1 - (m.final_placement - 1)::float8 / nullif(tc.team_count - 1, 0)) as success
from memberships m
join public.players  p       on p.id = m.player_id
join public.players  partner on partner.id = m.partner_id
join public.editions e       on e.id = m.edition_id
join team_counts     tc      on tc.edition_id = m.edition_id;

-- Souhrn za hráče: počítají se jen ročníky s vyplněným umístěním.
create view public.player_stats
with (security_invoker = true) as
select
  p.id                    as player_id,
  p.full_name,
  count(r.placement)::int as participations,
  avg(r.success)          as avg_success
from public.players p
left join public.player_results r
  on r.player_id = p.id and r.placement is not null
group by p.id, p.full_name;

-- Veřejný seznam přihlášených v aktuálním ročníku.
-- ZÁMĚRNĚ bez security_invoker: pohled čte registrations s právy vlastníka,
-- aby anonym viděl jména, ale nikdy ne e-maily ani poznámky.
create view public.registrations_public as
select r.full_name, r.gender, r.created_at
from public.registrations r
where r.edition_id = (select e.id from public.editions e order by e.year desc limit 1)
order by r.created_at;

-- ---------------------------------------------------------------------------
-- Registrace přes RPC
-- ---------------------------------------------------------------------------
-- Vrací: 'ok' | 'duplicate_email' | 'registration_closed' | 'invalid'.
-- Běží s právy volajícího, takže vložení pořád hlídá RLS politika níže.
-- p_website je honeypot: vyplněný = bot, tiše vrátíme 'ok' a nic neuložíme.

create function public.register(
  p_full_name text,
  p_email     text,
  p_gender    text,
  p_note      text default null,
  p_website   text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_edition_id bigint;
  v_status     public.edition_status;
  v_name       text := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_email      text := lower(btrim(coalesce(p_email, '')));
  v_note       text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if nullif(btrim(coalesce(p_website, '')), '') is not null then
    return 'ok';
  end if;

  select e.id, e.status into v_edition_id, v_status
  from public.editions e
  order by e.year desc
  limit 1;

  if v_edition_id is null or v_status <> 'registration_open' then
    return 'registration_closed';
  end if;

  if char_length(v_name) not between 2 and 100
     or char_length(v_email) > 254
     or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or coalesce(p_gender, '') not in ('male', 'female')
     or char_length(coalesce(v_note, '')) > 500 then
    return 'invalid';
  end if;

  insert into public.registrations (edition_id, full_name, email, gender, note)
  values (v_edition_id, v_name, v_email, p_gender::public.gender, v_note);

  return 'ok';
exception
  when unique_violation then return 'duplicate_email';
  when check_violation  then return 'invalid';
  when insufficient_privilege then return 'registration_closed';
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.editions      enable row level security;
alter table public.players       enable row level security;
alter table public.teams         enable row level security;
alter table public.registrations enable row level security;

create policy editions_read on public.editions
  for select to anon, authenticated using (true);

create policy players_read on public.players
  for select to anon, authenticated using (true);

create policy teams_read on public.teams
  for select to anon, authenticated using (true);

create policy registrations_insert_open on public.registrations
  for insert to anon, authenticated
  with check (
    player_id is null
    and exists (
      select 1 from public.editions e
      where e.id = edition_id and e.status = 'registration_open'
    )
  );

-- ---------------------------------------------------------------------------
-- Oprávnění
-- ---------------------------------------------------------------------------
-- Supabase standardně dává anon/authenticated všechna práva na tabulky v public
-- a RLS je pak jediná ochrana. Tady je odebereme a povolíme jen potřebné.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on public.editions, public.players, public.teams to anon, authenticated;

-- Vkládat jde jen do vyjmenovaných sloupců (ne player_id, ne created_at).
grant insert (edition_id, full_name, email, gender, note)
  on public.registrations to anon, authenticated;

grant select on
  public.current_edition,
  public.edition_summary,
  public.player_results,
  public.player_stats,
  public.registrations_public
to anon, authenticated;

grant execute on function public.register(text, text, text, text, text) to anon, authenticated;
