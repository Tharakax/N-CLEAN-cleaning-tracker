import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import '../admin/AdminDashboard.css';

/* ── helpers ──────────────────────────────────────────────────── */
const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

/* ── Stat card ────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color, loading }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-icon">{icon}</div>
    {loading ? (
      <div className="skeleton" style={{ height: 36, width: 60, marginBottom: 8 }} />
    ) : (
      <div className="stat-value">{value}</div>
    )}
    <div className="stat-label">{label}</div>
  </div>
);

/* ── Add Cleaner Modal (Supervisor cannot change role, locked to Cleaner) ── */
const AddCleanerModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cleaner' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'cleaner', // Explicitly cleaner
      });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add cleaner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add New Cleaner</h3>
        <p className="modal-sub">Register a cleaner staff member under your supervision.</p>

        {error && (
          <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
        )}

        <form className="modal-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="modal-input"
              name="name"
              placeholder="e.g. Maya Perera"
              value={form.name}
              onChange={handle}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="modal-input"
              name="email"
              type="email"
              placeholder="cleaner@example.com"
              value={form.email}
              onChange={handle}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="modal-input"
              name="password"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handle}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Role</label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 10,
                color: '#34d399',
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <span>🧹</span> Cleaner (Role locked)
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? 'Adding Cleaner…' : 'Add Cleaner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Main Supervisor Dashboard ───────────────────────────────── */
const SupervisorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [cleaners, setCleaners] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [cleanersLoading, setCleanersLoading] = useState(true);
  const [showAddCleaner, setShowAddCleaner] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const handleNavClick = (key) => { setActiveTab(key); closeSidebar(); };

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data } = await API.get('/users/stats');
      setStats(data);
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchCleaners = useCallback(async () => {
    try {
      setCleanersLoading(true);
      const { data } = await API.get('/users');
      setCleaners(data.filter((u) => u.role === 'cleaner'));
    } catch {
      /* ignore */
    } finally {
      setCleanersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCleaners();
  }, [fetchStats, fetchCleaners]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteCleaner = async (id) => {
    if (!window.confirm('Are you sure you want to remove this cleaner?')) return;
    try {
      await API.delete(`/users/${id}`);
      setCleaners((prev) => prev.filter((u) => u._id !== id));
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'cleaners', icon: '🧹', label: 'Manage Cleaners' },
    { key: 'tasks',    icon: '✅', label: 'Cleaning Tasks' },
    { key: 'reports',  icon: '📈', label: 'Reports' },
  ];

  const statCards = [
    { icon: '🧹', label: 'Cleaners Supervised', value: cleaners.length,               color: 'cyan'   },
    { icon: '📋', label: 'Total Tasks',        value: stats?.totalTasks ?? 0,         color: 'amber'  },
    { icon: '✅', label: 'Completed Tasks',    value: stats?.completedTasks ?? 0,     color: 'green' },
    { icon: '⏳', label: 'Pending Tasks',      value: stats?.pendingTasks ?? 0,       color: 'red'   },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="admin-root">
      {/* ── Sidebar overlay (mobile) ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
            🧹
          </div>
          <span className="sidebar-brand-name">N-<span>CLEAN</span></span>
        </div>

        <p className="sidebar-section-label">Supervisor Portal</p>

        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.key}>
              <button
                className={`sidebar-link ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className={`hamburger ${sidebarOpen ? 'open' : ''}`}
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle navigation"
              aria-expanded={sidebarOpen}
            >
              <span /><span /><span />
            </button>
            <span className="topbar-title">
              {navItems.find((n) => n.key === activeTab)?.icon}{' '}
              {navItems.find((n) => n.key === activeTab)?.label}
            </span>
          </div>

          <div className="topbar-right">
            <div className="admin-avatar">
              <div className="avatar-circle" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                {initials(user?.name)}
              </div>
              <div className="avatar-info">
                <div className="avatar-name">{user?.name || 'Supervisor'}</div>
                <div className="avatar-role" style={{ color: '#60a5fa' }}>Supervisor</div>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <>
              {/* Welcome banner */}
              <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(59,130,246,0.08))', borderColor: 'rgba(6,182,212,0.2)' }}>
                <div>
                  <div className="welcome-greeting" style={{ color: '#06b6d4' }}>{greeting}</div>
                  <div className="welcome-title">Supervisor {user?.name?.split(' ')[0] || ''} 🧑‍💼</div>
                  <div className="welcome-sub">
                    Monitor cleaning tasks and manage your cleaner team members.
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="stats-grid">
                {statCards.map((s) => (
                  <StatCard key={s.label} {...s} loading={statsLoading} />
                ))}
              </div>

              {/* Bottom grid */}
              <div className="dashboard-grid">
                {/* Active Cleaners */}
                <div className="panel">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 className="section-heading" style={{ margin: 0 }}><span />Your Cleaners</h3>
                    <button
                      className="btn-create"
                      onClick={() => setShowAddCleaner(true)}
                      id="supervisor-add-cleaner-quick-btn"
                    >
                      + Add Cleaner
                    </button>
                  </div>

                  {cleanersLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 48 }} />
                      ))}
                    </div>
                  ) : cleaners.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🧹</div>
                      No cleaners assigned yet. Click <strong>+ Add Cleaner</strong> to onboard staff.
                    </div>
                  ) : (
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Cleaner</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cleaners.slice(0, 5).map((u) => (
                          <tr key={u._id}>
                            <td>
                              <div className="user-name-cell">
                                <div
                                  className="user-mini-avatar"
                                  style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                                >
                                  {initials(u.name)}
                                </div>
                                <div className="user-info">
                                  <div className="user-name-text">{u.name}</div>
                                  <div className="user-email-text">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="role-chip chip-cleaner">Cleaner</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="panel">
                  <h3 className="section-heading"><span />Supervisor Actions</h3>
                  <div className="actions-grid">
                    {[
                      { icon: '➕', title: 'Add Cleaner', desc: 'Register a new cleaner to your team', action: () => setShowAddCleaner(true) },
                      { icon: '📋', title: 'Assign Task', desc: 'Create tasks for cleaner team', action: () => setActiveTab('tasks') },
                      { icon: '👥', title: 'View All Cleaners', desc: 'Browse all cleaners registered', action: () => setActiveTab('cleaners') },
                      { icon: '📈', title: 'Task Reports', desc: 'Review completed task logs', action: () => setActiveTab('reports') },
                    ].map((a) => (
                      <div key={a.title} className="action-card" onClick={a.action} role="button" tabIndex={0}>
                        <div className="action-icon">{a.icon}</div>
                        <div className="action-title">{a.title}</div>
                        <div className="action-desc">{a.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Manage Cleaners Tab ── */}
          {activeTab === 'cleaners' && (
            <div className="panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
                <div>
                  <h3 className="section-heading" style={{ margin: 0 }}><span />Cleaner Team</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                    Supervisors can register and manage cleaners.
                  </p>
                </div>
                <button
                  className="btn-create"
                  onClick={() => setShowAddCleaner(true)}
                  id="supervisor-add-cleaner-btn"
                >
                  + Add Cleaner
                </button>
              </div>

              {cleanersLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 54 }} />
                  ))}
                </div>
              ) : cleaners.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🧹</div>
                  No cleaners in the system. Use the button above to add cleaners.
                </div>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Cleaner</th>
                      <th>Role</th>
                      <th className="col-joined">Joined</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleaners.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div className="user-name-cell">
                            <div
                              className="user-mini-avatar"
                              style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                            >
                              {initials(u.name)}
                            </div>
                            <div className="user-info">
                              <div className="user-name-text">{u.name}</div>
                              <div className="user-email-text">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="role-chip chip-cleaner">Cleaner</span>
                        </td>
                        <td className="col-joined" style={{ fontSize: 13 }}>
                          {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          <button
                            className="btn-delete-user"
                            onClick={() => handleDeleteCleaner(u._id)}
                            title="Remove cleaner"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Placeholder tabs ── */}
          {(activeTab === 'tasks' || activeTab === 'reports') && (
            <div className="panel" style={{ textAlign: 'center', padding: 80 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>
                {activeTab === 'tasks' ? '📋' : '📈'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                {activeTab === 'tasks' ? 'Task Assignment' : 'Cleaning Reports'}
              </div>
              <div style={{ fontSize: 14, color: '#475569' }}>
                This section is being configured for supervisor task dispatch and verification.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Cleaner Modal */}
      {showAddCleaner && (
        <AddCleanerModal
          onClose={() => setShowAddCleaner(false)}
          onCreated={(newCleaner) => {
            setCleaners((prev) => [newCleaner, ...prev]);
            fetchStats();
          }}
        />
      )}
    </div>
  );
};

export default SupervisorDashboard;
