import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <App />
    </div>
  </React.StrictMode>
);
