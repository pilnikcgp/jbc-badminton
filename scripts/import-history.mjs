#!/usr/bin/env node
// Import historických výsledků z Excelu do SQL seedu.
//
//   npm run import:history [-- <cesta.xlsx> [<výstup.sql>]]
//
// Výchozí vstup:  data/JBC_umisteni_vsechny_rocniky.xlsx
// Výchozí výstup: supabase/seed.sql
//
// Struktura listu „List1“:
//   řádek 5  – ročníky, od sloupce M doprava (M–Q = 2022–2026)
//   řádek 6  – počty týmů
//   řádek 7+ – jméno ve sloupci H, umístění ve sloupcích ročníků
// Sloupce I (počet účastí) a J (úspěšnost) jsou vzorce – neimportují se,
// jen se jejich spočítané hodnoty použijí ke kontrole výsledku v databázi.
//
// Páry se rekonstruují z umístění: v každém ročníku musí mít každé umístění
// 1..N přesně dva hráče. Při jakémkoli porušení skript skončí chybou.
//
// Seed je opakovatelný: ročníky a hráče vkládá, jen pokud chybí, týmy
// importovaných ročníků smaže a vloží znovu. Registrace nikdy nemaže.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ExcelJS from 'exceljs';

const SHEET = 'List1';
const YEAR_ROW = 5;
const TEAM_COUNT_ROW = 6;
const FIRST_PLAYER_ROW = 7;
const NAME_COL = 'H';
const PARTICIPATIONS_COL = 'I';
const SUCCESS_COL = 'J';
const FIRST_YEAR_COL = 13; // M

// Kontrolní součty ze zadání. Nové ročníky tu být nemusí.
const EXPECTED_TEAM_COUNTS = { 2022: 6, 2023: 6, 2024: 10, 2025: 8, 2026: 8 };

const inputPath = resolve(process.argv[2] ?? 'data/JBC_umisteni_vsechny_rocniky.xlsx');
const outputPath = resolve(process.argv[3] ?? 'supabase/seed.sql');

const errors = [];
const fail = (msg) => errors.push(msg);

function cellValue(cell) {
  const v = cell.value;
  if (v && typeof v === 'object' && 'result' in v) return v.result; // vzorec
  if (v && typeof v === 'object' && 'richText' in v) return v.richText.map((t) => t.text).join('');
  return v;
}

const normalizeName = (s) => String(s).replace(/\s+/g, ' ').trim();
const sql = (s) => `'${String(s).replace(/'/g, "''")}'`;

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(inputPath);
const ws = wb.getWorksheet(SHEET);
if (!ws) {
  console.error(`List „${SHEET}“ v ${inputPath} neexistuje.`);
  process.exit(1);
}

// --- Ročníky a počty týmů --------------------------------------------------

const editions = []; // { year, col, teamCount }
for (let col = FIRST_YEAR_COL; ; col++) {
  const year = cellValue(ws.getRow(YEAR_ROW).getCell(col));
  if (year === null || year === undefined || year === '') break;
  const teamCount = cellValue(ws.getRow(TEAM_COUNT_ROW).getCell(col));
  if (!Number.isInteger(year)) fail(`Buňka ${ws.getRow(YEAR_ROW).getCell(col).address}: ročník „${year}“ není celé číslo.`);
  if (!Number.isInteger(teamCount) || teamCount < 1)
    fail(`Ročník ${year}: počet týmů „${teamCount}“ není kladné celé číslo.`);
  if (year in EXPECTED_TEAM_COUNTS && EXPECTED_TEAM_COUNTS[year] !== teamCount)
    fail(`Ročník ${year}: v Excelu je ${teamCount} týmů, kontrolní součet je ${EXPECTED_TEAM_COUNTS[year]}.`);
  editions.push({ year, col, teamCount });
}
if (editions.length === 0) fail(`Na řádku ${YEAR_ROW} od sloupce M nejsou žádné ročníky.`);
for (const y of Object.keys(EXPECTED_TEAM_COUNTS).map(Number))
  if (!editions.some((e) => e.year === y)) fail(`V Excelu chybí ročník ${y}.`);

// --- Hráči a umístění ------------------------------------------------------

const players = []; // { name, placements: {year: n}, excelParticipations, excelSuccess }
const seenNames = new Set();
for (let r = FIRST_PLAYER_ROW; r <= ws.rowCount; r++) {
  const row = ws.getRow(r);
  const rawName = cellValue(row.getCell(NAME_COL));
  const placements = {};
  for (const e of editions) {
    const v = cellValue(row.getCell(e.col));
    if (v === null || v === undefined || v === '') continue;
    if (!Number.isInteger(v) || v < 1)
      fail(`Buňka ${row.getCell(e.col).address}: umístění „${v}“ není kladné celé číslo.`);
    placements[e.year] = v;
  }
  if (rawName === null || rawName === undefined || String(rawName).trim() === '') {
    if (Object.keys(placements).length) fail(`Řádek ${r}: umístění bez jména.`);
    continue;
  }
  const name = normalizeName(rawName);
  if (seenNames.has(name)) fail(`Hráč „${name}“ je v Excelu vícekrát.`);
  seenNames.add(name);
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  players.push({
    name,
    placements,
    excelParticipations: num(cellValue(row.getCell(PARTICIPATIONS_COL))),
    excelSuccess: num(cellValue(row.getCell(SUCCESS_COL))),
  });
}

// --- Rekonstrukce párů -----------------------------------------------------

const teams = []; // { year, placement, a, b }
for (const e of editions) {
  const byPlacement = new Map();
  for (const p of players) {
    const pl = p.placements[e.year];
    if (pl === undefined) continue;
    if (!byPlacement.has(pl)) byPlacement.set(pl, []);
    byPlacement.get(pl).push(p.name);
  }
  for (let pl = 1; pl <= e.teamCount; pl++) {
    const names = byPlacement.get(pl) ?? [];
    if (names.length !== 2)
      fail(`Ročník ${e.year}, ${pl}. místo: očekávám 2 hráče, nalezeno ${names.length}${names.length ? ` (${names.join(', ')})` : ''}.`);
    else teams.push({ year: e.year, placement: pl, a: names[0], b: names[1] });
  }
  for (const pl of byPlacement.keys())
    if (pl > e.teamCount) fail(`Ročník ${e.year}: umístění ${pl} je větší než počet týmů (${e.teamCount}).`);
}

if (errors.length) {
  console.error(`Import selhal (${errors.length} chyb):`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

// --- Očekávané statistiky (pro kontrolu v seedu) ----------------------------

const teamCountByYear = Object.fromEntries(editions.map((e) => [e.year, e.teamCount]));
const expected = players.map((p) => {
  const years = Object.keys(p.placements);
  const computedSuccess = years.length
    ? years.reduce((s, y) => s + (1 - (p.placements[y] - 1) / (teamCountByYear[y] - 1)), 0) / years.length
    : null;
  if (p.excelParticipations !== null && p.excelParticipations !== years.length)
    fail(`„${p.name}“: Excel uvádí ${p.excelParticipations} účastí, z umístění vychází ${years.length}.`);
  if (p.excelSuccess !== null && computedSuccess !== null && Math.abs(p.excelSuccess - computedSuccess) > 1e-9)
    fail(`„${p.name}“: Excel uvádí úspěšnost ${p.excelSuccess}, z umístění vychází ${computedSuccess}.`);
  return {
    name: p.name,
    participations: years.length,
    success: p.excelSuccess ?? computedSuccess,
  };
});
if (errors.length) {
  console.error('Excel je vnitřně nekonzistentní:');
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

// --- Generování SQL --------------------------------------------------------

const years = editions.map((e) => e.year);
const out = [];
out.push(`-- VYGENEROVÁNO skriptem scripts/import-history.mjs – needitovat ručně.
-- Zdroj: ${inputPath.split('/').slice(-2).join('/')}
-- Ročníky: ${years.join(', ')} | hráčů: ${players.length} | týmů: ${teams.length}
--
-- Opakovatelné: ročníky a hráče vloží jen pokud chybí (ruční úpravy názvu,
-- termínu či stavu ročníku zůstanou), týmy importovaných ročníků přepíše.
-- Na konci ověří počty účastí a úspěšnosti proti hodnotám z Excelu.

begin;

insert into public.editions (year, title, status) values
${editions.map((e) => `  (${e.year}, ${sql(`JBC ${e.year}`)}, 'finished')`).join(',\n')}
on conflict (year) do nothing;

insert into public.players (full_name) values
${players.map((p) => `  (${sql(p.name)})`).join(',\n')}
on conflict (full_name) do nothing;

delete from public.teams
where edition_id in (select id from public.editions where year in (${years.join(', ')}));

insert into public.teams (edition_id, player_1_id, player_2_id, final_placement)
select e.id, least(a.id, b.id), greatest(a.id, b.id), v.placement
from (values
${teams.map((t) => `  (${t.year}, ${t.placement}, ${sql(t.a)}, ${sql(t.b)})`).join(',\n')}
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
  from (values ${editions.map((e) => `(${e.year}, ${e.teamCount})`).join(', ')}) as x (year, team_count)
  left join public.edition_summary s on s.year = x.year
  where s.team_count is distinct from x.team_count;
  if v_bad is not null then
    raise exception 'Nesedí počty týmů: %', v_bad;
  end if;

  with expected (full_name, participations, avg_success) as (values
${expected.map((x) => `    (${sql(x.name)}, ${x.participations}, ${x.success === null ? 'null::float8' : `${x.success}::float8`})`).join(',\n')}
  ),
  actual as (
    select r.full_name, count(*)::int as participations, avg(r.success) as avg_success
    from public.player_results r
    where r.year in (${years.join(', ')}) and r.placement is not null
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

  raise notice 'Import OK: ${editions.length} ročníků, ${teams.length} týmů, ${players.length} hráčů – účasti a úspěšnosti sedí s Excelem.';
end
$check$;

commit;
`);

writeFileSync(outputPath, out.join(''));
console.log(`Zapsáno ${outputPath}: ${editions.length} ročníků (${years.join(', ')}), ${players.length} hráčů, ${teams.length} týmů.`);
