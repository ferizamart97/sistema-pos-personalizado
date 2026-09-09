import React, { createContext, useState } from 'react';
import api from '../api/axiosConfig';

export const AuthContext = createContext(null);

function safeJsonParse(val, fallback = null) {
  if (!val || val === 'undefined' || val === 'null') return fallback;
  try {
    return typeof val === 'object' ? val : JSON.parse(val);
  } catch (e) {
    console.warn('safeJsonParse failed:', e);
    return fallback;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return safeJsonParse(localStorage.getItem('pos_admin_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('pos_admin_token') || null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!token && !!user;

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data.data;
    localStorage.setItem('pos_admin_token', newToken);
    localStorage.setItem('pos_admin_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('pos_admin_token');
    localStorage.removeItem('pos_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
