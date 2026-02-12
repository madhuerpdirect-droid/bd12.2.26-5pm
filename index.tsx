import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA / Install to Home Screen
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Using relative path for SW to support subfolder deployment on GitHub Pages
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(err => {
      console.warn('SW registration failed: ', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);