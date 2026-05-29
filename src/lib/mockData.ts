/** Demo data when Supabase is not configured */
export const MOCK_LIVE_MATCHES = [
  {
    id: 'demo-match-1',
    status: 'live',
    result_summary: null,
    team_a: { id: 't1', name: 'Mumbai Strikers', short_name: 'MUS', primary_color: '#FF6B00' },
    team_b: { id: 't2', name: 'Delhi Warriors', short_name: 'DLW', primary_color: '#00B4D8' },
    tournament: { name: 'Gully Premier League 2026', city: 'Mumbai' },
  },
];

export const MOCK_COMPLETED_MATCHES = [
  {
    id: 'demo-match-done-1',
    status: 'completed',
    result_summary: 'Mumbai Strikers won by 12 runs. Man of the Match: Rahul Sharma.',
    team_a: { id: 't1', name: 'Mumbai Strikers', short_name: 'MUS', primary_color: '#FF6B00' },
    team_b: { id: 't3', name: 'Pune Panthers', short_name: 'PUP', primary_color: '#7B2CBF' },
    tournament: { name: 'Gully Premier League 2026', city: 'Mumbai' },
  },
];

export const MOCK_TOURNAMENTS = [
  {
    id: 'demo-t1',
    name: 'Gully Premier League 2026',
    city: 'Mumbai',
    format: 'T20',
    status: 'ongoing',
    overs_per_innings: 20,
    max_teams: 8,
    venue: 'Azad Maidan',
    start_date: '2026-05-01',
  },
  {
    id: 'demo-t2',
    name: 'Sunday Super Sixes',
    city: 'Pune',
    format: 'T10',
    status: 'registration',
    overs_per_innings: 10,
    max_teams: 6,
    venue: 'Koregaon Park',
    start_date: '2026-06-15',
  },
];

