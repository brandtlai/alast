import { useState } from 'react'

interface UploadResult {
  matchId: string
  matchMapId: string
  mapOrder: number
  mapName: string
  teamA: { id: string; name: string; score: number }
  teamB: { id: string; name: string; score: number }
  counts: { stats: number; rounds: number; kills: number; clutches: number; economies: number }
}

const KEY_STORAGE = 'alast.adminImportKey'

export default function AdminImportPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(KEY_STORAGE) ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function rememberKey(v: string) {
    setAdminKey(v)
    if (v) localStorage.setItem(KEY_STORAGE, v)
    else localStorage.removeItem(KEY_STORAGE)
  }

  async function upload() {
    if (!file || !adminKey) return
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/import-auto/upload', {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey },
        body: fd,
      })
      const json = await res.json() as
        | { success: true; data: UploadResult }
        | { success: false; error: string; code: string }
      if (!json.success) {
        setError(`[${json.code}] ${json.error}`)
      } else {
        setResult(json.data)
        setFile(null)
      }
    } catch (e) {
      setError((e as Error).message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Admin</p>
        <h1 className="text-3xl font-black italic tracking-tighter text-white/90">CSDM 比赛导入</h1>
        <p className="text-sm text-white/40 mt-2">
          上传 CSDM 解析的 JSON。系统将自动匹配/创建比赛与选手，写入完整 rich-event 数据。
        </p>
      </div>

      <section className="rounded-lg p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <label className="block text-xs font-black uppercase tracking-widest text-white/60">Admin Key</label>
        <input
          type="password"
          value={adminKey}
          onChange={e => rememberKey(e.target.value)}
          placeholder="X-Admin-Key"
          className="w-full px-3 py-2 rounded bg-black/30 border border-white/10 text-sm text-white/90 focus:outline-none focus:border-primary/60"
        />
        <p className="text-[11px] text-white/40">保存在浏览器 localStorage，仅用于鉴权 header。</p>
      </section>

      <section className="rounded-lg p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <label className="block text-xs font-black uppercase tracking-widest text-white/60">CSDM JSON 文件</label>
        <input
          type="file"
          accept="application/json,.json"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
        />
        {file && <p className="text-xs text-white/50">已选择 <span className="text-white/80">{file.name}</span> ({Math.round(file.size / 1024)} KB)</p>}

        <button
          onClick={upload}
          disabled={!file || !adminKey || uploading}
          className="px-5 py-2 rounded font-black uppercase tracking-widest text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {uploading ? '导入中…' : '上传并导入'}
        </button>
      </section>

      {error && (
        <div className="rounded-lg p-4 text-sm" style={{ background: 'rgba(255, 43, 214, 0.1)', border: '1px solid rgba(255, 43, 214, 0.4)', color: 'var(--color-neon-pink)' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg p-5 space-y-3" style={{ background: 'rgba(255, 184, 0, 0.06)', border: '1px solid rgba(255, 184, 0, 0.4)' }}>
          <p className="text-xs font-black uppercase tracking-widest text-primary">导入成功</p>
          <div className="text-sm text-white/80">
            <span className="font-black">{result.teamA.name}</span> {result.teamA.score} – {result.teamB.score} <span className="font-black">{result.teamB.name}</span>
            <span className="text-white/40 ml-2">· {result.mapName} · Map {result.mapOrder}</span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {([
              ['stats', '选手数据'],
              ['rounds', '回合'],
              ['kills', '击杀'],
              ['clutches', 'Clutches'],
              ['economies', '经济'],
            ] as const).map(([k, label]) => (
              <div key={k} className="p-2 rounded bg-black/30">
                <div className="text-base font-black text-primary">{result.counts[k]}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2 text-xs">
            <a href={`/matches/${result.matchId}`} className="text-primary underline">查看比赛 →</a>
          </div>
        </div>
      )}
    </div>
  )
}
