import React from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import App from './App';

/**
 * Root — handles auth-gated routing.
 * Shows a loading spinner while the auth session is being determined,
 * then shows LoginPage for unauthenticated users and App for authenticated ones.
 */
export const Root: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span>Laden…</span>
      </div>
    );
  }

  return session ? <App /> : <LoginPage />;
};
