import React from 'react';
import ReactDOM from 'react-dom/client';
import ThreeBodySimulator from './Simulator.jsx';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ width: '100vw', height: '100vh' }}>
      <ThreeBodySimulator />
    </div>
  </React.StrictMode>
);
