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
