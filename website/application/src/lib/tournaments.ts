import { format } from 'date-fns';
import { api, apiSafe } from './api';

export function formatTournamentDate(value?: string | null) {
  if (!value) return null;
  const day = value.slice(0, 10);
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'd MMM yyyy');
}

export const BALL_TYPES = [
  { id: 'tennis', label: 'Tennis' },
  { id: 'leather', label: 'Leather' },
  { id: 'tape', label: 'Tape' },
  { id: 'rubber', label: 'Rubber' },
] as const;

export type TournamentBallType = (typeof BALL_TYPES)[number]['id'];

export function ballTypeLabel(value?: string | null) {
  return BALL_TYPES.find((ball) => ball.id === value)?.label ?? null;
}

export function validateTournamentProfile(input: {
  organizerName: string;
  organizerPhone: string;
  startDate: string;
  registrationDate: string;
  closingDate: string;
  ballType: string;
  logoUrl?: string | null;
}) {
  if (!input.organizerName.trim()) return 'Enter the organizer name';
  const digits = input.organizerPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return 'Enter a valid phone number';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return 'Select the tournament date';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.registrationDate)) return 'Select the registration date';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.closingDate)) return 'Select the closing date';
  if (input.closingDate < input.registrationDate) return 'Closing date must be on or after the registration date';
  if (!BALL_TYPES.some((ball) => ball.id === input.ballType)) return 'Select a ball type';
  if (input.logoUrl && input.logoUrl.length > 900_000) return 'Logo image is too large. Choose a smaller photo.';
  return null;
}

export interface UpdateTournamentInput {
  id: string;
  name: string;
  city?: string;
  venue?: string;
  format: string;
  oversPerInnings: number;
  maxTeams?: number;
  status?: string;
  logoUrl?: string | null;
  organizerName?: string;
  organizerPhone?: string;
  startDate?: string;
  registrationDate?: string;
  closingDate?: string;
  ballType?: string;
}

export interface CreateTournamentInput {
  name: string;
  city?: string;
  venue?: string;
  format: string;
  oversPerInnings: number;
  slug?: string;
  status?: string;
  logoUrl?: string | null;
  organizerName: string;
  organizerPhone: string;
  startDate: string;
  registrationDate: string;
  closingDate: string;
  ballType: string;
}

export async function createTournament(input: CreateTournamentInput) {
  const { data, error } = await apiSafe<{ id: string }>('/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      city: input.city?.trim() || null,
      venue: input.venue?.trim() || null,
      format: input.format,
      overs_per_innings: input.oversPerInnings,
      slug: input.slug,
      status: input.status ?? 'registration',
      logo_url: input.logoUrl ?? null,
      organizer_name: input.organizerName.trim(),
      organizer_phone: input.organizerPhone.replace(/\D/g, ''),
      start_date: input.startDate,
      registration_date: input.registrationDate,
      registration_deadline: `${input.closingDate}T23:59:59.999Z`,
      ball_type: input.ballType,
    }),
  });
  return { tournamentId: data?.id, error };
}

export async function updateTournament(input: UpdateTournamentInput) {
  const { error } = await apiSafe(`/tournaments/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.name.trim(),
      city: input.city?.trim() || null,
      venue: input.venue?.trim() || null,
      format: input.format,
      overs_per_innings: input.oversPerInnings,
      ...(input.maxTeams != null ? { max_teams: input.maxTeams } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.logoUrl !== undefined ? { logo_url: input.logoUrl } : {}),
      ...(input.organizerName !== undefined ? { organizer_name: input.organizerName.trim() } : {}),
      ...(input.organizerPhone !== undefined ? { organizer_phone: input.organizerPhone.replace(/\D/g, '') } : {}),
      ...(input.startDate !== undefined ? { start_date: input.startDate } : {}),
      ...(input.registrationDate !== undefined ? { registration_date: input.registrationDate } : {}),
      ...(input.closingDate !== undefined ? { registration_deadline: input.closingDate ? `${input.closingDate}T23:59:59.999Z` : null } : {}),
      ...(input.ballType !== undefined ? { ball_type: input.ballType } : {}),
    }),
  });
  return { error };
}
