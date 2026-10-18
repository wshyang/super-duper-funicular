import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './workspace.css';

const container = document.getElementById('root');
if (container === null) throw new Error('Missing #root container');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
