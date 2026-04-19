import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, loadUserProfile, registerUser } from '../services/api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ecotrack_token');
    if (!token) { setLoading(false); return; }
    loadUserProfile()
      .then((data) => setUser(data.user))
      .catch(() => { localStorage.removeItem('ecotrack_token'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, accountType = 'personal') => {
    const data = await loginUser(email, password, accountType);
    localStorage.setItem('ecotrack_token', data.token);
    localStorage.setItem('ecotrack_account_type', data.user?.accountType || accountType);
    setUser({ ...data.user, accountType: data.user?.accountType || accountType });
    return data;
  };

  const register = async (email, password, accountType = 'personal', orgName = '') => {
    const data = await registerUser(email, password, accountType, orgName);
    localStorage.setItem('ecotrack_token', data.token);
    localStorage.setItem('ecotrack_account_type', data.user?.accountType || accountType);
    setUser({ ...data.user, accountType: data.user?.accountType || accountType });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ecotrack_token');
    localStorage.removeItem('ecotrack_account_type');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, isAuthenticated: Boolean(user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
