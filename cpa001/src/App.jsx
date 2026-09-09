import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import TicketPage from './pages/TicketPage';
import ExpirationAlerts from './pages/ExpirationAlerts';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <POSPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/ticket/:saleId"
            element={
              <PrivateRoute>
                <TicketPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/alertas"
            element={
              <PrivateRoute>
                <ExpirationAlerts />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
