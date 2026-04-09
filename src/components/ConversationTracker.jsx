import React, { useState } from 'react';
import {
  countTokens,
  trimPrompt,
  calculateCost,
  formatUSD,
  MODEL_PRICING,
} from '../utils/tokenizer';

export default function ConversationTracker() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [role, setRole] = useState('user');
  const [model, setModel] = useState('gpt-4o-mini');

  const addMessage = () => {
    if (!newMessage.trim()) return;

    const pricing = MODEL_PRICING[model];
    const tokens = countTokens(newMessage);
    const trimmed = trimPrompt(newMessage);
    const trimmedTokens = countTokens(trimmed);
    const cost = calculateCost(tokens, role === 'user' ? pricing.input : pricing.output);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role,
        text: newMessage,
        tokens,
        trimmedTokens,
        cost,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setNewMessage('');
  };

  const clearConversation = () => {
    setMessages([]);
  };

  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const totalTokens = messages.reduce((sum, m) => sum + m.tokens, 0);
  const totalCost = messages.reduce((sum, m) => sum + m.cost, 0);
  const savedTokens = messages.reduce((sum, m) => sum + (m.tokens - m.trimmedTokens), 0);

  return (
    <section className="panel glass-panel conversation-panel" aria-label="Conversation tracker">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          💬 Multi-Turn Conversation Tracker
        </h2>
        <div className="controls-row">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="model-select-small">
            {Object.entries(MODEL_PRICING).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={clearConversation}>
            Clear
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="conversation-stats">
        <div className="conv-stat">
          <span className="conv-stat-label">Messages</span>
          <span className="conv-stat-value">{messages.length}</span>
        </div>
        <div className="conv-stat">
          <span className="conv-stat-label">User</span>
          <span className="conv-stat-value">{userMessages.length}</span>
        </div>
        <div className="conv-stat">
          <span className="conv-stat-label">Assistant</span>
          <span className="conv-stat-value">{assistantMessages.length}</span>
        </div>
        <div className="conv-stat">
          <span className="conv-stat-label">Total Tokens</span>
          <span className="conv-stat-value">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="conv-stat">
          <span className="conv-stat-label">Est. Cost</span>
          <span className="conv-stat-value">{formatUSD(totalCost)}</span>
        </div>
        <div className="conv-stat highlight">
          <span className="conv-stat-label">Tokens Saved</span>
          <span className="conv-stat-value">{savedTokens.toLocaleString()}</span>
        </div>
      </div>

      {/* Message List */}
      <div className="conversation-messages">
        {messages.length === 0 ? (
          <p className="placeholder-text">
            Add messages to track token usage across the conversation…
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message-card ${msg.role}`}>
              <div className="message-header">
                <span className={`message-role ${msg.role}`}>
                  {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                </span>
                <span className="message-time">{msg.timestamp}</span>
              </div>
              <div className="message-text">{msg.text}</div>
              <div className="message-stats">
                <span>{msg.tokens} tokens</span>
                <span>{formatUSD(msg.cost)}</span>
                <span className="savings">
                  Save {msg.tokens - msg.trimmedTokens} tokens with trim
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="conversation-input">
        <div className="input-row">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="role-select">
            <option value="user">👤 User</option>
            <option value="assistant">🤖 Assistant</option>
          </select>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addMessage();
              }
            }}
          />
          <button className="btn btn-primary" onClick={addMessage} disabled={!newMessage.trim()}>
            Add
          </button>
        </div>
      </div>
    </section>
  );
}
