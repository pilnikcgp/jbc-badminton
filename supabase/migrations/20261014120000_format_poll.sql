-- Anketa o preferovaném formátu turnaje
--
-- 1. enum tournament_format a sloupec registrations.preferred_format
--    (u stávajících registrací zůstane NULL)
-- 2. register() přijímá p_format a kontroluje ho; bez platné hodnoty vrací 'invalid'
-- 3. RLS: nové registrace z webu musí formát vyplnit
-- 4. pohled format_poll_results: souhrnné počty hlasů pro aktuální ročník
--
-- Volby jednotlivých lidí se nikde nezveřejňují: registrations_public se
-- nemění a anonym nemá právo číst registrations.

-- ---------------------------------------------------------------------------
-- 1. Typ a sloupec
-- ---------------------------------------------------------------------------

-- Pořadí hodnot = pořadí možností ve formuláři i v grafu.
create type public.tournament_format as enum (
  'mixed_doubles',   -- Smíšená čtyřhra
  'gender_doubles',  -- Čtyřhra ženy / čtyřhra muži
  'mixed_singles',   -- Smíšená dvouhra
  'gender_singles'   -- Dvouhra ženy / dvouhra muži
);

alter table public.registrations
  add column preferred_format public.tournament_format;

comment on column public.registrations.preferred_format is
  'Preferovaný formát turnaje z ankety ve formuláři. U registrací vzniklých před zavedením ankety NULL.';

-- Anonym smí sloupec vyplnit při vkládání (vkládá se jen do vyjmenovaných sloupců).
grant insert (preferred_format) on public.registrations to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Funkce register() s novým parametrem
-- ---------------------------------------------------------------------------
-- Mění se seznam parametrů, proto drop + create (create or replace by
-- vytvořilo druhou přetíženou funkci). p_format má default null jen kvůli
-- krátkému přechodu: dokud běží starý frontend, jeho volání funkci najde
-- a dostane 'invalid', místo aby skončilo chybou „funkce neexistuje“.

drop function public.register(text, text, text, text, text);

create function public.register(
  p_full_name text,
  p_email     text,
  p_gender    text,
  p_format    text default null,
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
     or p_format is null
     or not (p_format = any (enum_range(null::public.tournament_format)::text[]))
     or char_length(coalesce(v_note, '')) > 500 then
    return 'invalid';
  end if;

  insert into public.registrations (edition_id, full_name, email, gender, preferred_format, note)
  values (v_edition_id, v_name, v_email, p_gender::public.gender,
          p_format::public.tournament_format, v_note);

  return 'ok';
exception
  when unique_violation then return 'duplicate_email';
  when check_violation  then return 'invalid';
  when insufficient_privilege then return 'registration_closed';
end;
$$;

revoke all on function public.register(text, text, text, text, text, text) from public;
grant execute on function public.register(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS: nová registrace z webu musí mít formát
-- ---------------------------------------------------------------------------
-- Kontrola je v politice, ne v tabulce: stávající řádky s NULL tak zůstanou
-- platné a jdou dál ručně upravovat v Supabase (service role RLS obchází).

drop policy registrations_insert_open on public.registrations;

create policy registrations_insert_open on public.registrations
  for insert to anon, authenticated
  with check (
    player_id is null
    and preferred_format is not null
    and exists (
      select 1 from public.editions e
      where e.id = edition_id and e.status = 'registration_open'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Souhrnný výsledek ankety pro aktuální ročník
-- ---------------------------------------------------------------------------
-- Vždy všechny čtyři možnosti (i s nulou hlasů), v pořadí enumu.
-- ZÁMĚRNĚ bez security_invoker (stejně jako registrations_public): pohled čte
-- registrations s právy vlastníka, ale ven pouští jen součty.

create view public.format_poll_results as
select
  o.format,
  o.position::int    as position,
  count(r.id)::int   as votes
from unnest(enum_range(null::public.tournament_format)) with ordinality as o (format, position)
left join public.registrations r
  on r.preferred_format = o.format
 and r.edition_id = (select e.id from public.editions e order by e.year desc limit 1)
group by o.format, o.position
order by o.position;

comment on view public.format_poll_results is
  'Anketa o formátu: počet hlasů pro každou možnost v aktuálním ročníku (nejvyšší year).';

grant select on public.format_poll_results to anon, authenticated;
