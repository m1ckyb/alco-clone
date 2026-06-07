import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { groupIntoSessions, formatBAC } from '../utils/bac';
import type { Drink } from '../utils/bac';
import BACGraph from './BACGraph';
import ConfirmModal from './ConfirmModal';

const History: React.FC<{ onEditClick: (drink: Drink) => void }> = ({ onEditClick }) => {
  const { drinks, profile, removeDrink, clearHistory } = useAppContext();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const sessions = groupIntoSessions(drinks, profile);

  const totalDrinks = drinks.length;
  const totalAlcohol = sessions.reduce((sum, s) => sum + s.totalAlcoholGrams, 0);
  const totalStandardDrinks = totalAlcohol / 10;
  
  const firstDrinkTime = drinks.length > 0 ? Math.min(...drinks.map(d => d.timestamp)) : Date.now();
  const msInWeek = 7 * 24 * 3600000;
  const weeksElapsed = Math.max(1, (Date.now() - firstDrinkTime) / msInWeek);
  
  const avgWeeklyDrinksCount = totalDrinks / weeksElapsed;
  const avgWeeklyStandardDrinks = totalStandardDrinks / weeksElapsed;
  const avgWeeklyAlcohol = totalAlcohol / weeksElapsed;
  
  const highestBAC = sessions.length > 0 ? Math.max(...sessions.map(s => s.peakBAC)) : 0;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString([], { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  return (
    <div className="history">
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear All History"
        message="Are you sure you want to permanently delete all drink history? This cannot be undone."
        confirmLabel="Yes, clear all"
        danger={true}
        onConfirm={() => { clearHistory(); setShowClearConfirm(false); }}
        onCancel={() => setShowClearConfirm(false)}
      />

      {drinks.length > 0 && (
        <div className="card stats-card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-sm)' }}>All-Time Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="label">Total Drinks</span>
              <strong>{totalDrinks} <small>({totalStandardDrinks.toFixed(1)} std)</small></strong>
            </div>
            <div className="stat-item">
              <span className="label">Avg Weekly Drinks</span>
              <strong>{avgWeeklyDrinksCount.toFixed(1)} <small>({avgWeeklyStandardDrinks.toFixed(1)} std)</small></strong>
            </div>
            <div className="stat-item">
              <span className="label">Total Alcohol</span>
              <strong>{totalAlcohol.toFixed(1)}g</strong>
            </div>
            <div className="stat-item">
              <span className="label">Avg Wkly Alcohol</span>
              <strong>{avgWeeklyAlcohol.toFixed(1)}g</strong>
            </div>
            <div className="stat-item" style={{ gridColumn: 'span 2' }}>
              <span className="label">Highest Recorded BAC</span>
              <strong style={{ color: 'var(--danger)' }}>{formatBAC(highestBAC, profile.displayUnit)}{profile.displayUnit}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="history-header">
        <h2>Sessions</h2>
        {drinks.length > 0 && (
          <button className="clear-btn" onClick={() => setShowClearConfirm(true)}>Clear All</button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state card">
          <p>No drinking sessions recorded yet.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map(session => (
            <div key={session.id} className="session-card card">
              <div className="session-summary" onClick={() => toggleSession(session.id)}>
                <div className="session-main-info">
                  <strong>{formatDate(session.startTime)}</strong>
                  <span className="session-time-range">
                    {formatTime(session.startTime)} — {formatTime(session.drinks[0].timestamp)}
                  </span>
                </div>
                <div className="session-stats-brief">
                  <div className="stat">
                    <span className="label">Peak</span>
                    <span className="value">{formatBAC(session.peakBAC, profile.displayUnit)}{profile.displayUnit}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Total</span>
                    <span className="value">{session.totalAlcoholGrams.toFixed(1)}g</span>
                  </div>
                  <div className="expand-icon">{expandedSession === session.id ? '−' : '+'}</div>
                </div>
              </div>

              {expandedSession === session.id && (
                <div className="session-details">
                  <BACGraph 
                    drinks={session.drinks} 
                    profile={profile} 
                    now={session.endTime} 
                    showNowLine={false}
                    title="Session BAC Curve"
                    minimal={true}
                  />
                  <div className="drinks-list">
                    {session.drinks.map(drink => (
                      <div key={drink.id} className="drink-item">
                        <div className="drink-info">
                          <span className="time">{formatTime(drink.timestamp)}</span>
                          <strong>{drink.name || 'Drink'}</strong>
                          <span className="details">{drink.volume}ml • {drink.abv}%</span>
                        </div>
                        <div className="drink-actions">
                          <button className="edit-btn" onClick={() => onEditClick(drink)}>
                            ✎
                          </button>
                          <button className="delete-btn" onClick={() => removeDrink(drink.id)}>
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .history {
          padding-bottom: 80px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.03);
          padding: 10px;
          border-radius: var(--border-radius);
        }
        .stat-item .label {
          font-size: 0.7rem;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 4px;
        }
        .stat-item strong {
          font-size: 1.1rem;
        }
        .stat-item small {
          font-weight: normal;
          opacity: 0.7;
          font-size: 0.8rem;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        .clear-btn {
          background: transparent;
          color: var(--error);
          font-size: 0.8rem;
          padding: 4px 8px;
        }
        .session-card {
          padding: 0;
          overflow: hidden;
          margin-bottom: var(--spacing-sm);
        }
        .session-summary {
          padding: var(--spacing-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .session-main-info {
          display: flex;
          flex-direction: column;
        }
        .session-time-range {
          font-size: 0.75rem;
          opacity: 0.6;
        }
        .session-stats-brief {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
        }
        .session-stats-brief .stat {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .session-stats-brief .label {
          font-size: 0.6rem;
          text-transform: uppercase;
          opacity: 0.5;
        }
        .session-stats-brief .value {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--primary);
        }
        .expand-icon {
          font-size: 1.2rem;
          opacity: 0.4;
          width: 20px;
          text-align: center;
        }
        .session-details {
          background: rgba(255,255,255,0.02);
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: var(--spacing-sm) var(--spacing-md);
        }
        .drink-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .drink-item:last-child {
          border-bottom: none;
        }
        .drink-info {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.85rem;
        }
        .drink-info .time {
          font-size: 0.75rem;
          opacity: 0.5;
          min-width: 55px;
        }
        .drink-info .details {
          opacity: 0.6;
        }
        .drink-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .edit-btn {
          background: transparent;
          color: var(--primary);
          font-size: 1rem;
          opacity: 0.6;
          padding: 4px;
        }
        .delete-btn {
          background: transparent;
          color: var(--error);
          font-size: 1.2rem;
          padding: 4px;
        }
        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default History;
