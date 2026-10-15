import { Innings, Match, Player, ScoreEvent, Team } from '../models';

type Totals = {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outs: number;
  highScore: number;
  highScoreOut: boolean;
  bowlBalls: number;
  bowlRuns: number;
  wickets: number;
  bestWickets: number;
  bestRuns: number;
  matches: Set<string>;
  inningsBat: number;
};

function empty(): Totals {
  return { runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, highScore: 0, highScoreOut: false, bowlBalls: 0, bowlRuns: 0, wickets: 0, bestWickets: -1, bestRuns: 0, matches: new Set(), inningsBat: 0 };
}

function creditsBowler(type: string | null) {
  return type === 'bowled' || type === 'caught' || type === 'lbw' || type === 'stumped' || type === 'hit_wicket';
}

export async function tournamentRows(tournamentId: string) {
  const matches = await Match.find({ tournament_id: tournamentId, status: { $in: ['live', 'completed'] } });
  const innings = await Innings.find({ match_id: { $in: matches.map((match) => match._id) } });
  const inningsMatch = new Map(innings.map((inn) => [String(inn._id), String(inn.match_id)]));
  const events = await ScoreEvent.find({ innings_id: { $in: innings.map((inn) => inn._id) } }).sort({ created_at: 1 });
  const teams = await Team.find({ tournament_id: tournamentId });
  const players = await Player.find({ team_id: { $in: teams.map((team) => team._id) } });
  const teamName = new Map(teams.map((team) => [String(team._id), team.short_name || team.name]));
  const byPlayer = new Map<string, Totals>();
  const ensure = (id: string) => {
    let row = byPlayer.get(id);
    if (!row) { row = empty(); byPlayer.set(id, row); }
    return row;
  };
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const key = String(event.innings_id);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  for (const [inningsId, balls] of grouped) {
    const matchId = inningsMatch.get(inningsId);
    const batSeen = new Set<string>();
    const bowl = new Map<string, { balls: number; runs: number; wickets: number }>();
    for (const event of balls) {
      const striker = event.striker_player_id ? String(event.striker_player_id) : '';
      const bowler = event.bowler_player_id ? String(event.bowler_player_id) : '';
      if (matchId && striker) ensure(striker).matches.add(matchId);
      if (matchId && bowler) ensure(bowler).matches.add(matchId);
      if (striker && !batSeen.has(striker)) { batSeen.add(striker); ensure(striker).inningsBat += 1; }
      if (striker && event.ball_type !== 'wide') ensure(striker).balls += 1;
      if (striker && !['wide', 'bye', 'leg_bye'].includes(event.ball_type)) {
        const row = ensure(striker);
        row.runs += event.runs_off_bat;
        if (event.ball_type === 'four' || event.runs_off_bat === 4) row.fours += event.ball_type === 'four' && event.runs_off_bat === 4 ? 1 : 1;
        if (event.ball_type === 'six' || (event.runs_off_bat === 6 && event.ball_type !== 'four')) row.sixes += 1;
      }
      if (event.is_wicket) {
        const outId = String(event.dismissed_player_id ?? event.striker_player_id ?? '');
        if (outId) ensure(outId).outs += 1;
      }
      if (bowler) {
        const spell = bowl.get(bowler) ?? { balls: 0, runs: 0, wickets: 0 };
        if (event.is_legal_delivery) spell.balls += 1;
        if (!['bye', 'leg_bye'].includes(event.ball_type)) spell.runs += event.runs_off_bat + event.extras;
        if (event.is_wicket && creditsBowler(event.wicket_type ?? null)) spell.wickets += 1;
        bowl.set(bowler, spell);
      }
    }
    for (const id of batSeen) {
      const row = ensure(id);
      const innsRuns = balls.filter((event) => String(event.striker_player_id) === id && !['wide', 'bye', 'leg_bye'].includes(event.ball_type)).reduce((sum, event) => sum + event.runs_off_bat, 0);
      const out = balls.some((event) => event.is_wicket && String(event.dismissed_player_id ?? event.striker_player_id) === id);
      if (innsRuns > row.highScore || (innsRuns === row.highScore && row.highScoreOut && !out)) {
        row.highScore = innsRuns;
        row.highScoreOut = out;
      }
    }
    for (const [id, spell] of bowl) {
      const row = ensure(id);
      row.bowlBalls += spell.balls;
      row.bowlRuns += spell.runs;
      row.wickets += spell.wickets;
      if (spell.wickets > row.bestWickets || (spell.wickets === row.bestWickets && spell.runs < row.bestRuns)) {
        row.bestWickets = spell.wickets;
        row.bestRuns = spell.runs;
      }
    }
  }
  const motm = new Map<string, number>();
  for (const match of matches) {
    if (match.man_of_the_match_player_id) {
      const id = String(match.man_of_the_match_player_id);
      motm.set(id, (motm.get(id) ?? 0) + 1);
    }
  }
  return players.map((player) => {
    const stats = byPlayer.get(String(player._id)) ?? empty();
    return {
      id: String(player._id),
      name: player.full_name,
      team: teamName.get(String(player.team_id)) ?? '',
      matches: stats.matches.size,
      runs: stats.runs,
      balls: stats.balls,
      fours: stats.fours,
      sixes: stats.sixes,
      average: stats.outs ? (stats.runs / stats.outs).toFixed(2) : '—',
      strikeRate: stats.balls ? ((stats.runs / stats.balls) * 100).toFixed(2) : '0.00',
      highScore: stats.inningsBat ? `${stats.highScore}${stats.highScoreOut ? '' : '*'}` : '—',
      wickets: stats.wickets,
      economy: stats.bowlBalls ? ((stats.bowlRuns / stats.bowlBalls) * 6).toFixed(2) : '0.00',
      best: stats.bestWickets >= 0 ? `${stats.bestWickets}/${stats.bestRuns}` : '—',
      awards: motm.get(String(player._id)) ?? 0,
    };
  });
}

export async function tournamentLeaders(tournamentId: string) {
  const rows = await tournamentRows(tournamentId);
  const batting = rows.filter((row) => row.runs > 0 || row.balls > 0).sort((a, b) => b.runs - a.runs || Number(b.strikeRate) - Number(a.strikeRate)).slice(0, 10);
  const bowling = rows.filter((row) => row.wickets > 0).sort((a, b) => b.wickets - a.wickets || Number(a.economy) - Number(b.economy)).slice(0, 10);
  const ranked = [...rows].sort((a, b) => (b.runs + b.wickets * 20 + b.awards * 25) - (a.runs + a.wickets * 20 + a.awards * 25));
  return {
    batting,
    bowling,
    awards: {
      batter: batting[0] ?? null,
      bowler: bowling[0] ?? null,
      player: ranked.find((row) => row.runs + row.wickets + row.awards > 0) ?? null,
    },
  };
}

export async function playerCareer(playerId: string) {
  const player = await Player.findById(playerId);
  if (!player) return null;
  const team = await Team.findById(player.team_id);
  if (!team) return null;
  const rows = await tournamentRows(String(team.tournament_id));
  const stats = rows.find((row) => row.id === playerId) ?? { matches: 0, runs: 0, balls: 0, fours: 0, sixes: 0, average: '—', strikeRate: '0.00', highScore: '—', wickets: 0, economy: '0.00', best: '—' };
  return {
    player: { id: String(player._id), full_name: player.full_name, jersey_number: player.jersey_number, role: player.role, photo_url: (player as { photo_url?: string | null }).photo_url ?? null, is_captain: player.is_captain, is_wicket_keeper: player.is_wicket_keeper },
    team: { id: String(team._id), name: team.name },
    tournamentId: String(team.tournament_id),
    stats,
  };
}
