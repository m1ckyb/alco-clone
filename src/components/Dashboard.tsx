import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateBAC, calculateTimeToZero, formatBAC } from '../utils/bac';
import BACGraph from './BACGraph';

const Dashboard: React.FC<{ onAddClick: () => void }> = ({ onAddClick }) => {
  const { drinks, profile } = useAppContext();
  const [currentBAC, setCurrentBAC] = useState(0);
  const [timeToZero, setTimeToZero] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      setCurrentBAC(calculateBAC(drinks, profile, currentTime));
      setTimeToZero(calculateTimeToZero(drinks, profile, currentTime));
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [drinks, profile]);

  const getStatusColor = (bac: number) => {
    if (bac === 0) return 'var(--safe)';
    if (bac < 0.05) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getStatusText = (bac: number) => {
    if (bac === 0) return 'Sober';
    if (bac < 0.05) return 'Below Limit';
    if (bac < 0.08) return 'Impaired';
    return 'Dangerous';
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return 'Now';
    return `${h}h ${m}m`;
  };

  return (
    <div className="dashboard">
      <div className="profile-summary">
        <span>{profile.gender === 'male' ? '♂️' : '♀️'} {profile.gender}</span>
        <span>⚖️ {profile.weight}kg</span>
        <span>⚡ {profile.metabolismRate.toFixed(3)}%/hr</span>
      </div>

      <div className="bac-display card" style={{ borderColor: getStatusColor(currentBAC), borderLeft: '4px solid' }}>
        <span className="label">Current BAC</span>
        <h1 className="bac-value" style={{ color: getStatusColor(currentBAC) }}>
          {formatBAC(currentBAC)}%
        </h1>
        <div className="status-badge" style={{ backgroundColor: getStatusColor(currentBAC) }}>
          {getStatusText(currentBAC)}
        </div>
      </div>

      <div className="info-grid">
        <div className="card info-card">
          <span className="label">Time to Sober</span>
          <h3>{formatHours(timeToZero)}</h3>
        </div>
        <div className="card info-card">
          <span className="label">Active Drinks</span>
          <h3>{drinks.filter(d => (now - d.timestamp) < 12 * 3600000).length}</h3>
        </div>
      </div>

      <BACGraph drinks={drinks} profile={profile} now={now} />

      <button className="add-drink-btn" onClick={onAddClick}>
        + Add Drink
      </button>

      <style>{`
        .dashboard {
          padding-bottom: 80px;
        }
        .profile-summary {
          display: flex;
          gap: var(--spacing-md);
          justify-content: center;
          margin-bottom: var(--spacing-md);
          font-size: 0.8rem;
          opacity: 0.6;
          text-transform: capitalize;
        }
        .bac-display {
          text-align: center;
          padding: var(--spacing-xl) var(--spacing-md);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bac-value {
          font-size: 4rem;
          margin: var(--spacing-sm) 0;
        }
        .label {
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 1px;
          opacity: 0.7;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.8rem;
          color: black;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }
        .info-card {
          text-align: center;
        }
        .add-drink-btn {
          width: 100%;
          padding: var(--spacing-lg);
          font-size: 1.2rem;
          background: var(--primary);
          color: var(--on-primary);
          box-shadow: 0 4px 15px rgba(0, 59, 111, 0.4);
          margin-top: var(--spacing-lg);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
