import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts'
import { compare } from '../api'

type DiffRow = {
  index: number
  word: string
  in_a: boolean
  in_b: boolean
  status: string
}

type CompareData = {
  prompt_a: { tokens: number; cost_usd: number; repetition_rate: number; lexical_diversity: number }
  prompt_b: { tokens: number; cost_usd: number; repetition_rate: number; lexical_diversity: number }
  more_cost_efficient: string
  token_difference: number
  cost_difference_usd: number
  radar_a: Record<string, number>
  radar_b: Record<string, number>
  scoreboard_a: number
  scoreboard_b: number
  verdict_winner: string
  verdict_text: string
  noise_words_a: number
  noise_words_b: number
  token_savings_prompt_a_vs_b: number
  cost_pct_a_vs_b: number
  word_diff: { rows: DiffRow[]; total_estimated: number; returned: number }
}

const RADAR_KEYS = [
  { key: 'token_efficiency', label: 'Token eff.' },
  { key: 'noise_ratio', label: 'Noise ratio' },
  { key: 'clarity_score', label: 'Clarity' },
  { key: 'cost', label: 'Cost' },
  { key: 'brevity', label: 'Brevity' },
]

function rowClass(status: string) {
  if (status === 'common') return 'row-common'
  if (status === 'a_only') return 'row-a'
  if (status === 'b_only') return 'row-b'
  if (status === 'noise') return 'row-noise'
  return ''
}

export function ComparePanel({
  model,
  onToast,
}: {
  model: string
  onToast: (msg: string) => void
}) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CompareData | null>(null)
  const [filter, setFilter] = useState<'all' | 'common' | 'diff' | 'noise'>('all')

  async function run() {
    const pa = a.trim()
    const pb = b.trim()
    if (!pa || !pb) {
      onToast('Both prompts required.')
      return
    }
    setLoading(true)
    try {
      const res = (await compare({ prompt_a: pa, prompt_b: pb, model })) as CompareData
      setData(res)
    } catch (e) {
      onToast((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const rows = data?.word_diff?.rows || []
    if (filter === 'all') return rows
    if (filter === 'common') return rows.filter((r) => r.status === 'common')
    if (filter === 'diff') return rows.filter((r) => r.status === 'a_only' || r.status === 'b_only')
    if (filter === 'noise') return rows.filter((r) => r.status === 'noise')
    return rows
  }, [data, filter])

  const radarData = useMemo(() => {
    if (!data) return []
    return RADAR_KEYS.map(({ key, label }) => ({
      metric: label,
      A: data.radar_a[key],
      B: data.radar_b[key],
    }))
  }, [data])

  const winA = data?.verdict_winner === 'A'
  const winB = data?.verdict_winner === 'B'

  const listWrapRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => listWrapRef.current,
    estimateSize: () => 36,
    overscan: 12,
  })

  useEffect(() => {
    listWrapRef.current?.scrollTo({ top: 0 })
  }, [filter, data?.word_diff])

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="panel glass">
        <div className="panel-head">
          <h2 className="panel-h2">Compare prompts</h2>
          <button type="button" className="btn" disabled={loading} onClick={() => void run()}>
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </div>
        <div className="compare-grid">
          <div className={`panel glass compare-cell ${winA ? 'winner' : ''}`}>
            <label htmlFor="cmp-a">Prompt A</label>
            <textarea
              id="cmp-a"
              className="dash-textarea"
              rows={8}
              value={a}
              onChange={(e) => setA(e.target.value)}
            />
          </div>
          <div className={`panel glass compare-cell ${winB ? 'winner' : ''}`}>
            <label htmlFor="cmp-b">Prompt B</label>
            <textarea
              id="cmp-b"
              className="dash-textarea"
              rows={8}
              value={b}
              onChange={(e) => setB(e.target.value)}
            />
          </div>
        </div>
      </div>

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <div className="panel glass">
            <h3 className="panel-h3">Word / token diff</h3>
            <div className="filters">
              {(
                [
                  ['all', 'Show all'],
                  ['common', 'Common only'],
                  ['diff', 'Differences only'],
                  ['noise', 'Noise only'],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  className={`filter-btn ${filter === k ? 'active' : ''}`}
                  onClick={() => setFilter(k)}
                >
                  {lab}
                </button>
              ))}
            </div>
            <div
              className="table-wrap"
              ref={listWrapRef}
              style={{ maxHeight: 380, overflow: 'auto', position: 'relative' }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--muted)',
                  padding: '0.35rem 0.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  position: 'sticky',
                  top: 0,
                  background: 'rgba(8,12,32,0.96)',
                  zIndex: 2,
                }}
              >
                <div style={{ width: '8%' }}>#</div>
                <div style={{ width: '28%' }}>Word</div>
                <div style={{ width: '18%' }}>In A</div>
                <div style={{ width: '18%' }}>In B</div>
                <div style={{ width: '28%' }}>Status</div>
              </div>
              {filteredRows.length ? (
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((vi) => {
                    const r = filteredRows[vi.index]
                    if (!r) return null
                    return (
                      <div
                        key={vi.key}
                        className={rowClass(r.status)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: vi.size,
                          transform: `translateY(${vi.start}px)`,
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 0.5rem',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ width: '8%' }}>{r.index}</div>
                        <div style={{ width: '28%', fontWeight: 600 }}>{r.word}</div>
                        <div style={{ width: '18%' }}>{r.in_a ? '✓' : '—'}</div>
                        <div style={{ width: '18%' }}>{r.in_b ? '✓' : '—'}</div>
                        <div style={{ width: '28%', fontSize: '0.8rem' }}>{r.status}</div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ padding: '1rem', color: 'var(--muted)' }}>No rows for this filter.</p>
              )}
            </div>
          </div>

          <div className="two-col" style={{ marginTop: '1rem' }}>
            <div className="panel glass">
              <h3 className="panel-h3">Which is better? — Radar</h3>
              <div className="chart-box">
                <ResponsiveContainer>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.12)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar name="A" dataKey="A" stroke="#00f0ff" fill="rgba(0,240,255,0.25)" />
                    <Radar name="B" dataKey="B" stroke="#ff6b4a" fill="rgba(255,107,74,0.2)" />
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(8,12,32,0.95)',
                        border: '1px solid rgba(0,240,255,0.25)',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel glass">
              <h3 className="panel-h3">Scoreboard /100</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 8 }}>
                <div
                  className="podium-card glass"
                  style={{
                    textAlign: 'center',
                    borderColor: winA ? 'rgba(0,255,170,0.55)' : undefined,
                    boxShadow: winA ? '0 0 28px rgba(0,255,170,0.2)' : undefined,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Prompt A</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: '2.2rem', color: '#00f0ff' }}>
                    {data.scoreboard_a}
                  </div>
                </div>
                <div
                  className="podium-card glass"
                  style={{
                    textAlign: 'center',
                    borderColor: winB ? 'rgba(0,255,170,0.55)' : undefined,
                    boxShadow: winB ? '0 0 28px rgba(0,255,170,0.2)' : undefined,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Prompt B</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: '2.2rem', color: '#ff6b4a' }}>
                    {data.scoreboard_b}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="podium">
            <div className={`podium-card glass ${winA ? 'win' : ''}`}>
              {winA && <div className="crown">👑</div>}
              <h3 className="panel-h3">Verdict — Prompt A</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                Tokens {data.prompt_a.tokens} · {data.prompt_a.cost_usd.toFixed(6)} USD · noise words ~{' '}
                {data.noise_words_a}
              </p>
            </div>
            <div className={`podium-card glass ${winB ? 'win' : ''}`}>
              {winB && <div className="crown">👑</div>}
              <h3 className="panel-h3">Verdict — Prompt B</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                Tokens {data.prompt_b.tokens} · {data.prompt_b.cost_usd.toFixed(6)} USD · noise words ~{' '}
                {data.noise_words_b}
              </p>
            </div>
          </div>

          <div className="panel glass" style={{ marginTop: '1rem', borderColor: 'rgba(0,255,170,0.35)' }}>
            <h3 className="panel-h3">Mission verdict</h3>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
              Winner: <strong style={{ color: 'var(--mint)' }}>{data.verdict_winner}</strong> · Δ tokens{' '}
              {data.token_savings_prompt_a_vs_b} (A vs B) · Δ cost {data.cost_pct_a_vs_b}% (A vs B) · Noise A/B{' '}
              {data.noise_words_a}/{data.noise_words_b}
            </p>
            <p style={{ marginTop: '0.75rem', color: 'var(--text)' }}>{data.verdict_text}</p>
          </div>
        </motion.div>
      )}
    </motion.section>
  )
}
