-- Jedno jméno může být v ročníku přihlášené jen jednou (stejně jako e-mail)
--
-- 1. kontrola, že v databázi už nejsou duplicitní jména (jinak srozumitelná chyba)
-- 2. unikátní index na (ročník, jméno); velikost písmen a mezery se ignorují
-- 3. register() rozliší duplicitní e-mail a jméno: 'duplicate_email' | 'duplicate_name'
--
-- Diakritika se NEignoruje: „Jiří Novák“ a „Jiri Novak“ jsou pro databázi
-- různá jména. Signatura register() se nemění, oprávnění zůstávají.
--
-- Předpoklad: už proběhla migrace 20261014140000_skill_level.sql.

-- ---------------------------------------------------------------------------
-- 1. Kontrola stávajících dat
-- ---------------------------------------------------------------------------

do $$
declare
  v_dupes text;
begin
  select string_agg(format('%s (ročník %s, %s×)', name, edition_id, n), ', ')
  into v_dupes
  from (
    select edition_id, min(full_name) as name, count(*) as n
    from public.registrations
    group by edition_id, lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g'))
    having count(*) > 1
  ) d;

  if v_dupes is not null then
    raise exception 'Duplicitní jména v registrations: %. Nejdřív smažte nadbytečné přihlášky, pak migraci spusťte znovu.', v_dupes;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Unikátní index (platí i pro vložení mimo register())
-- ---------------------------------------------------------------------------

create unique index registrations_edition_name_key
  on public.registrations (edition_id, lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')));

-- ---------------------------------------------------------------------------
-- 3. register(): rozlišení duplicitního e-mailu a jména
-- ---------------------------------------------------------------------------
-- Stejné parametry jako v 20261014140000, proto create or replace (grant
-- execute pro anon zůstává). Změněná je jen větev unique_violation.

create or replace function public.register(
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
  v_constraint text;
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
  when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    return case when v_constraint = 'registrations_edition_name_key'
                then 'duplicate_name' else 'duplicate_email' end;
  when check_violation  then return 'invalid';
  when insufficient_privilege then return 'registration_closed';
end;
$$;
