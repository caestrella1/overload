import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyStoredAccent } from './hooks/useAccent';
import { applyStoredTheme } from './hooks/useTheme';
import './index.css';

applyStoredTheme();
applyStoredAccent();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
