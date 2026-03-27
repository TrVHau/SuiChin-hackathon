import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SuiProvider } from './providers/SuiProvider';
import { GameProvider } from './providers/GameContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/index.css';

console.log('🚀 main.tsx loading...');
console.log('📦 ENV:', {
  PACKAGE_ID: import.meta.env.VITE_SUI_PACKAGE_ID,
  NETWORK: import.meta.env.VITE_SUI_NETWORK,
});

const rootElement = document.getElementById('root');
console.log('📍 Root element:', rootElement);

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <SuiProvider>
            <GameProvider>
              <App />
            </GameProvider>
          </SuiProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </StrictMode>,
  );
} else {
  console.error('❌ Root element not found!');
}
