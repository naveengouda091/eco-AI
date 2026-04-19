/**
 * AppContext — mode is derived from accountType stored at login.
 * Personal → 'personal', Organisation → 'organisation'.
 * toggleMode is kept for Organisation page compatibility but is not exposed in UI.
 */
import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const stored = localStorage.getItem('ecotrack_account_type') || 'personal';
  const [mode, setMode] = useState(stored === 'organisation' ? 'organisation' : 'personal');

  const toggleMode = () => {
    setMode((prev) => (prev === 'personal' ? 'organisation' : 'personal'));
  };

  return (
    <AppContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
