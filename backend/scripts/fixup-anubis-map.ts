/**
 * One-time fixup: an earlier import-match-data run collapsed two BO3 maps
 * (vitALIty 7-13 ShenT1Go on de_overpass and vitALIty 13-7 ShenT1Go on de_anubis)
 * onto the same match_map row because findMatchMap matched purely on score.
 * That bug is now fixed (matches by map_name as well), so deleting the
 * combined row and re-running the import will rebuild map_order 1 (overpass)
 * and map_order 2 (anubis) correctly. Stats / rounds / kills / clutches
 * cascade-delete with the row.
 *
 * Run once: cd /opt/alast/backend && npx tsx scripts/fixup-anubis-map.ts
 */
import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // Drop both stale rows so the import script can re-create the full BO3
  // (overpass map_order=1, anubis=2, dust2=3) cleanly. The two ids below are
  // the only existing map_maps on the M12 ShenT1Go vs vitALIty match.
  const STALE_MAP_IDS = [
    '1f36bc1e-5755-4918-9061-909db6589230', // de_overpass (also blocked de_anubis on prior run)
    'f9e52f8a-dc33-4616-a4b8-347ecbc7549f', // de_dust2 (gets re-imported once the run starts from order 1)
  ]
  const { rowCount } = await pool.query(
    `DELETE FROM match_maps WHERE id = ANY($1::uuid[])`, [STALE_MAP_IDS]
  )
  console.log(`Deleted ${rowCount} stale match_map row(s).`)
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
