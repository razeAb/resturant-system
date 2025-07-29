import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import "./styles/index.css"; // ✅ updated path
import LoadingPage from './pages/loadingpage.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoadingPage /> 
  </React.StrictMode>,
);

