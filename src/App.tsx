import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportItem from './pages/ReportItem';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = useQuery(api.admin.isAdmin);
  if (isAdmin === undefined) return <div className="flex-center" style={{ minHeight: '100vh' }}><p>Checking permissions...</p></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

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
        <Route path="/admin" element={isAuthenticated ? <ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
