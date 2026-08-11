import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useConvexAuth } from "convex/react";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportItem from './pages/ReportItem';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={isAuthenticated ? <ProtectedRoute><Dashboard /></ProtectedRoute> : <Navigate to="/login" replace />} />
        <Route path="/report" element={isAuthenticated ? <ProtectedRoute><ReportItem /></ProtectedRoute> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
