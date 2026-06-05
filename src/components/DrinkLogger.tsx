import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Drink } from '../utils/bac';

const DrinkLogger: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { presets, addDrink, addPreset } = useAppContext();
  const [isCustom, setIsCustom] = useState(false);
  const [customDrink, setCustomDrink] = useState({ name: '', volume: 330, abv: 5 });
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [timestamp, setTimestamp] = useState(() => Date.now());

  if (!isOpen) return null;

  // Helper to format Date for datetime-local input
  const toLocalISO = (ts: number) => {
    const date = new Date(ts);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  };

  const setOffset = (minutes: number) => {
    setTimestamp(Date.now() - minutes * 60 * 1000);
  };

  const handleAddPreset = (preset: Omit<Drink, 'id' | 'timestamp'>) => {
    addDrink({ ...preset, timestamp });
    onClose();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    addDrink({ ...customDrink, timestamp });
    if (saveAsPreset) {
      addPreset(customDrink);
    }
    setIsCustom(false);
    setSaveAsPreset(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h2>Add Drink</h2>

        <div className="time-selector">
          <label>Time of Consumption</label>
          <div className="quick-offsets">
            <button type="button" onClick={() => setTimestamp(Date.now())}>Now</button>
            <button type="button" onClick={() => setOffset(30)}>-30m</button>
            <button type="button" onClick={() => setOffset(60)}>-1h</button>
            <button type="button" onClick={() => setOffset(120)}>-2h</button>
          </div>
          <input 
            type="datetime-local" 
            value={toLocalISO(timestamp)} 
            onChange={e => setTimestamp(new Date(e.target.value).getTime())}
          />
        </div>
        
        {!isCustom ? (
          <div className="presets-grid">
            {presets.map((p, i) => (
              <button key={i} className="preset-btn" onClick={() => handleAddPreset(p)}>
                <strong>{p.name}</strong>
                <span>{p.volume}ml • {p.abv}%</span>
              </button>
            ))}
            <button className="preset-btn custom-toggle" onClick={() => setIsCustom(true)}>
              Custom...
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddCustom} className="custom-form">
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                value={customDrink.name} 
                onChange={e => setCustomDrink({...customDrink, name: e.target.value})} 
                placeholder="e.g. Cocktail"
                required
              />
            </div>
            <div className="form-group">
              <label>Volume (ml)</label>
              <input 
                type="number" 
                value={customDrink.volume} 
                onChange={e => setCustomDrink({...customDrink, volume: Number(e.target.value)})} 
                required
              />
            </div>
            <div className="form-group">
              <label>ABV (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={customDrink.abv} 
                onChange={e => setCustomDrink({...customDrink, abv: Number(e.target.value)})} 
                required
              />
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={saveAsPreset} 
                  onChange={e => setSaveAsPreset(e.target.checked)} 
                />
                Save as preset for future use
              </label>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setIsCustom(false)}>Back</button>
              <button type="submit" className="primary-btn">Add Drink</button>
            </div>
          </form>
        )}
        
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--spacing-md);
        }
        .modal-content {
          width: 100%;
          max-width: 400px;
          position: relative;
        }
        .time-selector {
          margin-top: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .time-selector label {
          font-size: 0.8rem;
          opacity: 0.8;
        }
        .quick-offsets {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-xs);
        }
        .quick-offsets button {
          padding: 4px;
          font-size: 0.8rem;
          background: var(--surface);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .time-selector input {
          width: 100%;
          padding: 8px;
          background: var(--background);
          border: 1px solid rgba(255,255,255,0.2);
          color: var(--on-background);
          border-radius: 4px;
        }
        .presets-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
          margin: var(--spacing-md) 0;
        }
        .preset-btn {
          display: flex;
          flex-direction: column;
          background: var(--background);
          color: var(--on-surface);
          border: 1px solid rgba(255,255,255,0.1);
          padding: var(--spacing-md);
        }
        .preset-btn strong { font-size: 1rem; }
        .preset-btn span { font-size: 0.8rem; opacity: 0.7; }
        .custom-toggle {
          background: var(--surface);
          border: 1px dashed var(--primary);
          color: var(--primary);
        }
        .custom-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .form-group label {
          display: block;
          font-size: 0.8rem;
          margin-bottom: 4px;
          opacity: 0.8;
        }
        .checkbox-group {
          margin-bottom: var(--spacing-sm);
        }
        .checkbox-label {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          opacity: 1 !important;
        }
        .checkbox-label input {
          width: auto !important;
          margin: 0;
        }
        .form-actions {
          display: flex;
          gap: var(--spacing-md);
        }
        .form-actions button { flex: 1; }
        .primary-btn { background: var(--primary); color: var(--on-primary); }
        .close-btn {
          width: 100%;
          margin-top: var(--spacing-md);
          background: transparent;
          color: var(--error);
        }
      `}</style>
    </div>
  );
};

export default DrinkLogger;
