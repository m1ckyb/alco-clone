import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateWidmarkR } from '../utils/bac';
import { supabase } from '../utils/supabase';

const ProfileSettings: React.FC = () => {
  const { 
    profile, setProfile, drinks, presets, removePreset, importData,
    user, lastSynced, isSyncing, signOut, pullFromCloud 
  } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const { error } = authMode === 'login' 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      
      if (error) setAuthError(error.message);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: name === 'weight' || name === 'metabolismRate' || name === 'height' || name === 'age' ? Number(value) : value
    });
  };

  const handleExport = () => {
    const data = {
      profile,
      drinks,
      presets,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alcoclone-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        if (window.confirm('This will overwrite your current profile, drinks, and presets. Continue?')) {
          importData(data);
          alert('Data imported successfully!');
        }
      } catch (error) {
        console.error('Failed to parse import file:', error);
        alert('Invalid backup file. Please make sure it is a valid JSON exported from this app.');
      }
      // Reset input value to allow importing the same file again if needed
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="profile-settings">
      <div className="settings-header">
        <h2>Personal Profile</h2>
        <p>Correct weight and gender are essential for accurate BAC estimation using the Widmark formula.</p>
      </div>
      
      <div className="card settings-card">
        <div className="form-section">
          <div className="section-title">
            <span>👤</span> Body Metrics
          </div>
          
          <div className="form-group">
            <label>Gender</label>
            <div className="select-wrapper">
              <select name="gender" value={profile.gender} onChange={handleChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <p className="help-text">Biological sex affects the body water ratio (r) used in calculations.</p>
          </div>

          <div className="form-group">
            <label>Weight (kg)</label>
            <input 
              type="number" 
              name="weight" 
              min="30"
              max="300"
              value={profile.weight} 
              onChange={handleChange} 
            />
            <p className="help-text">Alcohol concentration is inversely proportional to body weight.</p>
          </div>

          <div className="form-group">
            <label>Height (cm)</label>
            <input 
              type="number" 
              name="height" 
              min="50"
              max="250"
              value={profile.height} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>Age (years)</label>
            <input 
              type="number" 
              name="age" 
              min="1"
              max="120"
              value={profile.age} 
              onChange={handleChange} 
            />
            <p className="help-text">Height and Age are used by the Watson formula to calculate your body water ratio (r) more accurately.</p>
          </div>

          <div className="info-box">
            <span className="label">Current Body Water Ratio (r)</span>
            <strong className="r-value">{calculateWidmarkR(profile).toFixed(3)}</strong>
          </div>

          <div className="form-group">
            <label>Display Unit</label>
            <div className="select-wrapper">
              <select name="displayUnit" value={profile.displayUnit} onChange={handleChange}>
                <option value="%">% (Percentage, e.g. 0.050%)</option>
                <option value="‰">‰ (Per Mille, e.g. 0.50‰)</option>
              </select>
            </div>
            <p className="help-text">Choose how BAC values are displayed throughout the app.</p>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">
            <span>⚡</span> Metabolism
          </div>
          <div className="form-group">
            <label>Metabolism Rate ({profile.displayUnit}/hr)</label>
            <input 
              type="number" 
              name="metabolismRate" 
              step="0.001"
              min={profile.displayUnit === '‰' ? 0.05 : 0.005}
              max={profile.displayUnit === '‰' ? 0.40 : 0.040}
              value={profile.displayUnit === '‰' ? profile.metabolismRate * 10 : profile.metabolismRate} 
              onChange={(e) => {
                const val = Number(e.target.value);
                setProfile({
                  ...profile,
                  metabolismRate: profile.displayUnit === '‰' ? val / 10 : val
                });
              }} 
            />
            <p className="help-text">
              Standard average is {profile.displayUnit === '‰' ? '0.15' : '0.015'}. 
              Adjust if you know you metabolize faster or slower.
            </p>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">
            <span>🍹</span> Drink Presets
          </div>
          <div className="presets-list">
            {presets.length === 0 ? (
              <p className="help-text">No presets saved yet.</p>
            ) : (
              presets.map((preset, index) => (
                <div key={index} className="preset-item">
                  <div className="preset-info">
                    <strong>{preset.name}</strong>
                    <span>{preset.volume}ml • {preset.abv}%</span>
                  </div>
                  <button 
                    className="remove-preset-btn" 
                    onClick={() => preset.name && removePreset(preset.name)}
                    title="Remove Preset"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="help-text">Manage your saved drink templates. You can always add more from the "Add Drink" menu.</p>
        </div>

        <div className="form-section">
          <div className="section-title">
            <span>☁️</span> Cloud Sync
          </div>
          
          {!user ? (
            <div className="auth-container">
              <p className="help-text" style={{ marginBottom: '12px' }}>
                Sync your data across devices using a free account.
              </p>
              <form onSubmit={handleAuth} className="auth-form">
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                {authError && <p className="error-text">{authError}</p>}
                <button type="submit" className="btn btn-primary">
                  {authMode === 'login' ? 'Login' : 'Sign Up'}
                </button>
              </form>
              <button 
                className="text-btn" 
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              >
                {authMode === 'login' ? 'Need an account? Sign Up' : 'Have an account? Login'}
              </button>
            </div>
          ) : (
            <div className="sync-status">
              <div className="status-row">
                <span>Account:</span>
                <strong>{user.email}</strong>
              </div>
              <div className="status-row">
                <span>Last Synced:</span>
                <span>{isSyncing ? 'Syncing...' : (lastSynced || 'Never')}</span>
              </div>
              <div className="sync-actions">
                <button className="btn btn-secondary" onClick={pullFromCloud} disabled={isSyncing}>
                  Sync Now
                </button>
                <button className="btn btn-outline" onClick={signOut}>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="section-title">
            <span>💾</span> Data Management
          </div>
          <div className="data-buttons">
            <button className="btn btn-secondary" onClick={handleExport}>
              Export Data
            </button>
            <button className="btn btn-secondary" onClick={handleImportClick}>
              Import Data
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
          <p className="help-text">Backup your data to a JSON file or restore from a previous backup.</p>
        </div>
      </div>

      <style>{`
        .profile-settings {
          padding-bottom: 80px;
        }
        .settings-header {
          margin-bottom: var(--spacing-lg);
        }
        .settings-header p {
          font-size: 0.9rem;
          opacity: 0.7;
          line-height: 1.4;
        }
        .settings-card {
          padding: 0;
          overflow: hidden;
        }
        .form-section {
          padding: var(--spacing-md);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .form-section:last-child {
          border-bottom: none;
        }
        .section-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: var(--spacing-md);
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-group {
          margin-bottom: var(--spacing-md);
        }
        .form-group:last-child {
          margin-bottom: 0;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .help-text {
          font-size: 0.75rem;
          opacity: 0.5;
          margin-top: 6px;
          line-height: 1.3;
        }
        .info-box {
          background: rgba(0, 59, 111, 0.2);
          padding: var(--spacing-md);
          border-radius: var(--border-radius);
          margin-bottom: var(--spacing-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(0, 59, 111, 0.3);
        }
        .info-box .label {
          font-size: 0.75rem;
          text-transform: uppercase;
          opacity: 0.8;
          margin-bottom: 0;
        }
        .r-value {
          color: var(--primary);
          font-size: 1.2rem;
        }
        .presets-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-sm);
        }
        .preset-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.03);
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .preset-info {
          display: flex;
          flex-direction: column;
        }
        .preset-info strong {
          font-size: 0.9rem;
        }
        .preset-info span {
          font-size: 0.75rem;
          opacity: 0.6;
        }
        .remove-preset-btn {
          background: transparent;
          color: var(--error);
          border: none;
          padding: 4px 8px;
          font-size: 1rem;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .remove-preset-btn:hover {
          opacity: 1;
        }
        .data-buttons {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: 8px;
        }
        .data-buttons .btn {
          flex: 1;
          padding: 10px;
          font-size: 0.9rem;
          background: var(--background);
          color: var(--on-surface);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .data-buttons .btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 10px;
        }
        .auth-form .btn-primary {
          background: var(--primary);
          color: var(--on-primary);
        }
        .text-btn {
          background: transparent;
          color: var(--primary);
          font-size: 0.8rem;
          text-decoration: underline;
          padding: 0;
          display: block;
          margin: 0 auto;
        }
        .error-text {
          color: var(--error);
          font-size: 0.8rem;
          margin: 0;
        }
        .sync-status {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .status-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }
        .sync-actions {
          display: flex;
          gap: 10px;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--error);
          color: var(--error);
          flex: 1;
        }
        input, select {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
        }
        input:focus, select:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(0, 59, 111, 0.05);
        }
      `}</style>
    </div>
  );
};

export default ProfileSettings;
