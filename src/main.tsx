import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { SpellProvider } from './context/SpellContext';
import { Root } from './Root';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SpellProvider>
        <Root />
      </SpellProvider>
    </AuthProvider>
  </StrictMode>,
);
