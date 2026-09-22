#!/usr/bin/env node
// Připraví fotky pro web.
//
//   npm run gallery
//
// Vstup:  gallery-originals/*.{jpg,jpeg,png,webp,tif,tiff,avif,heic}
//         (volitelně gallery-originals/popisky.json: { "soubor.jpg": "Popisek" })
// Výstup: public/gallery/thumb/<název>.webp  – náhled, šířka 640 px
//         public/gallery/full/<název>.webp   – plná velikost, delší strana max. 2000 px
//         public/gallery/manifest.json       – seznam fotek pro web (pořadí = abecedně podle názvu souboru)
//
// Otočení podle EXIF se aplikuje, metadata (včetně GPS) se zahodí.
// Už zpracované fotky se přeskočí; výstupy smazaných originálů se odstraní.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const SRC = 'gallery-originals';
const OUT = 'public/gallery';
const THUMB_WIDTH = 640;
const FULL_MAX = 2000;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif', '.heic']);

if (!existsSync(SRC)) {
  console.error(`Složka ${SRC}/ neexistuje. Vytvořte ji a vložte do ní fotky.`);
  process.exit(1);
}
for (const d of ['thumb', 'full']) mkdirSync(join(OUT, d), { recursive: true });

const captionsPath = join(SRC, 'popisky.json');
const captions = existsSync(captionsPath) ? JSON.parse(readFileSync(captionsPath, 'utf8')) : {};

const slug = (name) =>
  basename(name, extname(name))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const files = readdirSync(SRC)
  .filter((f) => EXTENSIONS.has(extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, 'cs', { numeric: true }));

const seen = new Set();
const manifest = [];
let processed = 0;

for (const file of files) {
  const id = slug(file);
  if (seen.has(id)) {
    console.error(`Dva soubory dávají stejný název výstupu „${id}“ – přejmenujte jeden z nich (${file}).`);
    process.exit(1);
  }
  seen.add(id);

  const src = join(SRC, file);
  const thumb = join(OUT, 'thumb', `${id}.webp`);
  const full = join(OUT, 'full', `${id}.webp`);
  const srcTime = statSync(src).mtimeMs;
  const upToDate = [thumb, full].every((p) => existsSync(p) && statSync(p).mtimeMs >= srcTime);

  if (!upToDate) {
    const img = sharp(src).rotate();
    await img.clone().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toFile(thumb);
    await img
      .clone()
      .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(full);
    processed++;
  }

  const [t, f] = await Promise.all([sharp(thumb).metadata(), sharp(full).metadata()]);
  manifest.push({
    thumb: `/gallery/thumb/${id}.webp`,
    thumbWidth: t.width,
    thumbHeight: t.height,
    full: `/gallery/full/${id}.webp`,
    width: f.width,
    height: f.height,
    alt: captions[file] ?? '',
  });
}

// Úklid výstupů po smazaných originálech.
let removed = 0;
for (const d of ['thumb', 'full']) {
  for (const f of readdirSync(join(OUT, d))) {
    if (!seen.has(basename(f, '.webp'))) {
      rmSync(join(OUT, d, f));
      removed++;
    }
  }
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Galerie: ${manifest.length} fotek (nově zpracováno ${processed}, odstraněno ${removed} starých souborů).`);
