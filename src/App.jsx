import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Vote from './pages/Vote.jsx';
import AdminSetup from './pages/AdminSetup.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const hideAdmin = String(import.meta.env.VITE_HIDE_ADMIN_LINKS || 'true') === 'true';

export default function App() {
  return (
    <HashRouter>
      <div className="max-w-2xl mx-auto p-4">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Indah Samudra Painting Vote</h1>
          {!hideAdmin && (
            <nav className="flex gap-3">
              <Link className="underline" to="/admin-login">Admin</Link>
              <Link className="underline" to="/admin-setup">Setup</Link>
            </nav>
          )}
        </header>
        <Routes>
          <Route path="/" element={<Vote />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-setup" element={<AdminSetup />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
        <footer className="mt-10 text-xs text-gray-500">
          <span>© Indah Samudra Residents</span>
        </footer>
      </div>
    </HashRouter>
  );
}
