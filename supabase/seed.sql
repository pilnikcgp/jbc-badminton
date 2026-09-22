-- VYGENEROVÁNO skriptem scripts/import-history.mjs – needitovat ručně.
-- Zdroj: data/JBC_umisteni_vsechny_rocniky.xlsx
-- Ročníky: 2022, 2023, 2024, 2025, 2026 | hráčů: 36 | týmů: 38
--
-- Opakovatelné: ročníky a hráče vloží jen pokud chybí (ruční úpravy názvu,
-- termínu či stavu ročníku zůstanou), týmy importovaných ročníků přepíše.
-- Na konci ověří počty účastí a úspěšnosti proti hodnotám z Excelu.

begin;

insert into public.editions (year, title, status) values
  (2022, 'JBC 2022', 'finished'),
  (2023, 'JBC 2023', 'finished'),
  (2024, 'JBC 2024', 'finished'),
  (2025, 'JBC 2025', 'finished'),
  (2026, 'JBC 2026', 'finished')
on conflict (year) do nothing;

insert into public.players (full_name) values
  ('Adéla Drnovská'),
  ('Alexandra Bendová'),
  ('Alžběta Steiner'),
  ('Anna Římánková'),
  ('Eliška Matějová'),
  ('Hana Klicnar'),
  ('Jana Švecová'),
  ('Jaroslav Pilný'),
  ('Jiří Tobola'),
  ('Jiří Vala'),
  ('Jiří Zhoř'),
  ('Karoline Wunschová'),
  ('Katarína Adámková'),
  ('Kristina Unčovská'),
  ('Libor Hoření'),
  ('Lucie Kanioková'),
  ('Lukáš Musil'),
  ('Lukáš Veselý'),
  ('Lukáš Wiesner'),
  ('Martin Gillár'),
  ('Martin Křivánek'),
  ('Martina Michlovská'),
  ('Michaela Sagitariová'),
  ('Michaela Šmídková'),
  ('Michal Veselý'),
  ('Milad Abassi'),
  ('Milan Linkesch'),
  ('Olga Denemarková'),
  ('Pavla Olbrzymková'),
  ('Petr Dostál'),
  ('Radka Novák'),
  ('Robert Kurečka'),
  ('Romana Putnová'),
  ('Samuel Pacek'),
  ('Veronika Mašínová'),
  ('Zuzana Vintrová')
on conflict (full_name) do nothing;

delete from public.teams
where edition_id in (select id from public.editions where year in (2022, 2023, 2024, 2025, 2026));

insert into public.teams (edition_id, player_1_id, player_2_id, final_placement)
select e.id, least(a.id, b.id), greatest(a.id, b.id), v.placement
from (values
  (2022, 1, 'Jiří Tobola', 'Martina Michlovská'),
  (2022, 2, 'Kristina Unčovská', 'Petr Dostál'),
  (2022, 3, 'Robert Kurečka', 'Zuzana Vintrová'),
  (2022, 4, 'Jaroslav Pilný', 'Lucie Kanioková'),
  (2022, 5, 'Michaela Sagitariová', 'Michal Veselý'),
  (2022, 6, 'Lukáš Wiesner', 'Michaela Šmídková'),
  (2023, 1, 'Martina Michlovská', 'Michal Veselý'),
  (2023, 2, 'Jiří Vala', 'Lukáš Musil'),
  (2023, 3, 'Michaela Šmídková', 'Petr Dostál'),
  (2023, 4, 'Adéla Drnovská', 'Libor Hoření'),
  (2023, 5, 'Jana Švecová', 'Jiří Zhoř'),
  (2023, 6, 'Jaroslav Pilný', 'Jiří Tobola'),
  (2024, 1, 'Anna Římánková', 'Jiří Zhoř'),
  (2024, 2, 'Libor Hoření', 'Martina Michlovská'),
  (2024, 3, 'Lukáš Veselý', 'Olga Denemarková'),
  (2024, 4, 'Jaroslav Pilný', 'Veronika Mašínová'),
  (2024, 5, 'Alexandra Bendová', 'Jiří Vala'),
  (2024, 6, 'Hana Klicnar', 'Robert Kurečka'),
  (2024, 7, 'Eliška Matějová', 'Michal Veselý'),
  (2024, 8, 'Jana Švecová', 'Milad Abassi'),
  (2024, 9, 'Jiří Tobola', 'Katarína Adámková'),
  (2024, 10, 'Alžběta Steiner', 'Samuel Pacek'),
  (2025, 1, 'Alexandra Bendová', 'Jiří Zhoř'),
  (2025, 2, 'Jiří Vala', 'Romana Putnová'),
  (2025, 3, 'Anna Římánková', 'Milan Linkesch'),
  (2025, 4, 'Libor Hoření', 'Lucie Kanioková'),
  (2025, 5, 'Adéla Drnovská', 'Michal Veselý'),
  (2025, 6, 'Jaroslav Pilný', 'Karoline Wunschová'),
  (2025, 7, 'Katarína Adámková', 'Robert Kurečka'),
  (2025, 8, 'Martin Gillár', 'Radka Novák'),
  (2026, 1, 'Jaroslav Pilný', 'Samuel Pacek'),
  (2026, 2, 'Martina Michlovská', 'Milad Abassi'),
  (2026, 3, 'Libor Hoření', 'Radka Novák'),
  (2026, 4, 'Jiří Vala', 'Katarína Adámková'),
  (2026, 5, 'Milan Linkesch', 'Pavla Olbrzymková'),
  (2026, 6, 'Michal Veselý', 'Romana Putnová'),
  (2026, 7, 'Lucie Kanioková', 'Robert Kurečka'),
  (2026, 8, 'Karoline Wunschová', 'Martin Křivánek')
) as v (year, placement, name_a, name_b)
join public.editions e on e.year = v.year
join public.players  a on a.full_name = v.name_a
join public.players  b on b.full_name = v.name_b;

-- Kontrola: počty týmů a statistiky hráčů (jen za importované ročníky)
do $check$
declare
  v_bad text;
begin
  select string_agg(format('%s: %s místo %s týmů', x.year, coalesce(s.team_count, 0), x.team_count), '; ')
  into v_bad
  from (values (2022, 6), (2023, 6), (2024, 10), (2025, 8), (2026, 8)) as x (year, team_count)
  left join public.edition_summary s on s.year = x.year
  where s.team_count is distinct from x.team_count;
  if v_bad is not null then
    raise exception 'Nesedí počty týmů: %', v_bad;
  end if;

  with expected (full_name, participations, avg_success) as (values
    ('Adéla Drnovská', 2, 0.4142857142857143::float8),
    ('Alexandra Bendová', 2, 0.7777777777777778::float8),
    ('Alžběta Steiner', 1, 0::float8),
    ('Anna Římánková', 2, 0.8571428571428572::float8),
    ('Eliška Matějová', 1, 0.33333333333333337::float8),
    ('Hana Klicnar', 1, 0.4444444444444444::float8),
    ('Jana Švecová', 2, 0.21111111111111108::float8),
    ('Jaroslav Pilný', 5, 0.4704761904761905::float8),
    ('Jiří Tobola', 3, 0.3703703703703704::float8),
    ('Jiří Vala', 4, 0.696031746031746::float8),
    ('Jiří Zhoř', 3, 0.7333333333333334::float8),
    ('Karoline Wunschová', 2, 0.14285714285714285::float8),
    ('Katarína Adámková', 3, 0.2751322751322752::float8),
    ('Kristina Unčovská', 1, 0.8::float8),
    ('Libor Hoření', 4, 0.6436507936507936::float8),
    ('Lucie Kanioková', 3, 0.37142857142857144::float8),
    ('Lukáš Musil', 1, 0.8::float8),
    ('Lukáš Veselý', 1, 0.7777777777777778::float8),
    ('Lukáš Wiesner', 1, 0::float8),
    ('Martin Gillár', 1, 0::float8),
    ('Martin Křivánek', 1, 0::float8),
    ('Martina Michlovská', 4, 0.9365079365079365::float8),
    ('Michaela Sagitariová', 1, 0.19999999999999996::float8),
    ('Michaela Šmídková', 2, 0.3::float8),
    ('Michal Veselý', 5, 0.44952380952380955::float8),
    ('Milad Abassi', 2, 0.5396825396825398::float8),
    ('Milan Linkesch', 2, 0.5714285714285714::float8),
    ('Olga Denemarková', 1, 0.7777777777777778::float8),
    ('Pavla Olbrzymková', 1, 0.4285714285714286::float8),
    ('Petr Dostál', 2, 0.7::float8),
    ('Radka Novák', 2, 0.35714285714285715::float8),
    ('Robert Kurečka', 4, 0.33253968253968247::float8),
    ('Romana Putnová', 2, 0.5714285714285714::float8),
    ('Samuel Pacek', 2, 0.5::float8),
    ('Veronika Mašínová', 1, 0.6666666666666667::float8),
    ('Zuzana Vintrová', 1, 0.6::float8)
  ),
  actual as (
    select r.full_name, count(*)::int as participations, avg(r.success) as avg_success
    from public.player_results r
    where r.year in (2022, 2023, 2024, 2025, 2026) and r.placement is not null
    group by r.full_name
  )
  select string_agg(format('%s (Excel %s / %s, DB %s / %s)',
                           coalesce(e.full_name, a.full_name),
                           e.participations, round(e.avg_success::numeric, 6),
                           a.participations, round(a.avg_success::numeric, 6)), '; ')
  into v_bad
  from expected e
  full join actual a on a.full_name = e.full_name
  where e.full_name is null or a.full_name is null
     or e.participations <> a.participations
     or abs(e.avg_success - a.avg_success) > 1e-9;
  if v_bad is not null then
    raise exception 'Statistiky nesedí s Excelem: %', v_bad;
  end if;

  raise notice 'Import OK: 5 ročníků, 38 týmů, 36 hráčů – účasti a úspěšnosti sedí s Excelem.';
end
$check$;

commit;
