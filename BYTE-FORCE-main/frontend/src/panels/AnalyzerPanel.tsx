import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { analyze, exportPdf } from '../api'

function formatUSD(v: number) {
  if (v === 0) return '$0.000000'
  if (Math.abs(v) < 0.0001) return `$${v.toExponential(2)}`
  return `$${v.toFixed(6)}`
}

function scoreToHeatColor(score: number) {
  if (score < 0.12) return 'rgba(71, 85, 105, 0.55)'
  if (score < 0.35) return 'rgba(100, 116, 139, 0.65)'
  if (score < 0.55) return 'rgba(34, 211, 238, 0.45)'
  if (score < 0.78) return 'rgba(251, 146, 60, 0.65)'
  return 'rgba(248, 113, 113, 0.75)'
}

function buildPieData(useful: number, noise: number) {
  if (noise <= 0) {
    return [{ name: 'Useful', value: Math.max(1, useful), actualU: useful, actualN: 0 }]
  }
  const total = useful + noise
  const minNoiseFrac = 0.03
  const displayNoise = Math.max(noise, total * minNoiseFrac)
  const displayUseful = Math.max(0, total - displayNoise)
  return [
    { name: 'Useful', value: displayUseful, actualU: useful, actualN: noise },
    { name: 'Noise', value: displayNoise, actualU: useful, actualN: noise },
  ]
}

type Tok = {
  text: string
  score: number
  tfidf?: number
  freq?: number
  pos?: string | null
}

export function AnalyzerPanel({
  model,
  sessionId,
  onResult,
  onToast,
}: {
  model: string
  sessionId: string | null
  onResult: (data: Record<string, unknown>) => void
  onToast: (msg: string) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number; tok: Tok } | null>(null)
  const [copied, setCopied] = useState(false)

  const run = useCallback(async () => {
    const p = prompt.trim()
    if (!p) {
      onToast('Enter a prompt to analyze.')
      return
    }
    setLoading(true)
    try {
      const body: { prompt: string; model: string; session_id?: string } = { prompt: p, model }
      if (sessionId) body.session_id = sessionId
      const res = await analyze(body)
      setData(res)
      onResult(res)
    } catch (e) {
      onToast((e as Error).message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [prompt, model, sessionId, onResult, onToast])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      void run()
    }
  }

  const useful = Number(data?.useful_token_words ?? 0)
  const noise = Number(data?.noise_token_words ?? 0)
  const pieData = useMemo(() => buildPieData(useful, noise), [useful, noise])
  const noisePct =
    useful + noise > 0 ? Math.round((100 * noise) / (useful + noise)) : 0

  const pos = (data?.pos_tags as Record<string, number>) || {}
  const posChart = [
    { name: 'Nouns', v: pos.noun || 0 },
    { name: 'Verbs', v: pos.verb || 0 },
    { name: 'Adj', v: pos.adj || 0 },
    { name: 'Adv', v: pos.adv || 0 },
    { name: 'Other', v: pos.other || 0 },
  ]

  const orig = Number(data?.original_tokens ?? 0)
  const trim = Number(data?.trimmed_tokens ?? 0)

  const tokenData = (data?.token_data as Tok[]) || []

  async function handlePdf() {
    if (!data) return
    try {
      const blob = await exportPdf({
        prompt: data.prompt,
        trimmed_prompt: data.trimmed_prompt || data.optimized_prompt,
        model: data.model,
        original_tokens: data.original_tokens,
        trimmed_tokens: data.trimmed_tokens,
        cost_original_usd: data.cost_original_usd,
        cost_trimmed_usd: data.cost_trimmed_usd,
        saved_tokens: data.saved_tokens,
        savings_percentage: data.savings_percentage,
        token_data: data.token_data,
        tfidf_top_terms: data.tfidf_top_terms,
        pos_tags: data.pos_tags,
        noise_level: data.noise_level,
        noise_words: data.noise_words,
        efficiency_score: data.efficiency_score,
        repetition: data.repetition,
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'tokenscope_report.pdf'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      onToast((e as Error).message || 'PDF error')
    }
  }

  function exportJson() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'tokenscope_analysis.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function copyOpt() {
    const t = String(data?.optimized_prompt || data?.trimmed_prompt || '')
    if (!t) return
    await navigator.clipboard.writeText(t)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="panel glass">
        <div className="panel-head">
          <h2 className="panel-h2">Prompt input</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={() => void run()} disabled={loading}>
              {loading ? 'Running…' : 'Analyze'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={!data} onClick={() => void handlePdf()}>
              PDF
            </button>
            <button type="button" className="btn btn-ghost" disabled={!data} onClick={exportJson}>
              JSON
            </button>
          </div>
        </div>
        <p className="pricing-inline">Ctrl+Enter to analyze · local session only</p>
        <textarea
          id="prompt-input"
          className="dash-textarea"
          rows={10}
          placeholder="Paste your prompt…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="chips">
          <button
            type="button"
            className="chip"
            onClick={() =>
              setPrompt(
                'Could you please kindly help me write a very detailed Python script for image classification? I was wondering if you could add comments.',
              )
            }
          >
            Verbose
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setPrompt('Summarize this article in under 100 words, main points only.')}
          >
            Concise
          </button>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            className="panel glass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: '1rem' }}
          >
            <div className="skeleton" style={{ height: 120, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 220 }} />
          </motion.div>
        )}
      </AnimatePresence>

      {data && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="stat-grid glass" style={{ padding: '1rem' }}>
            <div className="stat-tile">
              <span className="stat-k">Total tokens</span>
              <span className="stat-v">{Number(data.total_tokens).toLocaleString()}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-k">Unique (BPE)</span>
              <span className="stat-v">{Number(data.unique_tokens ?? 0).toLocaleString()}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-k">Unique words</span>
              <span className="stat-v">{Number(data.unique_words ?? 0).toLocaleString()}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-k">Repetition rate</span>
              <span className="stat-v">{`${((Number(data.repetition_rate) || 0) * 100).toFixed(1)}%`}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-k">Stopword %</span>
              <span className="stat-v">{`${data.stopword_pct ?? 0}%`}</span>
            </div>
            <div className="stat-tile" style={{ borderColor: 'rgba(0,255,170,0.35)' }}>
              <span className="stat-k">Efficiency score</span>
              <span className="stat-v">{String(data.efficiency_score ?? '—')}</span>
            </div>
          </div>

          <div className="two-col">
            <div className="panel glass">
              <h3 className="panel-h3">Cost</h3>
              <div className="cost-row">
                <span>Before</span>
                <strong>{formatUSD(Number(data.cost_before ?? data.cost_original_usd))}</strong>
              </div>
              <div className="cost-row">
                <span>After</span>
                <strong>{formatUSD(Number(data.cost_after ?? data.cost_trimmed_usd))}</strong>
              </div>
              <div className="cost-row save">
                <span>Tokens saved</span>
                <strong>{Number(data.tokens_saved ?? data.saved_tokens).toLocaleString()} tok</strong>
              </div>
              <div className="cost-row save">
                <span>Reduction</span>
                <strong>{`${Number(data.savings_percentage ?? 0).toFixed(1)}%`}</strong>
              </div>
            </div>
            <div className="panel glass">
              <h3 className="panel-h3">Noise &amp; repetition</h3>
              <p style={{ marginBottom: 8 }}>{`Noise level: ${data.noise_level || '—'}`}</p>
              <p className="micro-label">Suggested removals</p>
              <div className="pill-list">
                {((data.noise_suggested_removals as string[]) || (data.noise_words as string[]) || []).length ? (
                  ((data.noise_suggested_removals as string[]) || (data.noise_words as string[]) || []).map(
                    (w) => (
                      <span key={w} className="pill">
                        {w}
                      </span>
                    ),
                  )
                ) : (
                  <span className="pill">—</span>
                )}
              </div>
              <p className="micro-label">Top repeats</p>
              <div className="pill-list mono">
                {Object.entries((data.repetition as Record<string, number>) || {})
                  .slice(0, 12)
                  .map(([w, c]) => (
                    <span key={w} className="pill">
                      {w} ×{c}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="panel glass">
            <h3 className="panel-h3">
              POS distribution{' '}
              <span className="badge-soft">
                {Object.values(pos).reduce((a, b) => a + b, 0) > 0 ? 'spaCy' : 'install en_core_web_sm'}
              </span>
            </h3>
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={posChart}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Bar dataKey="v" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel glass">
            <h3 className="panel-h3">Useful vs noise (words)</h3>
            <div className="chart-box chart-box-pie" style={{ position: 'relative' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        stroke="rgba(0,0,0,0.35)"
                        fill={entry.name === 'Useful' ? '#00ffaa' : '#ff6b4a'}
                        style={{
                          filter:
                            entry.name === 'Useful'
                              ? 'drop-shadow(0 0 14px rgba(0,255,170,0.55))'
                              : 'drop-shadow(0 0 14px rgba(255,107,74,0.55))',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0].payload as {
                        name: string
                        actualU: number
                        actualN: number
                      }
                      const isNoise = row.name === 'Noise'
                      const cnt = isNoise ? row.actualN : row.actualU
                      const pct = isNoise ? noisePct : 100 - noisePct
                      return (
                        <div
                          className="glass"
                          style={{ padding: '0.5rem 0.65rem', fontSize: '0.8rem', borderRadius: 10 }}
                        >
                          <div style={{ fontWeight: 600 }}>{row.name}</div>
                          <div>Count: {cnt}</div>
                          <div>Share: {pct}%</div>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  fontFamily: 'var(--font-head)',
                  fontSize: '0.95rem',
                  color: '#ff6b4a',
                  textShadow: '0 0 18px rgba(255,107,74,0.45)',
                }}
              >
                {noise > 0 ? `${noisePct}% noise` : '0% noise'}
              </div>
            </div>
          </div>

          <div className="panel glass">
            <h3 className="panel-h3">Original vs optimized (tokens)</h3>
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={[{ name: 'Original', v: orig }, { name: 'Optimized', v: trim }]}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Bar dataKey="v" radius={[10, 10, 0, 0]}>
                    <Cell fill="#8b5cf6" />
                    <Cell fill="#00ffaa" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel glass heatmap-panel">
            <div className="panel-head">
              <h3 className="panel-h3">Token importance</h3>
              <div className="legend-dash">
                <span className="lg lg-low">Noise</span>
                <span className="lg lg-mid">Context</span>
                <span className="lg lg-hi">Important</span>
                <span className="lg lg-max">Critical</span>
              </div>
            </div>
            <div
              className="heatmap-box"
              onMouseLeave={() => setTip(null)}
            >
              {tokenData.map((tok, i) => (
                <span
                  key={`${i}-${tok.text}`}
                  className="token-span"
                  style={{
                    backgroundColor: scoreToHeatColor(tok.score),
                    color: tok.score < 0.35 ? '#cbd5e1' : '#fff',
                  }}
                  onMouseEnter={(e) =>
                    setTip({
                      x: e.clientX,
                      y: e.clientY,
                      tok,
                    })
                  }
                  onMouseMove={(e) =>
                    setTip({
                      x: e.clientX,
                      y: e.clientY,
                      tok,
                    })
                  }
                >
                  {tok.text}
                </span>
              ))}
            </div>
          </div>

          <div className="panel glass">
            <div className="panel-head">
              <h3 className="panel-h3">Optimized prompt</h3>
              <button type="button" className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem' }} onClick={() => void copyOpt()}>
                {copied ? 'Copied ✓' : 'Copy optimized'}
              </button>
            </div>
            <pre className="opt-pre">{String(data.optimized_prompt || data.trimmed_prompt || '')}</pre>
          </div>
        </motion.div>
      )}

      {tip && (
        <div
          className="token-tooltip visible"
          style={{
            left: Math.min(tip.x + 12, typeof window !== 'undefined' ? window.innerWidth - 300 : tip.x),
            top: tip.y + 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{`"${String(tip.tok.text).replace(/\n/g, '↵')}"`}</div>
          <div>TF-IDF {tip.tok.tfidf != null ? String(tip.tok.tfidf) : '—'}</div>
          <div>Freq {tip.tok.freq != null ? String(tip.tok.freq) : '—'}</div>
          <div>POS {tip.tok.pos || '—'}</div>
          <div>Score {Math.round(tip.tok.score * 100)}%</div>
        </div>
      )}
    </motion.section>
  )
}
