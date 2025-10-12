import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Vote from './pages/Vote.jsx';
import Admin from './pages/AdminDashboard.jsx';

export default function App(){
  return(
    <HashRouter>
      <div className="p-4">
        <h1>Indah Samudra Painting Vote</h1>
        <Routes>
          <Route path="/" element={<Vote/>}/>
          <Route path="/admin" element={<Admin/>}/>
        </Routes>
      </div>
    </HashRouter>
  );
}
