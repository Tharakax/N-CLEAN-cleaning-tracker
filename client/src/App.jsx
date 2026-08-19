import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import CleanerDashboard from './pages/cleaner/CleanerDashboard';

/** Redirect logged-in users to their role-specific dashboard */
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'supervisor') return <Navigate to="/supervisor/dashboard" replace />;
  return <Navigate to="/cleaner/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Root — redirect by role */}
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />

          {/* Supervisor */}
          <Route
            path="/supervisor/dashboard"
            element={
              <PrivateRoute roles={['supervisor']}>
                <SupervisorDashboard />
              </PrivateRoute>
            }
          />

          {/* Cleaner */}
          <Route
            path="/cleaner/dashboard"
            element={
              <PrivateRoute roles={['cleaner']}>
                <CleanerDashboard />
              </PrivateRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
