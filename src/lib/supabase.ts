// Fáze 1 potřebuje jen REST API Supabase (PostgREST), proto místo celého
// @supabase/supabase-js (~220 kB) používáme jen jeho REST klienta. Hlavičky
// jsou stejné, jaké posílá supabase-js. Ve fázi 3 (přihlašování) lze
// přejít na createClient() z @supabase/supabase-js bez změny dotazů.
import { PostgrestClient } from '@supabase/postgrest-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error('Chybí VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY (viz .env.example).');
}

export const supabase = new PostgrestClient(`${url.replace(/\/$/, '')}/rest/v1`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
});
