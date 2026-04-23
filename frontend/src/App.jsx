import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ReportPage from './pages/ReportPage';
import OeePage from './pages/OeePage';
import PackingPage from './pages/PackingPage';
import BoxSetupPage from './pages/BoxSetupPage';
import TargetsPage from './pages/TargetsPage';
import JourneyPage from './pages/JourneyPage';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('tr_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
    // Scanner functionality removed per request — scanning handled externally or not used.

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="oee" element={<OeePage />} />
          <Route path="packing" element={<PackingPage />} />
          <Route path="journey" element={<JourneyPage />} />
          <Route path="box-setup" element={<BoxSetupPage />} />
          <Route path="targets" element={<TargetsPage />} />
        </Route>
      </Routes>
      {/* Scan modal removed — scanning disabled */}
    </BrowserRouter>
  );
};
export default App;

