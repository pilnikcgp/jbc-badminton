-- Ročník 2027: uzávěrka registrace, anketa o termínu a její termíny.
-- Spustit v SQL Editoru až po migraci 20261117120000_date_poll.sql.
-- Opakovatelné: časy přepíše, termíny vloží jen ty, které ještě chybí.
-- Všechny časy jsou pražské (Europe/Prague).

update public.editions set
  registration_closes_at = '2026-12-01 00:00 Europe/Prague',  -- přihlašování do 30. 11. včetně
  date_poll_opens_at     = '2026-12-01 00:00 Europe/Prague',  -- anketa od 1. 12.
  date_poll_closes_at    = '2026-12-14 00:00 Europe/Prague'   -- hlasování do 13. 12. včetně
where year = 2027;

insert into public.date_options (edition_id, starts_at)
select e.id, v.starts_at::timestamptz
from public.editions e
cross join (values
  ('2027-01-22 16:00 Europe/Prague'),
  ('2027-01-29 16:00 Europe/Prague'),
  ('2027-02-19 16:00 Europe/Prague'),
  ('2027-02-20 09:00 Europe/Prague'),
  ('2027-02-20 16:00 Europe/Prague'),
  ('2027-03-05 16:00 Europe/Prague'),
  ('2027-03-19 16:00 Europe/Prague'),
  ('2027-03-26 16:00 Europe/Prague'),
  ('2027-03-27 09:00 Europe/Prague'),
  ('2027-03-27 16:00 Europe/Prague')
) as v (starts_at)
where e.year = 2027
on conflict (edition_id, starts_at) do nothing;

-- kontrola
select starts_at at time zone 'Europe/Prague' as termin from public.date_options o
join public.editions e on e.id = o.edition_id where e.year = 2027 order by starts_at;
