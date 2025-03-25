import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminPage } from './pages/AdminPage';
import { AdminPropertyDetailPage } from './pages/AdminPropertyDetailPage';
import { AdminVisitsPage } from './pages/AdminVisitsPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { AccountSettings } from './components/AccountSettings';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthenticatedRoute() {
  const { user } = useAuth();
  
  // If user is authenticated, redirect to admin dashboard
  if (user) {
    return <Navigate to="/admin" replace />;
  }
  
  return <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/property/*" element={<PropertyDetailPage />} />
          <Route path="/login" element={<AuthenticatedRoute />} />
          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <AdminPage />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/property/:id"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <AdminPropertyDetailPage />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/visits"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <AdminVisitsPage />
                </AdminLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;