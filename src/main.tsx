import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SpellProvider } from './context/SpellContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpellProvider>
      <App />
    </SpellProvider>
  </StrictMode>,
)
