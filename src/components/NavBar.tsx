import React from 'react';

export type View = 'dashboard' | 'history' | 'profile';

interface NavBarProps {
  currentView: View;
  setView: (view: View) => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentView, setView }) => {
  return (
    <nav className="navbar">
      <button 
        className={currentView === 'dashboard' ? 'active' : ''} 
        onClick={() => setView('dashboard')}
      >
        Dashboard
      </button>
      <button 
        className={currentView === 'history' ? 'active' : ''} 
        onClick={() => setView('history')}
      >
        History
      </button>
      <button 
        className={currentView === 'profile' ? 'active' : ''} 
        onClick={() => setView('profile')}
      >
        Profile
      </button>
      <style>{`
        .navbar {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 500px;
          background: var(--surface);
          display: flex;
          justify-content: space-around;
          padding: var(--spacing-sm);
          box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
          z-index: 100;
        }
        .navbar button {
          background: transparent;
          color: rgba(255,255,255,0.6);
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 0.9rem;
        }
        .navbar button.active {
          color: var(--primary);
        }
      `}</style>
    </nav>
  );
};

export default NavBar;
