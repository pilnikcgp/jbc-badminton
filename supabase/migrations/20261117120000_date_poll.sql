-- Anketa o termínu turnaje + automatická uzávěrka registrace
--
-- 1. editions: registration_closes_at, date_poll_opens_at, date_poll_closes_at
--    (vše nepovinné; NULL = bez automatiky) a jejich doplnění do current_edition
-- 2. registrace se po registration_closes_at sama uzavře (trigger)
-- 3. tabulky date_options (termíny) a date_votes (odpovědi můžu / v nouzi / nemůžu)
-- 4. funkce vote_dates(): hlasovat smí jen přihlášený e-mail aktuálního ročníku,
--    jeden hlas na osobu, opakované odeslání ho přepíše
-- 5. pohled date_poll_results: jen součty u termínů
--
-- Kdo jak hlasoval, se nezveřejňuje: anonym nesmí číst date_votes ani
-- registrations, vidí jen součty. Organizátoři vidí detail v Supabase.
--
-- Konkrétní termíny a data ročníku 2027 vkládá zvlášť supabase/date_poll_2027.sql.

-- ---------------------------------------------------------------------------
-- 1. Časy u ročníku
-- ---------------------------------------------------------------------------

alter table public.editions
  add column registration_closes_at timestamptz,
  add column date_poll_opens_at     timestamptz,
  add column date_poll_closes_at    timestamptz,
  add constraint editions_date_poll_window_check
    check (date_poll_closes_at is null or date_poll_opens_at is null
           or date_poll_closes_at > date_poll_opens_at);

comment on column public.editions.registration_closes_at is
  'Od tohoto okamžiku web nové registrace nepřijme (NULL = jen podle status).';
comment on column public.editions.date_poll_opens_at is
  'Od kdy jde hlasovat o termínu (NULL = anketa o termínu vypnutá).';
comment on column public.editions.date_poll_closes_at is
  'Do kdy (bez tohoto okamžiku) jde hlasovat o termínu (NULL = bez konce).';

-- Nové sloupce na konec pohledu (create or replace smí sloupce jen přidávat).
create or replace view public.current_edition
with (security_invoker = true) as
select id, year, title, date, venue, status, poll_url,
       registration_closes_at, date_poll_opens_at, date_poll_closes_at
from public.editions
order by year desc
limit 1;

-- ---------------------------------------------------------------------------
-- 2. Automatická uzávěrka registrace
-- ---------------------------------------------------------------------------
-- Platí jen pro web (role anon/authenticated); organizátoři v Supabase můžou
-- přihlášku vložit i po uzávěrce. register() chybu insufficient_privilege
-- převádí na 'registration_closed', takže se funkce měnit nemusí.

create function public.registrations_check_deadline()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and exists (
    select 1 from public.editions e
    where e.id = new.edition_id
      and e.registration_closes_at is not null
      and now() >= e.registration_closes_at
  ) then
    raise exception 'Registrace do tohoto ročníku je uzavřená.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger registrations_check_deadline
  before insert on public.registrations
  for each row execute function public.registrations_check_deadline();

-- ---------------------------------------------------------------------------
-- 3. Termíny a odpovědi
-- ---------------------------------------------------------------------------

create type public.date_answer as enum ('yes', 'maybe', 'no');  -- můžu / v nouzi / nemůžu

create table public.date_options (
  id         bigint generated always as identity primary key,
  edition_id bigint not null references public.editions (id) on delete cascade,
  starts_at  timestamptz not null,
  unique (edition_id, starts_at)
);

comment on table public.date_options is
  'Termíny v anketě o termínu turnaje. Přidávat a mazat jde přímo v Supabase.';

create table public.date_votes (
  registration_id bigint not null references public.registrations (id) on delete cascade,
  option_id       bigint not null references public.date_options (id) on delete cascade,
  answer          public.date_answer not null,
  updated_at      timestamptz not null default now(),
  primary key (registration_id, option_id)
);

create index date_votes_option_id_idx on public.date_votes (option_id);

comment on table public.date_votes is
  'Odpovědi v anketě o termínu: jeden řádek = jeden přihlášený a jeden termín. NEVEŘEJNÉ.';

-- Jen přes vote_dates() a date_poll_results; přímý přístup z webu žádný.
alter table public.date_options enable row level security;
alter table public.date_votes   enable row level security;
revoke all on public.date_options, public.date_votes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Hlasování
-- ---------------------------------------------------------------------------
-- p_votes = {"<id termínu>": "yes" | "maybe" | "no", ...}, odpověď u všech
-- termínů aktuálního ročníku. Vrací:
--   'ok' | 'not_registered' | 'poll_closed' | 'invalid'
-- Běží s právy vlastníka, protože anonym nesmí číst registrations (e-mail
-- se jen porovná, nikam se nevrací).

create function public.vote_dates(
  p_email   text,
  p_votes   jsonb,
  p_website text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edition public.editions;
  v_reg_id  bigint;
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_options int;
  v_valid   int;
begin
  -- honeypot: boti dostanou 'ok', nic se neuloží
  if nullif(btrim(coalesce(p_website, '')), '') is not null then
    return 'ok';
  end if;

  select * into v_edition
  from public.editions e
  order by e.year desc
  limit 1;

  if v_edition.id is null
     or v_edition.date_poll_opens_at is null
     or now() < v_edition.date_poll_opens_at
     or (v_edition.date_poll_closes_at is not null and now() >= v_edition.date_poll_closes_at) then
    return 'poll_closed';
  end if;

  if jsonb_typeof(p_votes) is distinct from 'object' then
    return 'invalid';
  end if;

  select r.id into v_reg_id
  from public.registrations r
  where r.edition_id = v_edition.id and lower(r.email) = v_email;

  if v_reg_id is null then
    return 'not_registered';
  end if;

  -- odpověď musí být u každého termínu ročníku a nic navíc
  select count(*) into v_options
  from public.date_options o
  where o.edition_id = v_edition.id;

  select count(*) into v_valid
  from jsonb_each_text(p_votes) v
  join public.date_options o
    on o.id::text = v.key and o.edition_id = v_edition.id
  where v.value in ('yes', 'maybe', 'no');

  if v_options = 0
     or v_valid <> v_options
     or (select count(*) from jsonb_object_keys(p_votes)) <> v_options then
    return 'invalid';
  end if;

  delete from public.date_votes where registration_id = v_reg_id;

  insert into public.date_votes (registration_id, option_id, answer)
  select v_reg_id, v.key::bigint, v.value::public.date_answer
  from jsonb_each_text(p_votes) v;

  return 'ok';
end;
$$;

revoke all on function public.vote_dates(text, jsonb, text) from public;
grant execute on function public.vote_dates(text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Souhrn pro web
-- ---------------------------------------------------------------------------

create view public.date_poll_results as
select
  o.id                                             as option_id,
  o.starts_at,
  count(v.answer) filter (where v.answer = 'yes')::int   as yes,
  count(v.answer) filter (where v.answer = 'maybe')::int as maybe,
  count(v.answer) filter (where v.answer = 'no')::int    as no,
  (select count(distinct dv.registration_id)
     from public.date_votes dv
     join public.date_options d2 on d2.id = dv.option_id
    where d2.edition_id = e.id)::int               as voters,
  e.date_poll_opens_at                             as opens_at,
  e.date_poll_closes_at                            as closes_at
from public.editions e
join public.date_options o on o.edition_id = e.id
left join public.date_votes v on v.option_id = o.id
where e.id = (select e2.id from public.editions e2 order by e2.year desc limit 1)
group by o.id, o.starts_at, e.id, e.date_poll_opens_at, e.date_poll_closes_at
order by o.starts_at;

comment on view public.date_poll_results is
  'Anketa o termínu: součty odpovědí u termínů aktuálního ročníku (nejvyšší year). '
  'Záměrně běží s právy vlastníka: NEPŘEPÍNAT na security_invoker, jinak se anketa '
  'nenačte (anonym nesmí číst date_votes ani date_options).';

grant select on public.date_poll_results to anon, authenticated;
