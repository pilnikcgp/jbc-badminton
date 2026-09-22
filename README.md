# JBC badminton

Interní web badmintonového turnaje JBC ve smíšené čtyřhře: hero, představení,
registrace s veřejným seznamem, fotogalerie a historická tabulka umístění.

- **Frontend:** Vite + TypeScript bez frameworku, texty v `src/config.ts`
- **Backend:** Supabase (Postgres, Row Level Security)
- **Hosting:** Netlify (`netlify.toml`)

Web je neveřejný: `<meta name="robots" content="noindex">` a hlavička
`X-Robots-Tag: noindex` na Netlify.

## Obsah

1. [Založení Supabase projektu](#1-založení-supabase-projektu)
2. [Proměnné prostředí a lokální vývoj](#2-proměnné-prostředí-a-lokální-vývoj)
3. [Otevření a uzavření registrace](#3-otevření-a-uzavření-registrace)
4. [Úprava textů](#4-úprava-textů)
5. [Fotky: galerie a hero](#5-fotky-galerie-a-hero)
6. [Nasazení na Netlify](#6-nasazení-na-netlify)
7. [Historická data](#7-historická-data)
8. [Struktura databáze](#8-struktura-databáze)
9. [Vizuál (identita JIC)](#vizuál-identita-jic)

---

## 1. Založení Supabase projektu

1. [supabase.com](https://supabase.com) → **New project**. Region *Central EU (Frankfurt)*,
   heslo k databázi si uložte (web ho nepotřebuje). Data API nechte zapnuté.
2. **SQL Editor → New query** → vložte celý soubor
   `supabase/migrations/20260922120000_init.sql` → **Run**.
   Vytvoří tabulky, pohledy, RLS a funkci `register()`.
3. Nový dotaz → vložte celý `supabase/seed.sql` → **Run**. Nahraje ročníky
   2022–2026, hráče a páry. Na konci sám ověří počty účastí a úspěšnosti proti
   Excelu; při neshodě skončí chybou a nic neuloží. Výsledek „Success. No rows
   returned“ je v pořádku.
4. Kontrola (má vyjít 5 ročníků, 36 hráčů, 38 týmů):
   ```sql
   select (select count(*) from editions) rocniky,
          (select count(*) from players)  hraci,
          (select count(*) from teams)    tymy;
   ```

> **Uspávání:** bezplatný projekt se po zhruba týdnu bez provozu uspí a web
> pak nenačte data. Brání tomu GitHub Actions workflow
> `.github/workflows/supabase-keepalive.yml`, který v pondělí a ve čtvrtek pošle
> jeden čtecí dotaz. Když selže, GitHub pošle e-mail; projekt pak v Supabase
> probuďte (*Restore project*). Ručně ho spustíte v *Actions → Supabase
> keep-alive → Run workflow*. Při změně anon klíče ho aktualizujte i ve workflow.

## 2. Proměnné prostředí a lokální vývoj

Web potřebuje dvě proměnné. Najdete je v Supabase v **Project Settings → API**
(v novějším rozhraní *API Keys* a *Data API*, případně tlačítko *Connect*):

| Proměnná | Hodnota |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` (bez `/rest/v1` a bez lomítka na konci) |
| `VITE_SUPABASE_ANON_KEY` | klíč **anon / public** (začíná `eyJ…`, záložka *Legacy API keys*) |

Anon klíč je veřejný: skončí v JavaScriptu stránky a data chrání RLS.
**Nikdy nepoužívejte `service_role` (secret) klíč**, ten RLS obchází.

Lokálně:

```bash
cp .env.example .env.local      # doplňte obě hodnoty
npm install
npm run dev                     # http://localhost:5173
npm run build                   # kontrola typů + produkční build do dist/
```

## 3. Otevření a uzavření registrace

Registrace se vždy týká **aktuálního ročníku = ročníku s nejvyšším `year`**
v tabulce `editions`. Web podle jeho stavu (`status`) zobrazí formulář, nebo
hlášku, že registrace je uzavřená.

**Před otevřením registrace je potřeba založit nový ročník v `editions`
se stavem `registration_open`.** V Supabase → SQL Editor:

```sql
insert into editions (year, title, status)
values (2027, 'JBC 2027', 'registration_open');
```

(Nebo v *Table Editor → editions → Insert row*.)

| Akce | SQL |
|---|---|
| Doplnit termín a místo | `update editions set date = '2027-03-14', venue = 'Hala X, Brno' where year = 2027;` |
| Uzavřít registraci | `update editions set status = 'registration_closed' where year = 2027;` |
| Znovu otevřít | `update editions set status = 'registration_open' where year = 2027;` |
| Ročník bez registrace | stav `planned`: web ukáže „Registrace zatím není otevřená“ |
| Po turnaji | `update editions set status = 'finished' where year = 2027;` |

Stavy: `planned` → `registration_open` → `registration_closed` → `in_progress` → `finished`.
Změna se na webu projeví hned po obnovení stránky, deploy není potřeba.

**Přihlášky** (včetně e-mailů a poznámek) vidíte jen v Supabase, web je nikdy
nevrací:

```sql
select full_name, email, gender, note, created_at
from registrations
where edition_id = (select id from editions where year = 2027)
order by created_at;
```

Opravy a mazání přihlášek dělejte také v Supabase (Table Editor nebo SQL).
Jeden e-mail může být v ročníku přihlášený jen jednou (velikost písmen se ignoruje).

## 4. Úprava textů

Všechny texty jsou v **`src/config.ts`**: název akce, podtitul, odstavce
představení, formát turnaje, hlášky formuláře a nadpisy sekcí. Upravte, commitněte
a pushněte do `main`, Netlify web nasadí samo.

Termín, místo a název ročníku (nadpis v hero) se berou z tabulky `editions`
(viz bod 3). Texty „Termín vybíráme“ a „Místo upřesníme“ se zobrazí, dokud
v databázi chybí.

## 5. Fotky: galerie a hero

### Galerie

1. Originální fotky (JPG, PNG, HEIC, …) vložte do složky `gallery-originals/`.
   Složka není v gitu, originály mohou být velké.
2. Spusťte:
   ```bash
   npm run gallery
   ```
   Skript vytvoří WebP náhledy (`public/gallery/thumb/`, šířka 640 px) a plné
   velikosti (`public/gallery/full/`, delší strana max. 2000 px), otočí fotky
   podle EXIF, zahodí metadata včetně GPS a zapíše `public/gallery/manifest.json`.
   Už zpracované fotky přeskočí.
3. Commitněte obsah `public/gallery/` a pushněte.

- Pořadí v galerii je abecední podle názvu souboru (`01-…`, `02-…`).
- Popisky (volitelné): `gallery-originals/popisky.json`, např.
  `{ "01-finale.jpg": "Finále 2026" }`.
- Web zobrazuje přesně fotky, které jsou v `gallery-originals/`: co tam chybí,
  skript z `public/gallery/` odstraní. Zástupné fotky `foto-01` až `foto-08`
  proto zmizí samy při prvním spuštění se skutečnými fotkami.

### Hero fotka

Nahraďte `public/hero.jpg` (na šířku, ideálně cca 2400 px a do 400 kB, např.
přes [squoosh.app](https://squoosh.app)). Podle manuálu JIC: autentický moment,
vždy s lidmi, pozitivní emoce, lidé blízko u sebe, žádné prázdné sportoviště.
Plocha s názvem leží vedle fotky (desktop) nebo pod ní (mobil, tablet), takže
fotka může být i skupinová přes celou šířku. Pixelové čtverce překrývají jen
rohy fotky: na desktopu oba horní rohy, na mobilu oba dolní. V těch místech má
být zeď nebo podlaha, ne obličeje. Při výměně fotky projděte hero na mobilu
i na desktopu; případně upravte pozice čtverců (`.px-photo-*`, `.px-step-*`)
a výřez (`object-position` u `.hero-image`) v `src/styles.css`. Popis pro
čtečky obrazovky: `hero.imageAlt` v `src/config.ts`.

## Vizuál (identita JIC)

Vzhled vychází z *Design manuálu JIC 2.0*. Pravidla jsou v `src/styles.css`
(tokeny na začátku souboru):

- Fialová `#640ABA` pro texty, tlačítka a logo; lila, modrá, zelená, žlutá,
  korálová a růžová jen jako pozadí. Bílý text jen na fialové.
- Sekce střídají bílou a lila; oddělovače a hero tvoří čtverce pixelové mřížky
  (5 čtverců na kratší stranu hero). Ostré rohy, žádné stíny, jen světlý režim.
- **Písma:** zatím volné náhrady z Google Fonts – Archivo za GT America,
  Fraunces za GT Super Display. Po potvrzení webové licence brandových písem
  přidejte jejich `@font-face` (soubory `.woff2` do `public/fonts/`) a upravte
  proměnné `--font-sans` a `--font-display` v `src/styles.css`; odkaz na Google
  Fonts v `index.html` pak smažte.
- **Logo JIC v patičce:** soubor z brand kitu (složka `02_Logo`, ideálně SVG)
  uložte do `public/brand/` a v `src/config.ts` nastavte `footer.logo`, např.
  `'/brand/jic-logo.svg'`. Dokud tam logo není, zobrazí se textový odkaz „JIC“.
  Logo se nesmí deformovat ani přebarvovat.

## 6. Nasazení na Netlify

1. Netlify → **Add new site → Import an existing project → GitHub** →
   `pilnikcgp/jbc-badminton`. Build se načte z `netlify.toml`
   (`npm run build`, složka `dist`, Node 22), nic neměňte.
2. **Site configuration → Environment variables → Add a variable** (ručně):
   `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY` (bod 2).
   - *Contains secret values* **nezaškrtávejte**: klíč patří do výsledného
     JavaScriptu a Netlify by build zastavilo.
   - Scope: všechny (nebo aspoň *Builds*), stejné hodnoty pro všechny kontexty.
3. **Deploys → Trigger deploy**. Po každé změně proměnných je potřeba nový deploy.
4. Každý push do `main` se nasadí automaticky.

Když web píše „Výsledky se nepodařilo načíst“: zkontrolujte hodnoty proměnných
(překlep, mezera navíc), jestli po jejich změně proběhl nový deploy a jestli
Supabase projekt není uspaný.

## 7. Historická data

Zdroj: `data/JBC_umisteni_vsechny_rocniky.xlsx` (list `List1`: ročníky v řádku 5
od sloupce M, počty týmů v řádku 6, jména ve sloupci H od řádku 7).

```bash
npm run import:history          # Excel → supabase/seed.sql
```

- Páry se skládají z hráčů se stejným umístěním ve stejném roce. Skript ověří,
  že každé umístění 1…N má přesně dva hráče a počty týmů sedí s řádkem 6
  (a s kontrolními součty 2022: 6, 2023: 6, 2024: 10, 2025: 8, 2026: 8).
  Při porušení skončí chybou s popisem, co nesedí.
- Sloupec pro nový ročník v Excelu (R, S, …) skript načte automaticky.
- `supabase/seed.sql` je generovaný, needitujte ho ručně. Po přegenerování ho
  spusťte v SQL Editoru. Seed je opakovatelný: ročníky a hráče jen doplní
  (ruční úpravy názvu, termínu a stavu zůstanou), páry importovaných ročníků
  přepíše, přihlášek se nedotkne.

Sloupec nového ročníku se v tabulce na webu objeví sám, jakmile má v databázi
aspoň jeden tým s vyplněným umístěním.

## 8. Struktura databáze

| Objekt | Účel |
|---|---|
| `editions` | ročníky: rok, název, termín, místo, stav, `poll_url` (fáze 2) |
| `players` | hráči (jméno je unikátní) |
| `teams` | páry v ročníku a konečné umístění (fáze 3 na ně naváže zápasy) |
| `registrations` | přihlášky; `player_id` pro propojení s hráčem ve fázi 3 |
| `current_edition` | pohled: aktuální ročník (nejvyšší `year`) |
| `edition_summary` | pohled: počet týmů a zda má ročník výsledky |
| `player_results` | pohled: hráč × ročník, umístění, spoluhráč, úspěšnost |
| `player_stats` | pohled: počet účastí a průměrná úspěšnost |
| `registrations_public` | pohled: jen jméno a pohlaví přihlášených v aktuálním ročníku |
| `register()` | funkce pro registraci z webu (honeypot, validace, hlášky) |

Úspěšnost v ročníku = `1 − (umístění − 1) / (počet týmů − 1)`; průměr se
počítá přes ročníky, kterých se hráč účastnil.

**Oprávnění anonymního návštěvníka:** čtení `editions`, `players`, `teams`
a pohledů; vkládání do `registrations` jen pro ročník ve stavu
`registration_open`. Čtení, úpravy ani mazání přihlášek nejsou z webu možné.
