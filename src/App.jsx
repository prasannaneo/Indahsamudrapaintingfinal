import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Vote from './pages/Vote.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminSetup from './pages/AdminSetup.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const hideAdmin = String(import.meta.env.VITE_HIDE_ADMIN_LINKS || 'true') === 'true';

export default function App(){
  return (
    <HashRouter>
      <div className="container">
        <header className="row" style={{justifyContent:'space-between'}}>
          <h1>Indah Samudra Painting Vote</h1>
          {!hideAdmin && (
            <nav>
              <Link to="/admin-login">Admin</Link>
              <Link to="/admin-setup">Setup</Link>
            </nav>
          )}
        </header>
        <Routes>
          <Route path="/" element={<Vote/>}/>
          <Route path="/admin-login" element={<AdminLogin/>}/>
          <Route path="/admin-setup" element={<AdminSetup/>}/>
          <Route path="/admin" element={<AdminDashboard/>}/>
        </Routes>
        <footer className="muted" style={{marginTop:24}}>© Indah Samudra Residents</footer>
      </div>
    </HashRouter>
  );
}
