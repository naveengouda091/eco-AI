/**
 * Main application entry point.
 * We are using React 18's createRoot API to mount our application to the DOM.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/globals.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { DeviceUsageProvider } from './context/DeviceUsageContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <DeviceUsageProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DeviceUsageProvider>
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
);
