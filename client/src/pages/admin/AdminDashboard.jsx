import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import './AdminDashboard.css';

/* ── helpers ──────────────────────────────────────────────────── */
const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const roleChip = (role) => {
  const map = { admin: 'chip-admin', supervisor: 'chip-supervisor', cleaner: 'chip-cleaner' };
  return <span className={`role-chip ${map[role] || ''}`}>{role}</span>;
};

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

/* ── Add User Modal ───────────────────────────────────────────── */
const AddUserModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cleaner' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/users', form);
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add New User</h3>
        <p className="modal-sub">Create a supervisor or cleaner account.</p>

        {error && (
          <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
        )}

        <form className="modal-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="modal-input"
              name="name"
              placeholder="John Doe"
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
              placeholder="user@example.com"
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
            <label className="form-label">Role</label>
            <select className="modal-select" name="role" value={form.role} onChange={handle}>
              <option value="supervisor">Supervisor</option>
              <option value="cleaner">Cleaner</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Main AdminDashboard ──────────────────────────────────────── */
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const handleNavClick = (key) => { setActiveTab(key); closeSidebar(); };

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data } = await API.get('/users/stats');
      setStats(data);
    } catch {
      /* silently fail — backend may be offline */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const { data } = await API.get('/users');
      setUsers(data);
    } catch {
      /* silently fail */
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await API.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'users',    icon: '👥', label: 'User Management' },
    { key: 'tasks',    icon: '✅', label: 'Tasks' },
    { key: 'reports',  icon: '📈', label: 'Reports' },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const statCards = [
    { icon: '👥', label: 'Total Staff',       value: stats?.totalUsers   ?? 0, color: 'blue'   },
    { icon: '🧑‍💼', label: 'Supervisors',      value: stats?.supervisors  ?? 0, color: 'purple' },
    { icon: '🧹', label: 'Cleaners',           value: stats?.cleaners     ?? 0, color: 'cyan'   },
    { icon: '📋', label: 'Total Tasks',        value: stats?.totalTasks   ?? 0, color: 'amber'  },
    { icon: '✅', label: 'Completed Tasks',    value: stats?.completedTasks ?? 0, color: 'green' },
    { icon: '⏳', label: 'Pending Tasks',      value: stats?.pendingTasks  ?? 0, color: 'red'   },
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
          <div className="sidebar-brand-icon">🧹</div>
          <span className="sidebar-brand-name">N-<span>CLEAN</span></span>
        </div>

        <p className="sidebar-section-label">Navigation</p>

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
            {/* Hamburger — shown on mobile via CSS */}
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
              <div className="avatar-circle">{initials(user?.name)}</div>
              <div className="avatar-info">
                <div className="avatar-name">{user?.name || 'Admin'}</div>
                <div className="avatar-role">Administrator</div>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <>
              {/* Welcome banner */}
              <div className="welcome-banner">
                <div>
                  <div className="welcome-greeting">{greeting}</div>
                  <div className="welcome-title">Welcome back, {user?.name?.split(' ')[0] || 'Admin'} 👋</div>
                  <div className="welcome-sub">
                    Here&apos;s a snapshot of N-CLEAN operations today.
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
                {/* Recent Users */}
                <div className="panel">
                  <h3 className="section-heading"><span />Recent Staff</h3>
                  {usersLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 48 }} />
                      ))}
                    </div>
                  ) : users.filter((u) => u.role !== 'admin').length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">👥</div>
                      No staff yet. Add users to get started.
                    </div>
                  ) : (
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter((u) => u.role !== 'admin').slice(0, 5).map((u) => (
                          <tr key={u._id}>
                            <td>
                              <div className="user-name-cell">
                                <div className="user-mini-avatar">{initials(u.name)}</div>
                                <div className="user-info">
                                  <div className="user-name-text">{u.name}</div>
                                  <div className="user-email-text">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>{roleChip(u.role)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="panel">
                  <h3 className="section-heading"><span />Quick Actions</h3>
                  <div className="actions-grid">
                    {[
                      { icon: '➕', title: 'Add Staff', desc: 'Create a supervisor or cleaner account', action: () => setActiveTab('users') },
                      { icon: '📋', title: 'New Task', desc: 'Assign a cleaning task to staff', action: () => setActiveTab('tasks') },
                      { icon: '📊', title: 'View Reports', desc: 'Inspect completion metrics', action: () => setActiveTab('reports') },
                      { icon: '⚙️', title: 'Settings', desc: 'Configure system preferences', action: () => setActiveTab('settings') },
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

          {/* ── Users Tab ── */}
          {activeTab === 'users' && (
            <div className="panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
                <h3 className="section-heading" style={{ margin: 0 }}><span />Staff Management</h3>
                <button
                  className="btn-create"
                  onClick={() => setShowAddUser(true)}
                  id="add-user-btn"
                >
                  + Add User
                </button>
              </div>

              {usersLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 54 }} />
                  ))}
                </div>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-mini-avatar"
                              style={u.role === 'admin' ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)' } : {}}>
                              {initials(u.name)}
                            </div>
                            <div className="user-info">
                              <div className="user-name-text">{u.name}</div>
                              <div className="user-email-text">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{roleChip(u.role)}</td>
                        <td style={{ fontSize: 13 }}>
                          {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          {u.role !== 'admin' && (
                            <button
                              className="btn-delete-user"
                              onClick={() => handleDeleteUser(u._id)}
                              title="Delete user"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Placeholder tabs ── */}
          {(activeTab === 'tasks' || activeTab === 'reports' || activeTab === 'settings') && (
            <div className="panel" style={{ textAlign: 'center', padding: 80 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>
                {activeTab === 'tasks' ? '✅' : activeTab === 'reports' ? '📈' : '⚙️'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                {activeTab === 'tasks' ? 'Task Manager' : activeTab === 'reports' ? 'Reports & Analytics' : 'Settings'}
              </div>
              <div style={{ fontSize: 14, color: '#475569' }}>
                This section is coming soon. You can build it out using the task routes already set up.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            fetchStats();
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
