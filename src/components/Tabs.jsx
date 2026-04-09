import React from 'react';

const tabs = [
  { id: 'analyzer', label: 'Analyzer', icon: '🔍' },
  { id: 'compare', label: 'Compare', icon: '⚖️' },
  { id: 'conversation', label: 'Conversation', icon: '💬' },
  { id: 'history', label: 'History', icon: '📊' },
];

export default function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="tabs-container">
      <div className="tabs-list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
