import 'dotenv/config'
import { pool } from '../src/db.js'

const updates: [string, string][] = [
  ['/uploads/teams/e2d2a94f-d248-42d3-ae4c-d0d2171802f1.png', 'e2d2a94f-d248-42d3-ae4c-d0d2171802f1'],
  ['/uploads/teams/057462be-f12e-4a37-b7c1-dac336572df3.png', '057462be-f12e-4a37-b7c1-dac336572df3'],
  ['/uploads/teams/7246ac3e-0507-47e2-b857-ceb5c6da1c9d.jpg', '7246ac3e-0507-47e2-b857-ceb5c6da1c9d'],
  ['/uploads/teams/fe4c9bf2-6e9a-4f2a-8904-ce9cc80e487c.png', 'fe4c9bf2-6e9a-4f2a-8904-ce9cc80e487c'],
  ['/uploads/teams/e13e9944-4951-46b4-acfc-14f0843df552.png', 'e13e9944-4951-46b4-acfc-14f0843df552'],
  ['/uploads/teams/ea6abc7b-2b82-45c4-ae00-d42e77c746c7.png', 'ea6abc7b-2b82-45c4-ae00-d42e77c746c7'],
  ['/uploads/teams/a33995eb-7a19-4d3d-b5ea-37ce6bf5ee71.png', 'a33995eb-7a19-4d3d-b5ea-37ce6bf5ee71'],
  ['/uploads/teams/7abadcb3-65a4-4813-b256-f4947885cb87.png', '7abadcb3-65a4-4813-b256-f4947885cb87'],
  ['/uploads/teams/6da219e9-1b74-408e-8706-e645237abd7f.png', '6da219e9-1b74-408e-8706-e645237abd7f'],
  ['/uploads/teams/75ec3fd1-79d6-458b-887c-fbb1029655ad.png', '75ec3fd1-79d6-458b-887c-fbb1029655ad'],
  ['/uploads/teams/656329b9-dea6-4b55-8a72-e7f6510e0463.png', '656329b9-dea6-4b55-8a72-e7f6510e0463'],
  ['/uploads/teams/cb833142-1543-4a91-a6e2-78d71f8974d1.png', 'cb833142-1543-4a91-a6e2-78d71f8974d1'],
]

async function main() {
  for (const [url, id] of updates) {
    const { rows } = await pool.query(
      'UPDATE teams SET logo_url = $1 WHERE id = $2 RETURNING name',
      [url, id]
    )
    console.log(`✓ ${rows[0]?.name ?? id} → ${url}`)
  }
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
