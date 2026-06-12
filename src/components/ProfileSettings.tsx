import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateWidmarkR } from '../utils/bac';
import type { Drink } from '../utils/bac';
import { supabase } from '../utils/supabase';
import ConfirmModal from './ConfirmModal';
import { 
  isPushSupported, 
  requestNotificationPermission, 
  subscribeUserToPush, 
  unsubscribeUserFromPush, 
  triggerLocalTestNotification,
  syncSubscriptionToSupabase
} from '../utils/notifications';

const ProfileSettings: React.FC = () => {
  const { 
    profile, setProfile, drinks, presets, removePreset, updatePreset, importData,
    user, lastSynced, isSyncing, signOut, pullFromCloud, storageWarning
  } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Push Notifications State
  const [pushSupported, setPushSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'error' | null>(null);
  const [testNotificationTimer, setTestNotificationTimer] = useState<number | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ open: true, title, message, onConfirm });
  };
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

  // Pending import data awaiting confirmation (tracked via confirm modal)
  const [, setPendingImport] = useState<Parameters<typeof importData>[0] | null>(null);

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    bodyMetrics: true,
    metabolism: false,
    presets: false,
    sync: false,
    notifications: false,
    data: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const checkSupportAndState = async () => {
      const supported = isPushSupported();
      setPushSupported(supported);
      
      if (supported) {
        setNotificationPermission(Notification.permission);
        
        try {
          const registration = await navigator.serviceWorker.ready;
          const sub = await registration.pushManager.getSubscription();
          setIsSubscribed(!!sub);
          if (sub) {
            setSubscriptionEndpoint(sub.endpoint);
            // Check if subscription exists in Supabase
            if (user) {
              const { data, error } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('endpoint', sub.endpoint)
                .maybeSingle();
              if (data && !error) {
                setSyncStatus('synced');
              } else {
                setSyncStatus('local');
              }
            } else {
              setSyncStatus('local');
            }
          }
        } catch (err) {
          console.error('Error checking push subscription state:', err);
        }
      }
    };
    
    checkSupportAndState();
  }, [user]);

  const handleToggleNotifications = async () => {
    try {
      if (isSubscribed) {
        // Unsubscribe
        const success = await unsubscribeUserFromPush();
        if (success) {
          setIsSubscribed(false);
          setSubscriptionEndpoint(null);
          setSyncStatus(null);
        } else {
          alert('Failed to unsubscribe from push notifications. Please try again.');
        }
      } else {
        // Subscribe
        const perm = await requestNotificationPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          const sub = await subscribeUserToPush();
          if (sub) {
            setIsSubscribed(true);
            setSubscriptionEndpoint(sub.endpoint);
            // Save to database
            const synced = await syncSubscriptionToSupabase(sub);
            setSyncStatus(synced ? 'synced' : 'local');
          } else {
            alert('Failed to subscribe to push notifications. Please try again.');
          }
        } else {
          alert('Notification permission denied. Please enable notifications in your browser settings.');
        }
      }
    } catch (err) {
      console.error('Notification toggle error:', err);
      alert('Something went wrong with push notifications. Please try again.');
    }
  };

  const handleSendTestNotification = async (delay: number) => {
    try {
      if (delay > 0) {
        setTimerSecondsLeft(delay);
        setTestNotificationTimer(delay);
        const interval = setInterval(() => {
          setTimerSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setTestNotificationTimer(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        await triggerLocalTestNotification(delay);
      } else {
        await triggerLocalTestNotification(0);
      }
    } catch (err) {
      console.error('Test notification error:', err);
      alert('Failed to send test notification. Please check that notifications are enabled.');
    }
  };

  const [editingPresetName, setEditingPresetName] = useState<string | null>(null);
  const [tempPreset, setTempPreset] = useState<{ name: string; volume: number; abv: number } | null>(null);

  const startEditPreset = (preset: Omit<Drink, 'id' | 'timestamp'>) => {
    setEditingPresetName(preset.name || '');
    setTempPreset({ 
      name: preset.name || '', 
      volume: preset.volume, 
      abv: preset.abv 
    });
  };

  const savePresetEdit = () => {
    if (editingPresetName && tempPreset) {
      updatePreset(editingPresetName, tempPreset);
      setEditingPresetName(null);
      setTempPreset(null);
    }
  };

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
      
      // Use a generic message to avoid leaking whether the email is registered
      if (error) {
        setAuthError(
          authMode === 'login'
            ? 'Invalid email or password. Please try again.'
            : 'Could not create account. The email may already be registered.'
        );
      }
    } catch {
      setAuthError('An unexpected error occurred. Please try again.');
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
    link.download = `sipwise-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /** Validate the shape and value ranges of an import payload */
  function validateImportData(data: unknown): data is Parameters<typeof importData>[0] {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;

    if (d.profile !== undefined) {
      const p = d.profile as Record<string, unknown>;
      if (typeof p.weight !== 'number' || p.weight < 20 || p.weight > 400) return false;
      if (p.gender !== 'male' && p.gender !== 'female') return false;
      if (typeof p.height !== 'number' || p.height < 50 || p.height > 300) return false;
      if (typeof p.age !== 'number' || p.age < 1 || p.age > 130) return false;
      if (typeof p.metabolismRate !== 'number' || p.metabolismRate < 0.001 || p.metabolismRate > 0.5) return false;
    }

    if (d.drinks !== undefined) {
      if (!Array.isArray(d.drinks)) return false;
      if (d.drinks.length > 10000) return false; // Reject unreasonably large payloads
      for (const drink of d.drinks) {
        if (typeof drink !== 'object' || drink === null) return false;
        const dr = drink as Record<string, unknown>;
        if (typeof dr.volume !== 'number' || dr.volume < 0 || dr.volume > 5000) return false;
        if (typeof dr.abv !== 'number' || dr.abv < 0 || dr.abv > 100) return false;
        if (typeof dr.timestamp !== 'number') return false;
      }
    }

    if (d.presets !== undefined) {
      if (!Array.isArray(d.presets)) return false;
      if (d.presets.length > 100) return false;
    }

    return true;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!validateImportData(parsed)) {
          alert('Invalid backup file: data failed validation. Please use a valid SipWise export.');
          return;
        }

        setPendingImport(parsed);
        showConfirm(
          'Import Data',
          'This will overwrite your current profile, drinks, and presets. Are you sure?',
          () => {
            importData(parsed);
            setPendingImport(null);
            alert('Data imported successfully!');
          }
        );
      } catch {
        alert('Invalid backup file. Please make sure it is a valid JSON file exported from SipWise.');
      }
      // Reset input so the same file can be re-imported if needed
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="profile-settings">
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Yes, continue"
        danger={true}
        onConfirm={() => { confirmModal.onConfirm(); closeConfirm(); }}
        onCancel={closeConfirm}
      />

      <div className="settings-header">
        <h2>Personal Profile</h2>
        <p>Correct weight and gender are essential for accurate BAC estimation using the Widmark formula.</p>
      </div>

      {storageWarning && (
        <div className="storage-warning-banner" role="alert">
          ⚠️ {storageWarning}
        </div>
      )}
      
      <div className="card settings-card">
        {/* Section 1: Body Metrics */}
        <div className={`form-section ${openSections.bodyMetrics ? 'open' : 'collapsed'}`}>
          <button 
            type="button" 
            className="section-title-btn" 
            onClick={() => toggleSection('bodyMetrics')}
            aria-expanded={openSections.bodyMetrics}
          >
            <div className="section-title">
              <span>👤</span> Body Metrics
            </div>
            <span className="chevron">▶</span>
          </button>
          <div className="section-content-wrapper">
            <div className="section-content">
              <div className="section-content-inner">
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
            </div>
          </div>
        </div>

        {/* Section 2: Metabolism */}
        <div className={`form-section ${openSections.metabolism ? 'open' : 'collapsed'}`}>
          <button 
            type="button" 
            className="section-title-btn" 
            onClick={() => toggleSection('metabolism')}
            aria-expanded={openSections.metabolism}
          >
            <div className="section-title">
              <span>⚡</span> Metabolism
            </div>
            <span className="chevron">▶</span>
          </button>
          <div className="section-content-wrapper">
            <div className="section-content">
              <div className="section-content-inner">
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
            </div>
          </div>
        </div>

        {/* Section 3: Drink Presets */}
        <div className={`form-section ${openSections.presets ? 'open' : 'collapsed'}`}>
          <button 
            type="button" 
            className="section-title-btn" 
            onClick={() => toggleSection('presets')}
            aria-expanded={openSections.presets}
          >
            <div className="section-title">
              <span>🍹</span> Drink Presets
            </div>
            <span className="chevron">▶</span>
          </button>
          <div className="section-content-wrapper">
            <div className="section-content">
              <div className="section-content-inner">
                <div className="presets-list">
                  {presets.length === 0 ? (
                    <p className="help-text">No presets saved yet.</p>
                  ) : (
                    presets.map((preset, index) => (
                      <div key={index} className="preset-item">
                        {editingPresetName === preset.name ? (
                          <div className="preset-edit-form">
                            <input 
                              type="text" 
                              value={tempPreset?.name} 
                              onChange={e => setTempPreset({...tempPreset!, name: e.target.value})} 
                              placeholder="Name"
                            />
                            <div className="side-by-side">
                              <input 
                                type="number" 
                                value={tempPreset?.volume} 
                                onChange={e => setTempPreset({...tempPreset!, volume: Number(e.target.value)})} 
                                placeholder="ml"
                              />
                              <input 
                                type="number" 
                                step="0.1"
                                value={tempPreset?.abv} 
                                onChange={e => setTempPreset({...tempPreset!, abv: Number(e.target.value)})} 
                                placeholder="%"
                              />
                            </div>
                            <div className="edit-actions">
                              <button className="btn btn-primary" onClick={savePresetEdit}>Save</button>
                              <button className="btn text-btn" onClick={() => setEditingPresetName(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="preset-info">
                              <strong>{preset.name}</strong>
                              <span>{preset.volume}ml • {preset.abv}%</span>
                            </div>
                            <div className="preset-actions">
                              <button 
                                className="edit-preset-btn" 
                                onClick={() => startEditPreset(preset)}
                                title="Edit Preset"
                              >
                                ✎
                              </button>
                              <button 
                                className="remove-preset-btn" 
                                onClick={() => preset.name && removePreset(preset.name)}
                                title="Remove Preset"
                              >
                                ✕
                              </button>
                              <button
                                className="set-quick-drink-btn"
                                onClick={() => setProfile({ ...profile, quickDrink: { name: preset.name!, volume: preset.volume, abv: preset.abv } })}
                                title={profile.quickDrink?.name === preset.name ? "Current Quick Drink" : "Set as Quick Drink"}
                              >
                                {profile.quickDrink?.name === preset.name ? '★' : '☆'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <p className="help-text">Manage your saved drink templates. You can always add more from the "Add Drink" menu.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Cloud Sync */}
        <div className={`form-section ${openSections.sync ? 'open' : 'collapsed'}`}>
          <button 
            type="button" 
            className="section-title-btn" 
            onClick={() => toggleSection('sync')}
            aria-expanded={openSections.sync}
          >
            <div className="section-title">
              <span>☁️</span> Cloud Sync
            </div>
            <span className="chevron">▶</span>
          </button>
          <div className="section-content-wrapper">
            <div className="section-content">
              <div className="section-content-inner">
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
            </div>
          </div>
        </div>

        {/* Section 5: Push Notifications */}
        <div className={`form-section ${openSections.notifications ? 'open' : 'collapsed'}`}>
          <button 
            type="button" 
            className="section-title-btn" 
            onClick={() => toggleSection('notifications')}
            aria-expanded={openSections.notifications}
          >
            <div className="section-title">
              <span>🔔</span> Push Notifications
            </div>
            <span className="chevron">▶</span>
          </button>
          <div className="section-content-wrapper">
            <div className="section-content">
              <div className="section-content-inner">
                {!pushSupported ? (
                  <div className="notifications-alert error-box">
                    <strong>Push Notifications are not supported in this browser.</strong>
                    <p className="help-text">
                      On iOS, you must first add this app to your Home Screen to enable Push Notifications.
                    </p>
                  </div>
                ) : (
                  <div className="notifications-container">
                    <div className="notification-status-row">
                      <div className="status-info">
                        <span className="label">Status</span>
                        <strong>
                          {notificationPermission === 'denied' 
                            ? '🚫 Blocked (Permission Denied)' 
                            : isSubscribed 
                            ? '✅ Enabled' 
                            : '💤 Disabled'}
                        </strong>
                        {isSubscribed && syncStatus && (
                          <span className={`sync-badge ${syncStatus}`}>
                            {syncStatus === 'synced' ? '☁️ Synced to Cloud' : '💻 Local Only'}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        type="button"
                        className={`btn ${isSubscribed ? 'btn-outline' : 'btn-primary'}`}
                        onClick={handleToggleNotifications}
                        disabled={notificationPermission === 'denied'}
                        style={isSubscribed ? { borderColor: 'var(--error)', color: 'var(--error)', flex: 'none' } : { flex: 'none' }}
                      >
                        {isSubscribed ? 'Disable' : 'Enable'}
                      </button>
                    </div>

                    {notificationPermission === 'denied' && (
                      <p className="help-text error-text" style={{ marginTop: '8px' }}>
                        Please reset notification permissions in your browser settings to enable notifications.
                      </p>
                    )}

                    {isSubscribed && (
                      <div className="notification-details">
                        <div className="details-group">
                          <span className="label">Device Subscription Endpoint</span>
                          <code className="endpoint-box">{subscriptionEndpoint || 'Loading...'}</code>
                        </div>
                        
                        <div className="test-notification-section">
                          <span className="label">Test Notification</span>
                          <p className="help-text">Verify notifications work. Click the delayed option and minimize the app or lock your screen.</p>
                          <div className="test-buttons">
                            <button 
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleSendTestNotification(0)}
                              disabled={testNotificationTimer !== null}
                            >
                              Send Now
                            </button>
                            <button 
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleSendTestNotification(5)}
                              disabled={testNotificationTimer !== null}
                            >
                              {testNotificationTimer !== null 
                                ? `Sending in ${timerSecondsLeft}s...` 
                                : 'Send in 5 Seconds'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Data Management */}
        <div className={`form-section ${openSections.data ? 'open' : 'collapsed'}`}>
          <button 
            type="button" 
            className="section-title-btn" 
            onClick={() => toggleSection('data')}
            aria-expanded={openSections.data}
          >
            <div className="section-title">
              <span>💾</span> Data Management
            </div>
            <span className="chevron">▶</span>
          </button>
          <div className="section-content-wrapper">
            <div className="section-content">
              <div className="section-content-inner">
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
          </div>
        </div>
      </div>

      <div className="version-info" style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)', opacity: 0.5, fontSize: '0.8rem' }}>
        SipWise v0.1.1
      </div>

      <style>{`
        .profile-settings {
          padding-bottom: 80px;
        }
        .storage-warning-banner {
          background: rgba(255, 152, 0, 0.15);
          border: 1px solid rgba(255, 152, 0, 0.4);
          border-radius: var(--border-radius);
          color: #ff9800;
          font-size: 0.8rem;
          padding: 10px var(--spacing-md);
          margin-bottom: var(--spacing-md);
          line-height: 1.4;
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
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
        }
        .form-section:last-child {
          border-bottom: none;
        }
        .section-title-btn {
          width: 100%;
          background: transparent;
          border: none;
          color: inherit;
          text-align: left;
          padding: var(--spacing-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 0.2s ease;
        }
        .section-title-btn:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .section-title-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: -2px;
        }
        .section-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .section-title-btn .chevron {
          font-size: 0.8rem;
          color: var(--primary);
          opacity: 0.7;
          display: inline-block;
          transition: transform 0.2s ease;
        }
        .form-section.open .section-title-btn .chevron {
          transform: rotate(90deg);
        }
        .section-content-wrapper {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.25s ease-in-out;
        }
        .form-section.open .section-content-wrapper {
          grid-template-rows: 1fr;
        }
        .section-content {
          overflow: hidden;
        }
        .section-content-inner {
          padding: 0 var(--spacing-md) var(--spacing-md) var(--spacing-md);
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
        .set-quick-drink-btn {
          background: transparent;
          color: var(--primary);
          border: none;
          padding: 4px 8px;
          font-size: 1rem;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s, transform 0.2s;
        }
        .set-quick-drink-btn:hover {
          opacity: 1;
          transform: scale(1.1);
        }
        .preset-actions {
          display: flex;
          gap: 8px;
        }
        .edit-preset-btn {
          background: transparent;
          color: var(--primary);
          border: none;
          padding: 4px 8px;
          font-size: 1rem;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .edit-preset-btn:hover {
          opacity: 1;
        }
        .preset-edit-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 4px 0;
        }
        .preset-edit-form input {
          width: 100%;
        }
        .side-by-side {
          display: flex;
          gap: 8px;
        }
        .edit-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .edit-actions .btn-primary {
          padding: 4px 12px;
          font-size: 0.8rem;
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
        .notifications-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .notification-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: var(--border-radius);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .status-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sync-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 2px;
          width: fit-content;
        }
        .sync-badge.synced {
          background: rgba(76, 175, 80, 0.15);
          color: #81c784;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }
        .sync-badge.local {
          background: rgba(255, 152, 0, 0.15);
          color: #ffb74d;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }
        .notification-details {
          background: rgba(255, 255, 255, 0.01);
          padding: 12px;
          border-radius: var(--border-radius);
          border: 1px solid rgba(255, 255, 255, 0.03);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .details-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .endpoint-box {
          font-family: monospace;
          font-size: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          padding: 6px;
          border-radius: 4px;
          overflow-x: auto;
          white-space: nowrap;
          color: #aaa;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .test-notification-section {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .test-buttons {
          display: flex;
          gap: 10px;
        }
        .test-buttons .btn {
          flex: 1;
          padding: 8px;
          font-size: 0.85rem;
        }
        .error-box {
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
          padding: 12px;
          border-radius: var(--border-radius);
          color: #e57373;
        }
      `}</style>
    </div>
  );
};

export default ProfileSettings;
