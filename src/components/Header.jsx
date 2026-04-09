import React from 'react';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="logo">
          <svg
            className="logo-icon"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
            <path
              d="M8 10h16M8 16h10M8 22h13"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="24" cy="22" r="3" fill="#fff" opacity="0.8" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="logo-text">
            Token<span className="logo-accent">Scope</span>
          </span>
        </div>
        <nav className="header-badges" aria-label="Tech stack badges">
          <span className="badge">React</span>
          <span className="badge">FastAPI</span>
          <span className="badge">TF-IDF</span>
          <span className="badge badge-green">v3.0</span>
        </nav>
      </div>
    </header>
  );
}
