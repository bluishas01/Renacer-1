import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppRecoveryFallback, ErrorBoundary, formatReadableError } from './components/ErrorBoundary.tsx';
import './index.css';

declare global {
  interface Window {
    __RENACER_MOUNTED__?: boolean;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  try {
    window.__RENACER_MOUNTED__ = true;
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err) {
    window.__RENACER_MOUNTED__ = true;
    root.render(
      <AppRecoveryFallback
        title="No pudimos iniciar RENACER"
        message={formatReadableError(err)}
        showCacheReset
      />
    );
  }
}
