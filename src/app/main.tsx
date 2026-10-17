import React from 'react';
import ReactDOM from 'react-dom/client';

// Stage 1 placeholder — full workbench arrives in Stage 2 (see docs/FDS.md §7 #feat-web-studio)
// This placeholder renders the spec identity so `npm run dev` + `npm run build` succeed.
const App = () => (
  <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Sprite Motion Lab — Harmonised Greenfield (Stage 1)</h1>
    <p>Stage 1 specs complete. See <code>docs/FDS.md</code> and <code>docs/N_WAY_BRANCH_COMPARISON.md</code>.</p>
    <p>Full pipeline + workbench arrives in Stage 2.</p>
    <ul>
      <li data-testid="stage-badge__stage-1">Stage 1: Harmonised discipline + FDS v1.0.0 + N-way ledger ✅</li>
      <li data-testid="stage-badge__stage-2">Stage 2: Pipeline + 17-part rig + workbench — queued</li>
    </ul>
    <a data-testid="nav__link-fds" href="/docs/FDS.md">Open FDS</a>
  </div>
);
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
