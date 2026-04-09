import React, { useState, useCallback } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Tabs from './components/Tabs.jsx';
import InputPanel from './components/InputPanel.jsx';
import StatsRow from './components/StatsRow.jsx';
import TokenChart from './components/TokenChart.jsx';
import Heatmap from './components/Heatmap.jsx';
import TrimmedPrompt from './components/TrimmedPrompt.jsx';
import ComparePanel from './components/ComparePanel.jsx';
import ConversationTracker from './components/ConversationTracker.jsx';
import HistoryChart from './components/HistoryChart.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import Footer from './components/Footer.jsx';
import {
  computeTokenScores,
  trimPrompt,
  countTokens,
  calculateCost,
  MODEL_PRICING,
} from './utils/tokenizer';

export default function App() {
  // Tab state
  const [activeTab, setActiveTab] = useState('analyzer');

  // Analyzer state
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [trimmed, setTrimmed] = useState('');
  const [tokenData, setTokenData] = useState([]);

  // History state
  const [history, setHistory] = useState([]);

  // Analyze handler
  const handleAnalyze = useCallback(() => {
    if (!prompt.trim()) return;

    setLoading(true);

    // Simulate processing delay for UX
    setTimeout(() => {
      try {
        const pricing = MODEL_PRICING[model];
        const inputPrice = pricing.input;

        // Tokenize and score
        const tokens = computeTokenScores(prompt);
        const originalTokens = countTokens(prompt);

        // Trim
        const trimmedText = trimPrompt(prompt);
        const trimmedTokens = countTokens(trimmedText);

        // Costs
        const costOriginal = calculateCost(originalTokens, inputPrice);
        const costTrimmed = calculateCost(trimmedTokens, inputPrice);
        const savingsPct = originalTokens > 0
          ? ((originalTokens - trimmedTokens) / originalTokens) * 100
          : 0;

        const newStats = {
          original_tokens: originalTokens,
          trimmed_tokens: trimmedTokens,
          cost_original_usd: costOriginal,
          cost_trimmed_usd: costTrimmed,
          model: model,
          savings_percentage: savingsPct,
        };

        setStats(newStats);
        setTrimmed(trimmedText);
        setTokenData(tokens);

        // Add to history
        setHistory((prev) => [
          ...prev,
          {
            prompt: prompt,
            model: model,
            original_tokens: originalTokens,
            trimmed_tokens: trimmedTokens,
            cost_original_usd: costOriginal,
            cost_trimmed_usd: costTrimmed,
            savings_percentage: savingsPct,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error('Analysis error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [prompt, model]);

  return (
    <div className="app-wrapper">
      {/* Background Orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="page-wrapper">
        <Header />
        <Hero />

        {/* Tab Navigation */}
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="main-content">
          {/* ═══ ANALYZER TAB ═══ */}
          {activeTab === 'analyzer' && (
            <>
              <InputPanel
                prompt={prompt}
                setPrompt={setPrompt}
                model={model}
                setModel={setModel}
                onAnalyze={handleAnalyze}
                loading={loading}
              />

              <StatsRow stats={stats} />

              <TokenChart
                originalTokens={stats?.original_tokens}
                trimmedTokens={stats?.trimmed_tokens}
              />

              <Heatmap tokenData={tokenData} />

              <TrimmedPrompt original={prompt} trimmed={trimmed} />

              <ExportPanel
                stats={stats}
                original={prompt}
                trimmed={trimmed}
                tokenData={tokenData}
                history={history}
              />
            </>
          )}

          {/* ═══ COMPARE TAB ═══ */}
          {activeTab === 'compare' && <ComparePanel />}

          {/* ═══ CONVERSATION TAB ═══ */}
          {activeTab === 'conversation' && <ConversationTracker />}

          {/* ═══ HISTORY TAB ═══ */}
          {activeTab === 'history' && <HistoryChart history={history} />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
