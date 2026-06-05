import { useState } from 'react';
import NavBar from './components/NavBar';
import type { View } from './components/NavBar';
import Dashboard from './components/Dashboard';
import History from './components/History';
import ProfileSettings from './components/ProfileSettings';
import DrinkLogger from './components/DrinkLogger';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);

  return (
    <>
      <header className="app-header">
        <h1>AlcoClone Web</h1>
      </header>

      <main>
        {currentView === 'dashboard' && (
          <Dashboard onAddClick={() => setIsLoggerOpen(true)} />
        )}
        {currentView === 'history' && <History />}
        {currentView === 'profile' && <ProfileSettings />}
      </main>

      <DrinkLogger 
        isOpen={isLoggerOpen} 
        onClose={() => setIsLoggerOpen(false)} 
      />

      <NavBar currentView={currentView} setView={setCurrentView} />

      <style>{`
        .app-header {
          padding: var(--spacing-md) 0;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: var(--spacing-lg);
        }
        .app-header h1 {
          font-size: 1.5rem;
          color: var(--primary);
          margin: 0;
        }
        main {
          flex: 1;
        }
      `}</style>
    </>
  );
}

export default App;
