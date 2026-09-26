import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/fonts.css';
import './styles/global.css';
import App from './App';
import AppProvider from './context/AppProvider';
import { initializeTheme } from './lib/theme';

const theme = initializeTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider theme={theme}>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
