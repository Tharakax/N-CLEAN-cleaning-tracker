import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import TaskDetailsModal from '../../components/TaskDetailsModal';
import ActiveCleaningModal from '../../components/ActiveCleaningModal';
import './CleanerDashboard.css';

/* ── helpers ──────────────────────────────────────────────────── */
const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const formatFrequency = (freq, customDate) => {
  if (freq === 'custom' && customDate) {
    return `Custom: ${new Date(customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return (freq || 'daily').charAt(0).toUpperCase() + (freq || 'daily').slice(1);
};

const CleanerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'in-progress' | 'completed'
  const [updatingId, setUpdatingId] = useState(null);
  const [activeCleaningPlace, setActiveCleaningPlace] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const fetchAssignedPlaces = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/places/my-tasks');
      setPlaces(data);

      // Check if user had an active cleaning modal open before refresh (via localStorage or in-progress status)
      const inProgressPlace = data.find((p) => p.cleaningStatus === 'in-progress');
      if (inProgressPlace) {
        // If localStorage has an active session for this place or another in-progress place, re-open modal
        for (const p of data) {
          const key = `nclean_active_session_${p._id}`;
          if (localStorage.getItem(key)) {
            setActiveCleaningPlace(p);
            return;
          }
        }
        // Fallback: If place is marked in-progress on backend, also automatically offer active timer modal
        setActiveCleaningPlace(inProgressPlace);
      }
    } catch (err) {
      console.error('Failed to load cleaner tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedPlaces();
  }, [fetchAssignedPlaces]);

  const handleStatusChange = async (placeId, newStatus) => {
    // If starting or working on cleaning, launch the Active Cleaning & Timer Modal
    if (newStatus === 'in-progress') {
      const target = places.find((p) => p._id === placeId) || selectedPlace;
      if (target) {
        if (selectedPlace) setSelectedPlace(null);
        setActiveCleaningPlace(target);
        return;
      }
    }
    await executeStatusChange(placeId, newStatus);
  };

  const executeStatusChange = async (placeId, newStatus) => {
    try {
      setUpdatingId(placeId);
      const { data } = await API.patch(`/places/${placeId}/status`, {
        status: newStatus,
      });
      setPlaces((prev) =>
        prev.map((p) => (p._id === placeId ? data : p))
      );
      if (selectedPlace && selectedPlace._id === placeId) {
        setSelectedPlace(data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update cleaning status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCleaningCompleted = (newLog) => {
    fetchAssignedPlaces();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Metrics
  const totalTasks = places.length;
  const pendingTasks = places.filter((p) => !p.cleaningStatus || p.cleaningStatus === 'pending').length;
  const inProgressTasks = places.filter((p) => p.cleaningStatus === 'in-progress').length;
  const completedTasks = places.filter((p) => p.cleaningStatus === 'completed').length;

  // Filtered List
  const filteredPlaces = places.filter((p) => {
    const status = p.cleaningStatus || 'pending';
    if (filter === 'all') return true;
    return status === filter;
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="cleaner-root">
      {/* ── Top Navigation Bar ── */}
      <header className="cleaner-header">
        <div className="cleaner-brand">
          <div className="cleaner-brand-icon">🧹</div>
          <div className="cleaner-brand-name">
            N-<span>CLEAN</span>
          </div>
        </div>

        <div className="cleaner-user-menu">
          <div className="cleaner-avatar">
            <div className="cleaner-avatar-circle">{initials(user?.name)}</div>
            <span className="cleaner-avatar-name">{user?.name?.split(' ')[0] || 'Cleaner'}</span>
          </div>

          <button className="cleaner-logout-btn" onClick={handleLogout} title="Sign Out">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="cleaner-container">
        {/* Welcome Card */}
        <div className="cleaner-welcome">
          <div>
            <div className="cleaner-welcome-greeting">{greeting} 👋</div>
            <div className="cleaner-welcome-title">Welcome, {user?.name || 'Staff'}</div>
            <div className="cleaner-welcome-sub">
              Here are your assigned cleaning locations for today. Tap any task to see full instructions & directions.
            </div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="cleaner-metrics">
          <div className="cleaner-metric-card">
            <div className="cleaner-metric-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
              📍
            </div>
            <div>
              <div className="cleaner-metric-val">{totalTasks}</div>
              <div className="cleaner-metric-label">Total Assigned</div>
            </div>
          </div>

          <div className="cleaner-metric-card">
            <div className="cleaner-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}>
              ⏳
            </div>
            <div>
              <div className="cleaner-metric-val">{pendingTasks}</div>
              <div className="cleaner-metric-label">To Do</div>
            </div>
          </div>

          <div className="cleaner-metric-card">
            <div className="cleaner-metric-icon" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee' }}>
              🚀
            </div>
            <div>
              <div className="cleaner-metric-val">{inProgressTasks}</div>
              <div className="cleaner-metric-label">In Progress</div>
            </div>
          </div>

          <div className="cleaner-metric-card">
            <div className="cleaner-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
              ✅
            </div>
            <div>
              <div className="cleaner-metric-val">{completedTasks}</div>
              <div className="cleaner-metric-label">Completed</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="cleaner-tabs">
          <button
            className={`cleaner-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Tasks <span className="cleaner-tab-badge">{totalTasks}</span>
          </button>
          <button
            className={`cleaner-tab-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            ⏳ To Do <span className="cleaner-tab-badge">{pendingTasks}</span>
          </button>
          <button
            className={`cleaner-tab-btn ${filter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setFilter('in-progress')}
          >
            🚀 In Progress <span className="cleaner-tab-badge">{inProgressTasks}</span>
          </button>
          <button
            className={`cleaner-tab-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            ✅ Completed <span className="cleaner-tab-badge">{completedTasks}</span>
          </button>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
            ))}
          </div>
        ) : places.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 18,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧹</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
              No Cleaning Tasks Assigned Yet
            </div>
            <p style={{ color: '#64748b', maxWidth: 360, margin: '0 auto', fontSize: 13.5 }}>
              Your supervisor or admin hasn't assigned you to any cleaning places yet. Check back soon!
            </p>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 15, color: '#94a3b8' }}>
              No tasks found in the <strong>"{filter}"</strong> view.
            </div>
          </div>
        ) : (
          <div className="cleaner-tasks-grid">
            {filteredPlaces.map((place) => {
              const status = place.cleaningStatus || 'pending';
              const isUpdating = updatingId === place._id;
              const mapsLink =
                place.googleMapsUrl ||
                place.googleMapUrl ||
                (place.location?.coordinates && place.location.coordinates.length === 2
                  ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.coordinates[1]},${place.location.coordinates[0]}`
                  : null);

              return (
                <div
                  key={place._id}
                  className={`cleaner-task-card ${status === 'completed' ? 'completed' : ''}`}
                  onClick={() => setSelectedPlace(place)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Media */}
                  <div className="cleaner-task-media">
                    {place.images && place.images.length > 0 ? (
                      <img
                        src={place.images[0]}
                        alt={place.name}
                        className="cleaner-task-img"
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#64748b' }}>
                        <span style={{ fontSize: 36 }}>🏢</span>
                        <div style={{ fontSize: 11, marginTop: 4 }}>No Photo</div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="cleaner-task-content">
                    <div>
                      <div className="cleaner-task-header">
                        <div>
                          <h3 className="cleaner-task-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {place.name}
                            <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 500 }}>
                              (Tap for details ℹ️)
                            </span>
                          </h3>
                          <div className="cleaner-task-address">
                            <span>📍</span> {place.address}
                          </div>
                        </div>

                        {/* Status Chip */}
                        <span className={`cleaner-status-badge ${status}`}>
                          {status === 'completed' && '✓ Completed'}
                          {status === 'in-progress' && '🚀 Cleaning In-Progress'}
                          {status === 'pending' && '⏳ To Do'}
                        </span>
                      </div>

                      {/* Meta Tags */}
                      <div className="cleaner-meta-row">
                        <span className="cleaner-meta-tag" title="Cleaning duration">
                          ⏱️ {place.estimatedTimeMinutes} mins
                        </span>
                        <span className="cleaner-meta-tag" title="Shift / Time of day">
                          ☀️ {(place.timeOfDay || 'anytime').charAt(0).toUpperCase() + (place.timeOfDay || 'anytime').slice(1)}
                        </span>
                        <span className="cleaner-meta-tag" title="Cleaning frequency">
                          🔄 {formatFrequency(place.frequency, place.customDate)}
                        </span>
                        {place.assignedCleaners && place.assignedCleaners.length > 1 && (
                          <span className="cleaner-meta-tag" title="Co-workers on site">
                            👥 {place.assignedCleaners.length} Co-workers
                          </span>
                        )}
                      </div>

                      {place.description && (
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.4 }}>
                          {place.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div
                      className="cleaner-task-footer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {mapsLink ? (
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="map-btn-link"
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: 8,
                            color: '#60a5fa',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                          }}
                          title="Open navigation directions in Google Maps"
                        >
                          <span style={{ fontSize: 16 }}>🧭</span> Directions (Google Maps)
                        </a>
                      ) : (
                        <div />
                      )}

                      <div className="cleaner-action-btn-group">
                        {status === 'pending' && (
                          <button
                            className="btn-status-action btn-start-cleaning"
                            onClick={() => handleStatusChange(place._id, 'in-progress')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? 'Updating…' : '🚀 Start Cleaning'}
                          </button>
                        )}

                        {status === 'in-progress' && (
                          <>
                            <button
                              className="btn-status-action btn-start-cleaning"
                              onClick={() => {
                                if (selectedPlace) setSelectedPlace(null);
                                setActiveCleaningPlace(place);
                              }}
                              disabled={isUpdating}
                              style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                              }}
                            >
                              ⏱️ View Active Timer
                            </button>
                            <button
                              className="btn-reset-status"
                              onClick={() => handleStatusChange(place._id, 'pending')}
                              disabled={isUpdating}
                              title="Reset back to pending"
                            >
                              Reset
                            </button>
                          </>
                        )}

                        {status === 'completed' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12.5, color: '#34d399', fontWeight: 600 }}>
                              ✓ Completed {place.lastCleanedAt ? new Date(place.lastCleanedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Task Details Popup Modal */}
      {selectedPlace && (
        <TaskDetailsModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onStatusChange={handleStatusChange}
          isUpdating={updatingId === selectedPlace._id}
          currentUserId={user?._id}
        />
      )}

      {/* Active Cleaning Modal (Vicinity Check, Tasks Modal, Countdown & Overtime Timer) */}
      {activeCleaningPlace && (
        <ActiveCleaningModal
          place={activeCleaningPlace}
          currentUser={user}
          onClose={() => {
            setActiveCleaningPlace(null);
            fetchAssignedPlaces();
          }}
          onCompleted={handleCleaningCompleted}
        />
      )}
    </div>
  );
};

export default CleanerDashboard;
