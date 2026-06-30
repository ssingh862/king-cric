import { Innings, Match, PointsTable, ScoreEvent, Team } from '../models';

type TeamAccum = {
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runs_for: number;
  runs_against: number;
  overs_for: number;
  overs_against: number;
};

function ballsToOversDecimal(legalBalls: number, ballsPerOver = 6): number {
  if (legalBalls <= 0) return 0;
  return legalBalls / ballsPerOver;
}

function computeNrr(acc: TeamAccum): number {
  if (acc.overs_for <= 0 || acc.overs_against <= 0) return 0;
  return acc.runs_for / acc.overs_for - acc.runs_against / acc.overs_against;
}

async function ensurePointsRowsForTournament(tournamentId: string) {
  const teams = await Team.find({ tournament_id: tournamentId });
  for (const team of teams) {
    await PointsTable.findOneAndUpdate(
      { tournament_id: tournamentId, team_id: team._id },
      { tournament_id: tournamentId, team_id: team._id },
      { upsert: true }
    );
  }
}

export async function recalculateTournamentPoints(tournamentId: string): Promise<string | null> {
  await ensurePointsRowsForTournament(tournamentId);

  const teams = await Team.find({ tournament_id: tournamentId });
  if (!teams.length) return null;

  const accum = new Map<string, TeamAccum>();
  for (const t of teams) {
    accum.set(String(t._id), {
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runs_for: 0,
      runs_against: 0,
      overs_for: 0,
      overs_against: 0,
    });
  }

  const matches = await Match.find({ tournament_id: tournamentId, status: 'completed' });

  for (const match of matches) {
    const innings = await Innings.find({ match_id: match._id }).sort({ innings_number: 1 });
    if (innings.length < 2) continue;

    const ids = innings.map((i) => i._id);
    const events = await ScoreEvent.find({ innings_id: { $in: ids } });

    const teamStats = new Map<string, { runsScored: number; runsConceded: number; oversFaced: number; oversBowled: number }>();
    const initTeam = (teamId: string) => {
      if (!teamStats.has(teamId)) {
        teamStats.set(teamId, { runsScored: 0, runsConceded: 0, oversFaced: 0, oversBowled: 0 });
      }
      return teamStats.get(teamId)!;
    };

    initTeam(String(match.team_a_id));
    initTeam(String(match.team_b_id));

    for (const inn of innings) {
      const innEvents = events.filter((e) => String(e.innings_id) === String(inn._id));
      let runs = 0;
      let legalBalls = 0;
      for (const e of innEvents) {
        runs += e.runs_off_bat + e.extras;
        if (e.is_legal_delivery) legalBalls += 1;
      }

      const batting = initTeam(String(inn.batting_team_id));
      const bowling = initTeam(String(inn.bowling_team_id));
      const overs = ballsToOversDecimal(legalBalls);

      batting.runsScored += runs;
      batting.oversFaced += overs;
      bowling.runsConceded += runs;
      bowling.oversBowled += overs;
    }

    const teamA = accum.get(String(match.team_a_id))!;
    const teamB = accum.get(String(match.team_b_id))!;
    const statsA = teamStats.get(String(match.team_a_id))!;
    const statsB = teamStats.get(String(match.team_b_id))!;

    teamA.played++;
    teamB.played++;
    teamA.runs_for += statsA.runsScored;
    teamA.runs_against += statsA.runsConceded;
    teamA.overs_for += statsA.oversFaced;
    teamA.overs_against += statsA.oversBowled;
    teamB.runs_for += statsB.runsScored;
    teamB.runs_against += statsB.runsConceded;
    teamB.overs_for += statsB.oversFaced;
    teamB.overs_against += statsB.oversBowled;

    const winnerId = match.winner_team_id ? String(match.winner_team_id) : null;
    if (!winnerId) {
      teamA.tied++;
      teamB.tied++;
      teamA.points += 1;
      teamB.points += 1;
    } else if (winnerId === String(match.team_a_id)) {
      teamA.won++;
      teamA.points += 2;
      teamB.lost++;
    } else {
      teamB.won++;
      teamB.points += 2;
      teamA.lost++;
    }
  }

  for (const [teamId, row] of accum) {
    const nrr = computeNrr(row);
    await PointsTable.findOneAndUpdate(
      { tournament_id: tournamentId, team_id: teamId },
      {
        played: row.played,
        won: row.won,
        lost: row.lost,
        tied: row.tied,
        points: row.points,
        runs_for: row.runs_for,
        runs_against: row.runs_against,
        overs_for: Number(row.overs_for.toFixed(1)),
        overs_against: Number(row.overs_against.toFixed(1)),
        net_run_rate: Number(nrr.toFixed(3)),
      }
    );
  }

  return null;
}

export async function updatePointsAfterMatch(matchId: string): Promise<{ error: string | null }> {
  const match = await Match.findById(matchId);
  if (!match || match.status !== 'completed') {
    return { error: 'Match not completed' };
  }
  const err = await recalculateTournamentPoints(String(match.tournament_id));
  return { error: err };
}
