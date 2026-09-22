import { supabase } from './supabase';

export type EditionStatus =
  | 'planned'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'finished';

export type Gender = 'male' | 'female';

export interface Edition {
  id: number;
  year: number;
  title: string;
  date: string | null;
  venue: string | null;
  status: EditionStatus;
  poll_url: string | null;
}

export interface EditionSummary {
  edition_id: number;
  year: number;
  title: string;
  team_count: number;
  has_results: boolean;
}

export interface PlayerResult {
  player_id: number;
  full_name: string;
  edition_id: number;
  year: number;
  placement: number | null;
  team_count: number;
  partner_name: string;
  success: number | null;
}

export interface PlayerStats {
  player_id: number;
  full_name: string;
  participations: number;
  avg_success: number | null;
}

export interface PublicRegistration {
  full_name: string;
  gender: Gender;
  created_at: string;
}

export type RegisterResult = 'ok' | 'duplicate_email' | 'registration_closed' | 'invalid';

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function fetchCurrentEdition(): Promise<Edition | null> {
  const res = await supabase.from('current_edition').select('*').maybeSingle();
  return unwrap(res) as Edition | null;
}

export async function fetchHistory() {
  const [editions, results, stats] = await Promise.all([
    supabase.from('edition_summary').select('*').order('year'),
    supabase
      .from('player_results')
      .select('player_id, full_name, edition_id, year, placement, team_count, partner_name, success'),
    supabase.from('player_stats').select('*'),
  ]);
  return {
    editions: unwrap(editions) as EditionSummary[],
    results: unwrap(results) as PlayerResult[],
    stats: unwrap(stats) as PlayerStats[],
  };
}

export async function fetchRegistrations(): Promise<PublicRegistration[]> {
  const res = await supabase.from('registrations_public').select('*');
  return unwrap(res) as PublicRegistration[];
}

export async function register(input: {
  fullName: string;
  email: string;
  gender: Gender;
  note: string;
  website: string;
}): Promise<RegisterResult> {
  const res = await supabase.rpc('register', {
    p_full_name: input.fullName,
    p_email: input.email,
    p_gender: input.gender,
    p_note: input.note,
    p_website: input.website,
  });
  return unwrap(res) as RegisterResult;
}
