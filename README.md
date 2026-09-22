# JBC badminton

Interní web badmintonového turnaje JBC (Vite + TypeScript + Supabase).

> Plný návod (Supabase, fotky, texty, nasazení) přibude s frontendem.

## Databáze

- `supabase/migrations/` – schéma, pohledy, RLS a funkce `register()`.
- `supabase/seed.sql` – historické výsledky, **generované** z Excelu, needitovat ručně.

### Přegenerování historických dat

```bash
npm install
npm run import:history          # data/JBC_umisteni_vsechny_rocniky.xlsx → supabase/seed.sql
```

Skript ověří, že v každém ročníku má každé umístění přesně dva hráče a že počty
týmů sedí. Seed na konci sám zkontroluje počty účastí a úspěšnosti proti
hodnotám z Excelu a při neshodě se celý vrátí zpět.

### Otevření registrace

Registrace se vždy týká **aktuálního ročníku = ročníku s nejvyšším `year`**.
Před otevřením registrace je proto potřeba založit nový ročník v tabulce
`editions` se stavem `registration_open`, např. v SQL editoru Supabase:

```sql
insert into editions (year, title, status) values (2027, 'JBC 2027', 'registration_open');
```

Uzavření: `update editions set status = 'registration_closed' where year = 2027;`

## Frontend

```bash
cp .env.example .env.local      # doplňte URL a anon key ze Supabase → Project Settings → API
npm install
npm run dev                     # http://localhost:5173
```

## Nasazení na Netlify

1. Netlify → *Add new site* → *Import an existing project* → GitHub → `pilnikcgp/jbc-badminton`.
2. Build se načte z `netlify.toml` (`npm run build`, složka `dist`), nic neměňte.
3. *Site configuration → Environment variables*: přidejte `VITE_SUPABASE_URL`
   a `VITE_SUPABASE_ANON_KEY` (stejné hodnoty jako v `.env.local`).
4. *Deploys → Trigger deploy*. Každý push do `main` se pak nasadí automaticky.

## Fotky

**Galerie:** originály vložte do složky `gallery-originals/` (není v gitu, fotky
mohou být velké) a spusťte:

```bash
npm run gallery
```

Skript vytvoří WebP náhledy (`public/gallery/thumb/`, šířka 640 px) a plné
velikosti (`public/gallery/full/`, max. 2000 px), otočí fotky podle EXIF, zahodí
metadata včetně GPS a zapíše `public/gallery/manifest.json`. Pořadí v galerii
je abecední podle názvu souboru. Popisky (volitelné) patří do
`gallery-originals/popisky.json`, např. `{ "foto-01.jpg": "Finále 2026" }`.
Smazaná fotka z `gallery-originals/` zmizí i z webu. Výstupy v `public/gallery/`
commitněte. Zástupné fotky `foto-01` až `foto-08` jednoduše přepíšete nebo smažete.

**Hero fotka:** nahraďte `public/hero.jpg` (ideálně na šířku, cca 2400 px,
do 400 kB). Popis fotky pro čtečky je v `src/config.ts` (`hero.imageAlt`).

## Texty

Všechny texty stránky (název, podtitul, představení, hlášky formuláře, nadpisy)
jsou v `src/config.ts`. Termín a místo se berou z tabulky `editions`.
