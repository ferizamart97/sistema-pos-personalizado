import { createContext, useState } from 'react';
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

let ssoResult = null;
function getSsoCredentials() {
  if (ssoResult !== null) return ssoResult;

  try {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : '');
    const searchParams = new URLSearchParams(search);

    const ssoToken = hashParams.get('sso_token') || hashParams.get('token') || searchParams.get('sso_token') || searchParams.get('token');
    const ssoUserRaw = hashParams.get('sso_user') || hashParams.get('user') || searchParams.get('sso_user') || searchParams.get('user');

    if (ssoToken) {
      localStorage.setItem('pos_token', ssoToken);
      let userData = null;
      if (ssoUserRaw) {
        try {
          const decoded = decodeURIComponent(ssoUserRaw);
          userData = safeJsonParse(decoded);
          if (userData) {
            localStorage.setItem('pos_user', JSON.stringify(userData));
          }
        } catch (e) {
          console.error('Error parsing SSO user', e);
        }
      }
      ssoResult = { token: ssoToken, user: userData };
      return ssoResult;
    }
  } catch (err) {
    console.error('Error during SSO extraction', err);
  }

  ssoResult = { token: null, user: null };
  return ssoResult;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const sso = getSsoCredentials();
      if (sso && sso.user) return sso.user;
      return safeJsonParse(localStorage.getItem('pos_user'));
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      const sso = getSsoCredentials();
      if (sso && sso.token) return sso.token;
      return localStorage.getItem('pos_token') || null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!token;

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = data.data;
    localStorage.setItem('pos_token', newToken);
    localStorage.setItem('pos_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
