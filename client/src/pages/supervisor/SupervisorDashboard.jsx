import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import AddPlaceModal from '../../components/AddPlaceModal';
import '../admin/AdminDashboard.css';

/* ── helpers ──────────────────────────────────────────────────── */
const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const formatFrequency = (freq, customDate) => {
  if (freq === 'custom' && customDate) {
    return `Custom: ${new Date(customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return freq.charAt(0).toUpperCase() + freq.slice(1);
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

/* ── Add Cleaner Modal (Supervisor locked to Cleaner role) ─────── */
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
        role: 'cleaner',
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

import AssignCleanerModal from '../../components/AssignCleanerModal';
import EditPlaceModal from '../../components/EditPlaceModal';

/* ── Place Card Component ─────────────────────────────────────── */
const PlaceCard = ({ place, onDelete, onAssign, onEdit }) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const assigned = place.assignedCleaners || [];

  return (
    <div className="place-card">
      {/* Photo carousel or fallback */}
      <div className="place-images-slider">
        {place.images && place.images.length > 0 ? (
          <>
            <img
              src={place.images[activeImgIndex]}
              alt={place.name}
              className="place-img-main"
            />
            {place.images.length > 1 && (
              <div className="place-img-badge">
                {activeImgIndex + 1} / {place.images.length}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIndex((prev) => (prev + 1) % place.images.length);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    marginLeft: 6,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                  title="Next photo"
                >
                  ▶
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="place-no-img">
            <span style={{ fontSize: 32 }}>🏢</span>
            <span>No images provided</span>
          </div>
        )}
      </div>

      <div className="place-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h4 className="place-name" style={{ margin: 0, flex: 1 }}>{place.name}</h4>
          <button
            onClick={() => onEdit(place)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 6,
              color: '#cbd5e1',
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'background 0.15s',
            }}
            title="Edit Place Details"
          >
            ✏️ Edit
          </button>
        </div>
        <div className="place-address" style={{ marginTop: 4 }}>
          <span>📍</span>
          <span>{place.address}</span>
        </div>

        {/* Tags */}
        <div className="place-meta-tags">
          {place.floors && place.floors.length > 0 && (
            <span
              className="place-tag"
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.3)' }}
              title="Configured Floors and Areas"
            >
              🏢 {place.floors.length} Floor{place.floors.length > 1 ? 's' : ''} ({place.floors.reduce((sum, f) => sum + (f.areas?.length || 0), 0)} Areas)
            </span>
          )}
          <span className="place-tag time" title="Estimated Time">
            ⏱️ {place.estimatedTimeMinutes} mins
          </span>
          <span className="place-tag frequency" title="Cleaning Frequency">
            🔄 {formatFrequency(place.frequency, place.customDate)}
          </span>
          <span className="place-tag workers" title="Workers Needed">
            👥 {place.workersNeeded} Worker{place.workersNeeded > 1 ? 's' : ''}
          </span>
          <span className="place-tag tod" title="Time of Day">
            ☀️ {place.timeOfDay.charAt(0).toUpperCase() + place.timeOfDay.slice(1)}
          </span>
        </div>

        {place.description && (
          <p className="place-desc">
            {place.description}
          </p>
        )}

        {/* Assigned Cleaners Section */}
        <div
          style={{
            margin: '10px 0 14px',
            padding: '10px 12px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
              Assigned Cleaners ({assigned.length})
            </span>
            <button
              onClick={() => onAssign(place)}
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: '#60a5fa',
                fontSize: 11.5,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'background 0.15s',
              }}
              title="Assign cleaners to place"
            >
              ⚙️ Manage
            </button>
          </div>

          {assigned.length === 0 ? (
            <div style={{ fontSize: 12, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>⚠️</span> <span>No cleaners assigned yet</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {assigned.map((c) => {
                const cleanerName = typeof c === 'object' ? c.name : 'Cleaner';
                return (
                  <span
                    key={typeof c === 'object' ? c._id : c}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      padding: '2px 8px',
                      borderRadius: 100,
                    }}
                  >
                    <span>🧹</span> {cleanerName}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button: Assign Cleaning Place */}
        <button
          className="btn-assign-place"
          onClick={() => onAssign(place)}
          style={{
            width: '100%',
            marginBottom: 12,
            padding: '9px 14px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: 8,
            color: '#93c5fd',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(139, 92, 246, 0.25))';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
            e.currentTarget.style.color = '#93c5fd';
          }}
        >
          <span>👤+</span> Assign Cleaning Place
        </button>

        <div className="place-card-footer">
          {place.googleMapsUrl || place.googleMapUrl || (place.location?.coordinates && `https://www.google.com/maps?q=${place.location.coordinates[1]},${place.location.coordinates[0]}`) ? (
            <a
              href={
                place.googleMapsUrl ||
                place.googleMapUrl ||
                `https://www.google.com/maps?q=${place.location.coordinates[1]},${place.location.coordinates[0]}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="map-btn-link"
            >
              🗺️ Open in Google Maps
            </a>
          ) : (
            <span style={{ fontSize: 12, color: '#475569' }}>No Map Link</span>
          )}

          <button
            className="btn-delete-user"
            onClick={() => onDelete(place._id)}
            title="Remove place"
          >
            🗑️
          </button>
        </div>
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
  const [places, setPlaces] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [cleanersLoading, setCleanersLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [showAddCleaner, setShowAddCleaner] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [assigningPlace, setAssigningPlace] = useState(null);
  const [editingPlace, setEditingPlace] = useState(null);
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

  const fetchPlaces = useCallback(async () => {
    try {
      setPlacesLoading(true);
      const { data } = await API.get('/places');
      setPlaces(data);
    } catch {
      /* ignore */
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCleaners();
    fetchPlaces();
  }, [fetchStats, fetchCleaners, fetchPlaces]);

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

  const handleDeletePlace = async (id) => {
    if (!window.confirm('Are you sure you want to remove this cleaning place?')) return;
    try {
      await API.delete(`/places/${id}`);
      setPlaces((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove place');
    }
  };

  const handlePlaceAssigned = (updatedPlace) => {
    setPlaces((prev) =>
      prev.map((p) => (p._id === updatedPlace._id ? updatedPlace : p))
    );
  };

  const handlePlaceUpdated = (updatedPlace) => {
    setPlaces((prev) =>
      prev.map((p) => (p._id === updatedPlace._id ? updatedPlace : p))
    );
  };

  const navItems = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'places',   icon: '📍', label: 'Cleaning Places' },
    { key: 'cleaners', icon: '🧹', label: 'Manage Cleaners' },
    { key: 'tasks',    icon: '✅', label: 'Cleaning Tasks' },
    { key: 'reports',  icon: '📈', label: 'Reports' },
  ];

  const statCards = [
    { icon: '📍', label: 'Cleaning Places',     value: places.length,                  color: 'blue'   },
    { icon: '🧹', label: 'Cleaners Supervised', value: cleaners.length,               color: 'cyan'   },
    { icon: '📋', label: 'Total Tasks',        value: stats?.totalTasks ?? 0,         color: 'amber'  },
    { icon: '✅', label: 'Completed Tasks',    value: stats?.completedTasks ?? 0,     color: 'green' },
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
                    Manage cleaning places, schedule operations, and oversee your cleaners.
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="stats-grid">
                {statCards.map((s) => (
                  <StatCard key={s.label} {...s} loading={statsLoading || placesLoading} />
                ))}
              </div>

              {/* Bottom grid */}
              <div className="dashboard-grid">
                {/* Recent Cleaning Places */}
                <div className="panel">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
                    <h3 className="section-heading" style={{ margin: 0 }}><span />Cleaning Places</h3>
                    <button
                      className="btn-create"
                      onClick={() => setShowAddPlace(true)}
                      id="supervisor-add-place-quick-btn"
                    >
                      + Add Place
                    </button>
                  </div>

                  {placesLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 48 }} />
                      ))}
                    </div>
                  ) : places.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📍</div>
                      No cleaning places added yet. Click <strong>+ Add Place</strong> to register locations.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {places.slice(0, 3).map((p) => (
                        <div
                          key={p._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            background: 'rgba(30, 41, 59, 0.4)',
                            borderRadius: 12,
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.address}</div>
                          </div>
                          <span className="place-tag frequency" style={{ margin: 0 }}>
                            {formatFrequency(p.frequency, p.customDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="panel">
                  <h3 className="section-heading"><span />Supervisor Actions</h3>
                  <div className="actions-grid">
                    {[
                      { icon: '📍', title: 'Add Place', desc: 'Register a new location requiring cleaning', action: () => setShowAddPlace(true) },
                      { icon: '🧹', title: 'Add Cleaner', desc: 'Onboard a new cleaner to your team', action: () => setShowAddCleaner(true) },
                      { icon: '📋', title: 'View Places', desc: 'Browse all cleaning places with details', action: () => setActiveTab('places') },
                      { icon: '👥', title: 'Cleaner List', desc: 'Manage your cleaners roster', action: () => setActiveTab('cleaners') },
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

          {/* ── Cleaning Places Tab ── */}
          {activeTab === 'places' && (
            <div className="panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 className="section-heading" style={{ margin: 0 }}><span />Cleaning Places</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                    Locations configured for cleaning schedules, time windows, and worker requirements.
                  </p>
                </div>
                <button
                  className="btn-create"
                  onClick={() => setShowAddPlace(true)}
                  id="supervisor-add-place-tab-btn"
                >
                  + Add Place
                </button>
              </div>

              {placesLoading ? (
                <div className="places-grid">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 320, borderRadius: 18 }} />
                  ))}
                </div>
              ) : places.length === 0 ? (
                <div className="empty-state" style={{ padding: 60 }}>
                  <div className="empty-state-icon">📍</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>No Cleaning Places Yet</div>
                  <p style={{ color: '#64748b', maxWidth: 360, margin: '0 auto 18px' }}>
                    Add locations needing cleaning including photos, cleaning times, frequency, and required worker count.
                  </p>
                  <button className="btn-create" onClick={() => setShowAddPlace(true)}>
                    + Add First Place
                  </button>
                </div>
              ) : (
                <div className="places-grid">
                  {places.map((place) => (
                    <PlaceCard
                      key={place._id}
                      place={place}
                      onDelete={handleDeletePlace}
                      onAssign={(p) => setAssigningPlace(p)}
                      onEdit={(p) => setEditingPlace(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Manage Cleaners Tab ── */}
          {activeTab === 'cleaners' && (
            <div className="panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
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

      {/* Add Cleaning Place Modal */}
      {showAddPlace && (
        <AddPlaceModal
          onClose={() => setShowAddPlace(false)}
          onCreated={(newPlace) => {
            setPlaces((prev) => [newPlace, ...prev]);
          }}
        />
      )}

      {/* Assign Cleaner Modal */}
      {assigningPlace && (
        <AssignCleanerModal
          place={assigningPlace}
          onClose={() => setAssigningPlace(null)}
          onAssigned={handlePlaceAssigned}
        />
      )}

      {/* Edit Cleaning Place Modal */}
      {editingPlace && (
        <EditPlaceModal
          place={editingPlace}
          onClose={() => setEditingPlace(null)}
          onUpdated={handlePlaceUpdated}
        />
      )}
    </div>
  );
};

export default SupervisorDashboard;
