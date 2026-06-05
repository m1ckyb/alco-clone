import React, { useRef } from 'react';
import { useAppContext } from '../context/AppContext';

const ProfileSettings: React.FC = () => {
  const { profile, setProfile, drinks, presets, removePreset, importData } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: name === 'weight' || name === 'metabolismRate' ? Number(value) : value
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
        </div>

        <div className="form-section">
          <div className="section-title">
            <span>⚡</span> Metabolism
          </div>
          <div className="form-group">
            <label>Metabolism Rate (%/hr)</label>
            <input 
              type="number" 
              name="metabolismRate" 
              step="0.001"
              min="0.005"
              max="0.040"
              value={profile.metabolismRate} 
              onChange={handleChange} 
            />
            <p className="help-text">Standard average is 0.015. Adjust if you know you metabolize faster or slower.</p>
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
        input, select {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
        }
        input:focus, select:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(187, 134, 252, 0.05);
        }
      `}</style>
    </div>
  );
};

export default ProfileSettings;
