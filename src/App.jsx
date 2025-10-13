import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Vote from './pages/Vote.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminSetup from './pages/AdminSetup.jsx';

export default function App(){
  return (
    <HashRouter>
      <div className="container">
        <header className="row" style={{justifyContent:'space-between'}}>
          <h1 style={{margin:0}}>Indah Samudra Painting Vote</h1>
        </header>
        <Routes>
          <Route path="/" element={<Vote/>}/>
          <Route path="/admin" element={<AdminDashboard/>}/>
          <Route path="/admin-login" element={<AdminLogin/>}/>
          <Route path="/admin-setup" element={<AdminSetup/>}/>
        </Routes>
        <footer className="muted" style={{marginTop:24}}>© Indah Samudra Residents</footer>
      </div>
    </HashRouter>
  );
}
