import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error: Error | any) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="reload-prompt-container">
      <div className="reload-prompt-toast">
        <div className="reload-prompt-message">
          {offlineReady 
            ? <span>App ready to work offline</span>
            : <span>New content available, click on reload button to update.</span>
          }
        </div>
        <div className="reload-prompt-buttons">
          {needRefresh && (
            <button className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
              Reload
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => close()}>
            Close
          </button>
        </div>
      </div>
      <style>{`
        .reload-prompt-container {
          position: fixed;
          bottom: 80px;
          right: 0;
          left: 0;
          display: flex;
          justify-content: center;
          z-index: 1000;
          padding: 0 var(--spacing-md);
          pointer-events: none;
        }
        .reload-prompt-toast {
          background: var(--surface);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--border-radius);
          padding: var(--spacing-md);
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          width: 100%;
          max-width: 400px;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .reload-prompt-message {
          font-size: 0.9rem;
          color: var(--on-surface);
        }
        .reload-prompt-buttons {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: flex-end;
        }
        .reload-prompt-buttons .btn {
          padding: 6px 12px;
          font-size: 0.85rem;
          flex: none;
        }
      `}</style>
    </div>
  );
};

export default ReloadPrompt;
