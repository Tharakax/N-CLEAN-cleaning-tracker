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

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>
              Quick 1-Click Role Login:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button
                type="button"
                onClick={() => setForm({ email: 'kasun.cleaner@gmail.com', password: 'cleaner123' })}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 8,
                  color: '#34d399',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                🧹 Cleaner
              </button>

              <button
                type="button"
                onClick={() => setForm({ email: 'admin@gmail.com', password: 'admin123' })}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 8,
                  color: '#60a5fa',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                👑 Admin
              </button>

              <button
                type="button"
                onClick={() => setForm({ email: 'nimali.cleaner@gmail.com', password: 'cleaner123' })}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 8,
                  color: '#22d3ee',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                🧹 Cleaner 2
              </button>
            </div>
          </div>

          <div className="demo-hint" style={{ marginTop: 16 }}>
            <strong>Cleaner Credentials:</strong> kasun.cleaner@gmail.com / cleaner123<br />
            <strong>Admin Credentials:</strong> admin@gmail.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
