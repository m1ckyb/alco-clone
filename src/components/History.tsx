import React from 'react';
import { useAppContext } from '../context/AppContext';

const History: React.FC = () => {
  const { drinks, removeDrink, clearHistory } = useAppContext();

  const sortedDrinks = [...drinks].sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="history">
      <div className="history-header">
        <h2>History</h2>
        {drinks.length > 0 && (
          <button className="clear-btn" onClick={clearHistory}>Clear All</button>
        )}
      </div>

      {drinks.length === 0 ? (
        <div className="empty-state card">
          <p>No drinks logged yet.</p>
        </div>
      ) : (
        <div className="drinks-list">
          {sortedDrinks.map(drink => (
            <div key={drink.id} className="drink-item card">
              <div className="drink-info">
                <strong>{drink.name || 'Custom Drink'}</strong>
                <span>{formatDate(drink.timestamp)}</span>
                <span className="details">{drink.volume}ml • {drink.abv}%</span>
              </div>
              <button className="delete-btn" onClick={() => removeDrink(drink.id)}>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .history {
          padding-bottom: 80px;
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
        .drink-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
        }
        .drink-info {
          display: flex;
          flex-direction: column;
        }
        .drink-info strong { font-size: 1rem; }
        .drink-info span { font-size: 0.75rem; opacity: 0.7; }
        .drink-info .details { opacity: 1; margin-top: 2px; }
        .delete-btn {
          background: transparent;
          color: var(--error);
          font-size: 1.5rem;
          padding: 0 var(--spacing-sm);
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
