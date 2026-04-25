-- 007_swiss_standings_view.sql
CREATE OR REPLACE VIEW tournament_swiss_standings AS
WITH team_results AS (
  SELECT
    m.tournament_id,
    m.team_a_id AS team_id,
    m.team_b_id AS opponent_id,
    CASE WHEN m.maps_won_a > m.maps_won_b THEN 1 ELSE 0 END AS won,
    COALESCE(
      (SELECT SUM(mm.score_a - mm.score_b) FROM match_maps mm WHERE mm.match_id = m.id),
      0
    ) AS round_diff
  FROM matches m
  WHERE m.bracket_kind = 'swiss' AND m.status = 'finished'
    AND m.team_a_id IS NOT NULL AND m.team_b_id IS NOT NULL
  UNION ALL
  SELECT
    m.tournament_id,
    m.team_b_id AS team_id,
    m.team_a_id AS opponent_id,
    CASE WHEN m.maps_won_b > m.maps_won_a THEN 1 ELSE 0 END AS won,
    COALESCE(
      (SELECT SUM(mm.score_b - mm.score_a) FROM match_maps mm WHERE mm.match_id = m.id),
      0
    ) AS round_diff
  FROM matches m
  WHERE m.bracket_kind = 'swiss' AND m.status = 'finished'
    AND m.team_a_id IS NOT NULL AND m.team_b_id IS NOT NULL
),
team_records AS (
  SELECT
    tournament_id,
    team_id,
    SUM(won)::INTEGER AS wins,
    (COUNT(*) - SUM(won))::INTEGER AS losses,
    SUM(round_diff)::INTEGER AS round_diff
  FROM team_results
  GROUP BY tournament_id, team_id
),
buchholz_calc AS (
  SELECT
    tr.tournament_id,
    tr.team_id,
    COALESCE(SUM(opp.wins), 0)::INTEGER AS buchholz
  FROM team_results tr
  JOIN team_records opp
    ON opp.team_id = tr.opponent_id AND opp.tournament_id = tr.tournament_id
  GROUP BY tr.tournament_id, tr.team_id
)
SELECT
  tr.tournament_id,
  tr.team_id,
  t.name        AS team_name,
  t.short_name  AS team_short_name,
  t.logo_url    AS team_logo_url,
  tr.wins,
  tr.losses,
  COALESCE(b.buchholz, 0) AS buchholz,
  tr.round_diff
FROM team_records tr
JOIN teams t ON t.id = tr.team_id
LEFT JOIN buchholz_calc b
  ON b.team_id = tr.team_id AND b.tournament_id = tr.tournament_id;
