import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize Telegram WebApp
const initTelegramApp = () => {
  if (window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    webApp.ready();
    webApp.expand();
    
    // Apply Telegram theme colors
    const theme = webApp.themeParams;
    if (theme) {
      document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
      document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#6366f1');
      document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f0f0f0');
      document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#999999');
    }
    
    console.log('Telegram WebApp initialized');
    return webApp;
  }
  console.log('Running outside Telegram');
  return null;
};

const webApp = initTelegramApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App webApp={webApp} />
  </React.StrictMode>,
)

// Type declarations for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        showAlert: (message: string) => void;
        showConfirm: (message: string) => Promise<boolean>;
        showPopup: (params: { title?: string; message: string; buttons?: Array<{ id: string; type?: string; text?: string }> }) => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
          hint_color?: string;
        };
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          query_id?: string;
        };
        version: string;
        platform: string;
      };
    };
  }
}