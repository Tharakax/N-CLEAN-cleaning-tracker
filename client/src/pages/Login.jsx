import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      // Route based on role
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'supervisor') navigate('/supervisor/dashboard');
      else navigate('/cleaner/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Animated background */}
      <div className="login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Left hero panel */}
      <div className="login-left">
        <div className="brand-logo">
          <div className="brand-icon">🧹</div>
          <span className="brand-name">N-<span>CLEAN</span></span>
        </div>

        <h1 className="hero-heading">
          Professional<br />Cleaning, <em>Tracked</em><br />Perfectly.
        </h1>

        <p className="hero-sub">
          A unified platform for admins, supervisors, and cleaners to manage,
          assign, and complete cleaning tasks with full visibility.
        </p>

        <div className="role-badges">
          <span className="badge badge-admin">
            <span className="badge-dot" /> Admin
          </span>
          <span className="badge badge-super">
            <span className="badge-dot" /> Supervisor
          </span>
          <span className="badge badge-clean">
            <span className="badge-dot" /> Cleaner
          </span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <div className="login-card">
          <div className="card-header">
            <div className="card-logo">
              <div className="card-logo-icon">🧹</div>
              <span className="card-logo-text">N-<span>CLEAN</span></span>
            </div>
            <h2 className="card-title">Welcome back</h2>
            <p className="card-sub">
              Sign in to access your dashboard. Your role is detected automatically.
            </p>
          </div>

          {error && (
            <div className="error-box" role="alert">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
                <span className="input-icon">✉</span>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <span className="input-icon">🔒</span>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading} id="login-submit-btn">
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign In →</span>
              )}
            </button>
          </form>

          <div className="demo-hint">
            <strong>Admin demo:</strong> admin@gmail.com / admin123<br />
            Your role (Admin · Supervisor · Cleaner) is automatically detected.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
