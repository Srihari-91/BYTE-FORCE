import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { history } from '../api'

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    const dur = 950
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const eased = 1 - (1 - p) ** 3
      setDisplay(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span>{display.toLocaleString()}</span>
}

export function HistoryPanel({ sessionId }: { sessionId: string | null }) {
  const [dash, setDash] = useState<{
    totals: Record<string, number>
    runs: Array<Record<string, unknown>>
  } | null>(null)

  useEffect(() => {
    if (!sessionId) return
    void (async () => {
      try {
        const d = await history(sessionId)
        setDash({ totals: d.totals || {}, runs: d.runs || d.query_history || [] })
      } catch {
        setDash(null)
      }
    })()
  }, [sessionId])

  const runs = dash?.runs || []
  const totals = dash?.totals || {}

  const sparkData = useMemo(() => {
    return runs.map((r, i) => ({
      i: i + 1,
      o: Number(r.original_tokens ?? r.tokens_used ?? 0),
      t: Number(r.trimmed_tokens ?? 0),
      s: Number(r.saved_tokens ?? 0),
    }))
  }, [runs])

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="stat-grid glass" style={{ padding: '1rem' }}>
        <div className="stat-tile">
          <span className="stat-k">Total original</span>
          <span className="stat-v">
            <AnimatedNumber value={Number(totals.total_original ?? 0)} />
          </span>
          <div className="spark-h">
            <ResponsiveContainer>
              <LineChart data={sparkData}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="o" stroke="#00f0ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-k">Total trimmed</span>
          <span className="stat-v">
            <AnimatedNumber value={Number(totals.total_trimmed ?? 0)} />
          </span>
          <div className="spark-h">
            <ResponsiveContainer>
              <LineChart data={sparkData}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Line type="monotone" dataKey="t" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="stat-tile glow-pulse">
          <span className="stat-k">Total saved</span>
          <span className="stat-v" style={{ color: 'var(--mint)' }}>
            <AnimatedNumber value={Number(totals.total_saved ?? 0)} />
          </span>
          <div className="spark-h">
            <ResponsiveContainer>
              <LineChart data={sparkData}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Line type="monotone" dataKey="s" stroke="#00ffaa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-k">Avg savings %</span>
          <span className="stat-v">
            <AnimatedNumber value={Number(totals.avg_savings_pct ?? 0)} />%
          </span>
          <div className="spark-h">
            <ResponsiveContainer>
              <LineChart data={sparkData}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Line type="monotone" dataKey="s" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel glass">
        <h3 className="panel-h3">Runs over time</h3>
        <div className="chart-box chart-tall">
          <ResponsiveContainer>
            <LineChart data={sparkData}>
              <XAxis dataKey="i" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  background: 'rgba(8,12,32,0.95)',
                  border: '1px solid rgba(0,240,255,0.2)',
                  borderRadius: 10,
                }}
              />
              <Line type="monotone" dataKey="o" name="Original" stroke="#00f0ff" dot={false} />
              <Line type="monotone" dataKey="t" name="Trimmed" stroke="#8b5cf6" dot={false} />
              <Line type="monotone" dataKey="s" name="Saved" stroke="#00ffaa" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel glass table-panel">
        <h3 className="panel-h3">Run log</h3>
        <div className="table-wrap" style={{ maxHeight: 480 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Preview</th>
                <th>Model</th>
                <th>Orig</th>
                <th>Trim</th>
                <th>Saved</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((row) => (
                <tr key={String(row.query_id)}>
                  <td>{String(row.query_id)}</td>
                  <td>{String(row.prompt_preview || '').slice(0, 80)}</td>
                  <td>{String(row.model || '')}</td>
                  <td>{String(row.original_tokens ?? row.tokens_used ?? '—')}</td>
                  <td>{String(row.trimmed_tokens ?? '—')}</td>
                  <td>{String(row.saved_tokens ?? '—')}</td>
                  <td>
                    <span
                      className="pill"
                      style={{
                        background: 'rgba(0,255,170,0.15)',
                        borderColor: 'rgba(0,255,170,0.35)',
                        color: 'var(--mint)',
                      }}
                    >
                      {String(row.savings_pct ?? '—')}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!runs.length && (
          <p className="placeholder-text" style={{ color: 'var(--muted)', marginTop: 8 }}>
            Run Analyzer to populate history for this session.
          </p>
        )}
      </div>
    </motion.section>
  )
}
