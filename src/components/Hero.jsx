import React from 'react';

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="hero-title">
        Analyze &amp; Optimize
        <br />
        <span className="gradient-text">Your LLM Prompts</span>
      </h1>
      <p className="hero-subtitle">
        Get token-level heatmaps, smart filler removal, real cost savings, and
        side-by-side prompt comparison — all in one dashboard.
      </p>
    </section>
  );
}
