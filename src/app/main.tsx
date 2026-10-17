import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

function mountApplication(): void {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    return;
  }
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

mountApplication();
