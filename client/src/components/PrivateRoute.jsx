import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects a route based on authentication and optionally by allowed roles.
 * @param {string[]} roles - optional list of allowed roles
 */
const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Redirect to the correct dashboard for the user's actual role
    const redirectMap = {
      admin:      '/admin/dashboard',
      supervisor: '/supervisor/dashboard',
      cleaner:    '/cleaner/dashboard',
    };
    return <Navigate to={redirectMap[user.role] || '/login'} replace />;
  }

  return children;
};

export default PrivateRoute;
