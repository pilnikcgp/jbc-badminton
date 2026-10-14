-- Úroveň hráče/hráčky ve formuláři (pro los vyrovnaných párů)
--
-- 1. enum skill_level a sloupec registrations.skill_level
--    (u stávajících registrací zůstane NULL)
-- 2. register() přijímá p_level a kontroluje ho; bez platné hodnoty vrací 'invalid'
-- 3. RLS: nové registrace z webu musí úroveň vyplnit
-- 4. znovu grant execute na novou funkci
--
-- Úroveň je NEVEŘEJNÁ: nepřidává se do žádného pohledu (registrations_public,
-- format_poll_results ani jiného) a anonym nesmí číst tabulku registrations.
-- Vidí ji jen organizátoři v Supabase.
--
-- Předpoklad: už proběhla migrace 20261014120000_format_poll.sql.

-- ---------------------------------------------------------------------------
-- 1. Typ a sloupec
-- ---------------------------------------------------------------------------

-- Pořadí hodnot = pořadí možností ve formuláři (od nejmenší zkušenosti).
create type public.skill_level as enum (
  'none',          -- Nepopsaný list (badminton jsem nikdy nehrál/a)
  'beginner',      -- Začátečník (raketu jsem držel/a párkrát v ruce)
  'intermediate',  -- Středně pokročilý (jdu si zahrát párkrát do roka)
  'advanced'       -- Pokročilý (hraji pravidelně)
);

alter table public.registrations
  add column skill_level public.skill_level;

comment on column public.registrations.skill_level is
  'Úroveň z formuláře, pro los vyrovnaných párů. NEVEŘEJNÁ – nepatří do žádného pohledu. '
  'U registrací vzniklých před zavedením otázky NULL.';

-- Anonym smí sloupec vyplnit při vkládání (vkládá se jen do vyjmenovaných sloupců).
grant insert (skill_level) on public.registrations to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Funkce register() s novým parametrem
-- ---------------------------------------------------------------------------
-- Mění se seznam parametrů, proto drop + create. p_level má default null jen
-- kvůli přechodu (stejně jako p_format); chybějící hodnotu funkce odmítne.

drop function public.register(text, text, text, text, text, text);

create function public.register(
  p_full_name text,
  p_email     text,
  p_gender    text,
  p_format    text default null,
  p_level     text default null,
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
     or p_level is null
     or not (p_level = any (enum_range(null::public.skill_level)::text[]))
     or char_length(coalesce(v_note, '')) > 500 then
    return 'invalid';
  end if;

  insert into public.registrations
    (edition_id, full_name, email, gender, preferred_format, skill_level, note)
  values
    (v_edition_id, v_name, v_email, p_gender::public.gender,
     p_format::public.tournament_format, p_level::public.skill_level, v_note);

  return 'ok';
exception
  when unique_violation then return 'duplicate_email';
  when check_violation  then return 'invalid';
  when insufficient_privilege then return 'registration_closed';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS: nová registrace z webu musí mít formát i úroveň
-- ---------------------------------------------------------------------------
-- Kontrola je v politice, ne v tabulce: stávající řádky s NULL zůstanou platné
-- a jdou dál ručně upravovat v Supabase (service role RLS obchází).

drop policy registrations_insert_open on public.registrations;

create policy registrations_insert_open on public.registrations
  for insert to anon, authenticated
  with check (
    player_id is null
    and preferred_format is not null
    and skill_level is not null
    and exists (
      select 1 from public.editions e
      where e.id = edition_id and e.status = 'registration_open'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Oprávnění k nové funkci (drop function je odebral)
-- ---------------------------------------------------------------------------

revoke all on function public.register(text, text, text, text, text, text, text) from public;
grant execute on function public.register(text, text, text, text, text, text, text) to anon, authenticated;
