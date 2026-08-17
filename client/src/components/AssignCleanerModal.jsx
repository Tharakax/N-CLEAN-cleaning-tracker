import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const AREA_TYPE_ICONS = {
  room: '🚪',
  sauna: '🧖‍♂️',
  hall: '🏛️',
  restroom: '🚻',
  kitchen: '🍳',
  lobby: '🏨',
  office: '💼',
  corridor: '🚶',
  other: '📍',
};

const CLEANER_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.4)', text: '#93c5fd', dot: '#3b82f6' },
  { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', dot: '#10b981' },
  { bg: 'rgba(168, 85, 247, 0.18)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', dot: '#a855f7' },
  { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', dot: '#f59e0b' },
  { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)', text: '#fca5a5', dot: '#ef4444' },
  { bg: 'rgba(6, 182, 212, 0.18)', border: 'rgba(6, 182, 212, 0.4)', text: '#22d3ee', dot: '#06b6d4' },
];

const AssignCleanerModal = ({ place, onClose, onAssigned }) => {
  const hasFloors = place?.floors && place.floors.length > 0;

  // 'place' = assign to entire place, 'area' = assign per-area
  const [mode, setMode] = useState(hasFloors ? 'area' : 'place');

  const [cleaners, setCleaners] = useState([]);
  const [loadingCleaners, setLoadingCleaners] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Place-wide selected cleaners
  const [selectedCleaners, setSelectedCleaners] = useState([]);

  // Area-level assignments: { [floorIdx_areaIdx]: [cleanerId, ...] }
  const [areaAssignments, setAreaAssignments] = useState({});

  // Active cleaner being "dragged" or selected to assign to areas
  const [activeCleaner, setActiveCleaner] = useState(null);

  // Schedule state
  const [scheduledDate, setScheduledDate] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // Geofence Vicinity Verification Toggle & Radius
  const [geofenceEnabled, setGeofenceEnabled] = useState(
    place?.geofenceEnabled !== undefined ? place.geofenceEnabled : true
  );
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState(
    place?.geofenceRadiusMeters || 200
  );

  useEffect(() => {
    // Pre-populate place-level
    if (place?.assignedCleaners) {
      const existingIds = place.assignedCleaners.map((c) =>
        typeof c === 'object' ? c._id : c
      );
      setSelectedCleaners(existingIds);
    }

    // Pre-populate schedule and geofence from existing place values
    if (place?.frequency) setFrequency(place.frequency);
    if (place?.customDate) {
      const d = new Date(place.customDate);
      setCustomDateEnd(d.toISOString().split('T')[0]);
    }
    if (place?.geofenceEnabled !== undefined) {
      setGeofenceEnabled(place.geofenceEnabled);
    }
    if (place?.geofenceRadiusMeters) {
      setGeofenceRadiusMeters(place.geofenceRadiusMeters);
    }
    // Default scheduledDate to today
    setScheduledDate(new Date().toISOString().split('T')[0]);

    // Pre-populate area-level
    const initialAreaAssign = {};
    if (place?.floors) {
      place.floors.forEach((fl, flIdx) => {
        (fl.areas || []).forEach((ar, arIdx) => {
          const key = `${flIdx}_${arIdx}`;
          if (ar.assignedCleaners && ar.assignedCleaners.length > 0) {
            initialAreaAssign[key] = ar.assignedCleaners.map((c) =>
              typeof c === 'object' ? c._id : c
            );
          } else {
            initialAreaAssign[key] = [];
          }
        });
      });
    }
    setAreaAssignments(initialAreaAssign);

    const fetchCleaners = async () => {
      try {
        setLoadingCleaners(true);
        const { data } = await API.get('/users');
        setCleaners(data.filter((u) => u.role === 'cleaner'));
      } catch (err) {
        console.error('Error fetching cleaners:', err);
        setError('Failed to load registered cleaners.');
      } finally {
        setLoadingCleaners(false);
      }
    };
    fetchCleaners();
  }, [place]);

  // Map cleanerId -> color index for consistent color coding
  const cleanerColorMap = useMemo(() => {
    const map = {};
    cleaners.forEach((c, idx) => {
      map[c._id] = CLEANER_COLORS[idx % CLEANER_COLORS.length];
    });
    return map;
  }, [cleaners]);

  const togglePlaceCleaner = (id) => {
    setSelectedCleaners((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAreaCleaner = (floorIdx, areaIdx, cleanerId) => {
    const key = `${floorIdx}_${areaIdx}`;
    setAreaAssignments((prev) => {
      const existing = prev[key] || [];
      const updated = existing.includes(cleanerId)
        ? existing.filter((id) => id !== cleanerId)
        : [...existing, cleanerId];
      return { ...prev, [key]: updated };
    });
  };

  const assignAllAreasOnFloor = (floorIdx, cleanerId) => {
    const floor = place.floors[floorIdx];
    if (!floor) return;
    setAreaAssignments((prev) => {
      const updated = { ...prev };
      floor.areas.forEach((_, arIdx) => {
        const key = `${floorIdx}_${arIdx}`;
        const existing = updated[key] || [];
        if (!existing.includes(cleanerId)) {
          updated[key] = [...existing, cleanerId];
        }
      });
      return updated;
    });
  };

  const clearFloor = (floorIdx) => {
    const floor = place.floors[floorIdx];
    if (!floor) return;
    setAreaAssignments((prev) => {
      const updated = { ...prev };
      floor.areas.forEach((_, arIdx) => {
        updated[`${floorIdx}_${arIdx}`] = [];
      });
      return updated;
    });
  };

  // For mode=area, build floorsPayload to send — only send what the backend needs
  const buildFloorsPayload = () => {
    return place.floors.map((fl, flIdx) => ({
      areas: fl.areas.map((ar, arIdx) => ({
        assignedCleaners: areaAssignments[`${flIdx}_${arIdx}`] || [],
      })),
    }));
  };

  const handleSave = async () => {
    setError('');

    // Validate schedule
    if (!scheduledDate) {
      setError('Please select a scheduled cleaning date.');
      return;
    }
    if (frequency === 'custom' && !customDateEnd) {
      setError('Please select an end date for the custom frequency range.');
      return;
    }
    if (frequency === 'custom' && customDateEnd && customDateEnd < scheduledDate) {
      setError('End date must be on or after the start date.');
      return;
    }

    setSaving(true);
    try {
      let payload;
      const scheduleData = {
        scheduledDate,
        frequency,
        ...(frequency === 'custom' ? { customDate: customDateEnd } : { customDate: null }),
        geofenceEnabled,
        geofenceRadiusMeters: Number(geofenceRadiusMeters) || 200,
      };
      if (mode === 'area' && hasFloors) {
        payload = { floors: buildFloorsPayload(), ...scheduleData };
      } else {
        payload = { cleanerIds: selectedCleaners, ...scheduleData };
      }
      const { data } = await API.put(`/places/${place._id}/assign`, payload);
      onAssigned(data);
      onClose();
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err.response?.data?.message || 'Failed to update cleaner assignments.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCleaners = cleaners.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary: count areas per cleaner (for area mode)
  const areaCountPerCleaner = useMemo(() => {
    const counts = {};
    Object.values(areaAssignments).forEach((ids) => {
      ids.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [areaAssignments]);

  const totalAreaCount = place?.floors?.reduce((sum, fl) => sum + (fl.areas?.length || 0), 0) || 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200, padding: 16 }}>
      <div
        className="modal modal-large"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 20,
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '22px 26px 16px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(7, 13, 24, 0.98))',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🧹</span> Assign Cleaners
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Assigning to <strong style={{ color: '#93c5fd' }}>{place?.name}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: '0 4px', marginTop: -2 }}
            >
              ✕
            </button>
          </div>

          {/* Mode toggle */}
          {hasFloors && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'area', label: '🏢 Assign by Area', desc: `${place.floors.length} floors, ${totalAreaCount} areas` },
                { key: 'place', label: '🌐 Assign to Whole Place', desc: 'All cleaners on all areas' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${mode === m.key ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255,255,255,0.1)'}`,
                    background: mode === m.key ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: mode === m.key ? '#93c5fd' : '#64748b',
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  {m.label}
                  <div style={{ fontSize: 10.5, color: mode === m.key ? '#60a5fa' : '#475569', marginTop: 2 }}>{m.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Modal Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── SCHEDULE SECTION (shared across both modes) ── */}
          <div
            style={{
              margin: '0',
              padding: '16px 26px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(7, 13, 24, 0.6)',
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94a3b8', marginBottom: 12 }}>
              📅 Schedule
            </div>

            {/* Error shown here too */}
            {error && (
              <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* Scheduled Date */}
              <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Cleaning Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="modal-input"
                  style={{
                    padding: '9px 12px',
                    fontSize: 13,
                    width: '100%',
                    background: scheduledDate ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.06)',
                    borderColor: scheduledDate ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)',
                    color: '#f1f5f9',
                    colorScheme: 'dark',
                  }}
                  required
                />
              </div>

              {/* Frequency */}
              <div style={{ flex: '1 1 320px' }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Cleaning Frequency
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'daily',   label: '📆 Daily' },
                    { key: 'weekly',  label: '🗓️ Weekly' },
                    { key: 'monthly', label: '📅 Monthly' },
                    { key: 'custom',  label: '✏️ Custom' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFrequency(f.key)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: `1.5px solid ${frequency === f.key ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
                        background: frequency === f.key ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                        color: frequency === f.key ? '#a5b4fc' : '#64748b',
                        fontWeight: 600,
                        fontSize: 12.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom date end picker */}
            {frequency === 'custom' && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Custom End Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={customDateEnd}
                    min={scheduledDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="modal-input"
                    style={{
                      padding: '9px 12px',
                      fontSize: 13,
                      width: '100%',
                      background: customDateEnd ? 'rgba(99,102,241,0.08)' : 'rgba(239,68,68,0.06)',
                      borderColor: customDateEnd ? 'rgba(99,102,241,0.35)' : 'rgba(239,68,68,0.35)',
                      color: '#f1f5f9',
                      colorScheme: 'dark',
                    }}
                    required
                  />
                </div>
                {scheduledDate && customDateEnd && customDateEnd >= scheduledDate && (
                  <div style={{ fontSize: 12, color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    ✏️ Custom range: <strong>
                      {Math.round((new Date(customDateEnd) - new Date(scheduledDate)) / (1000 * 60 * 60 * 24) + 1)} day{Math.round((new Date(customDateEnd) - new Date(scheduledDate)) / (1000 * 60 * 60 * 24) + 1) !== 1 ? 's' : ''}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Friendly summary */}
            {scheduledDate && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Scheduled for <strong>
                  {new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </strong>
                &nbsp;·&nbsp;
                <span style={{ textTransform: 'capitalize', color: '#a5b4fc' }}>
                  {frequency}{frequency === 'custom' && customDateEnd ? ` until ${new Date(customDateEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* ── GEOFENCE / VICINITY VERIFICATION SECTION ── */}
          <div
            style={{
              padding: '16px 26px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(15, 23, 42, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📍</span> GPS Vicinity Check (Google Maps Geofence)
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Cleaner must physically be within the designated area radius before starting cleaning.
                </div>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: geofenceEnabled ? '#34d399' : '#94a3b8' }}>
                  {geofenceEnabled ? 'Active / Required' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setGeofenceEnabled(!geofenceEnabled)}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 20,
                    background: geofenceEnabled ? '#10b981' : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    padding: 2,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      transform: geofenceEnabled ? 'translateX(22px)' : 'translateX(0)',
                      transition: 'transform 0.2s',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Radius Selector if Enabled */}
            {geofenceEnabled && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Allowed Radius:</span>
                {[100, 200, 300, 500, 1000].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setGeofenceRadiusMeters(radius)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      border: `1px solid ${geofenceRadiusMeters === radius ? 'rgba(52, 211, 153, 0.6)' : 'rgba(255,255,255,0.1)'}`,
                      background: geofenceRadiusMeters === radius ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: geofenceRadiusMeters === radius ? '#34d399' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {radius >= 1000 ? `${radius / 1000} km` : `${radius}m`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── AREA MODE ── */}
          {mode === 'area' && hasFloors && (
            <div style={{ padding: '20px 26px' }}>

              {/* Cleaner Roster with color coding */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#94a3b8', marginBottom: 10 }}>
                  🧹 Cleaner Roster — Click a cleaner to select, then tap areas below
                </div>

                {loadingCleaners ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 48, width: 140, borderRadius: 10 }} />)}
                  </div>
                ) : cleaners.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#64748b', padding: '16px 0' }}>No cleaners registered.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {cleaners.map((cleaner) => {
                      const color = cleanerColorMap[cleaner._id];
                      const isActive = activeCleaner?._id === cleaner._id;
                      const areaCount = areaCountPerCleaner[cleaner._id] || 0;
                      return (
                        <button
                          key={cleaner._id}
                          onClick={() => setActiveCleaner(isActive ? null : cleaner)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: `2px solid ${isActive ? color.dot : 'rgba(255,255,255,0.1)'}`,
                            background: isActive ? color.bg : 'rgba(255,255,255,0.04)',
                            color: isActive ? color.text : '#94a3b8',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13,
                            transition: 'all 0.15s',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: color.bg,
                              border: `2px solid ${color.border}`,
                              color: color.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {initials(cleaner.name)}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 13, lineHeight: 1 }}>{cleaner.name.split(' ')[0]}</div>
                            {areaCount > 0 && (
                              <div style={{ fontSize: 10.5, color: color.text, opacity: 0.85, marginTop: 1 }}>
                                {areaCount} area{areaCount !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                          {isActive && (
                            <span style={{ position: 'absolute', top: -6, right: -6, background: color.dot, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeCleaner && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👆</span>
                    Now click areas below to assign / unassign <strong>{activeCleaner.name}</strong>. Or use "Assign to Floor" to bulk assign.
                  </div>
                )}
              </div>

              {/* Floors & Areas Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {place.floors.map((floor, floorIdx) => (
                  <div
                    key={floorIdx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Floor header */}
                    <div style={{
                      padding: '11px 16px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🏛️ {floor.floorName}
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                          ({floor.areas?.length || 0} areas)
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {activeCleaner && (
                          <button
                            onClick={() => assignAllAreasOnFloor(floorIdx, activeCleaner._id)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 11.5,
                              fontWeight: 600,
                              borderRadius: 6,
                              border: `1px solid ${cleanerColorMap[activeCleaner._id]?.border || 'rgba(59,130,246,0.4)'}`,
                              background: cleanerColorMap[activeCleaner._id]?.bg || 'rgba(59,130,246,0.12)',
                              color: cleanerColorMap[activeCleaner._id]?.text || '#93c5fd',
                              cursor: 'pointer',
                            }}
                          >
                            + Assign All to {activeCleaner.name.split(' ')[0]}
                          </button>
                        )}
                        <button
                          onClick={() => clearFloor(floorIdx)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.08)',
                            color: '#fca5a5',
                            cursor: 'pointer',
                          }}
                        >
                          Clear Floor
                        </button>
                      </div>
                    </div>

                    {/* Areas */}
                    <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {(!floor.areas || floor.areas.length === 0) ? (
                        <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', padding: 6 }}>No areas configured on this floor.</div>
                      ) : (
                        floor.areas.map((area, areaIdx) => {
                          const key = `${floorIdx}_${areaIdx}`;
                          const areaCleanerIds = areaAssignments[key] || [];
                          const icon = AREA_TYPE_ICONS[area.type] || '🚪';
                          const isClickable = !!activeCleaner;
                          const isActiveCleanerAssigned = activeCleaner && areaCleanerIds.includes(activeCleaner._id);

                          return (
                            <div
                              key={areaIdx}
                              onClick={() => {
                                if (activeCleaner) toggleAreaCleaner(floorIdx, areaIdx, activeCleaner._id);
                              }}
                              style={{
                                background: isActiveCleanerAssigned
                                  ? cleanerColorMap[activeCleaner._id]?.bg || 'rgba(59,130,246,0.12)'
                                  : 'rgba(30, 41, 59, 0.5)',
                                border: `1.5px solid ${
                                  isActiveCleanerAssigned
                                    ? cleanerColorMap[activeCleaner._id]?.border || 'rgba(59,130,246,0.4)'
                                    : 'rgba(255,255,255,0.07)'
                                }`,
                                borderRadius: 10,
                                padding: '10px 12px',
                                cursor: isClickable ? 'pointer' : 'default',
                                transition: 'all 0.15s',
                                position: 'relative',
                              }}
                              onMouseEnter={(e) => {
                                if (isClickable && !isActiveCleanerAssigned) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isClickable && !isActiveCleanerAssigned) {
                                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 12.5, color: '#f1f5f9' }}>
                                  <span>{icon}</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{area.name}</span>
                                </div>
                                {area.estimatedMinutes && (
                                  <span style={{ fontSize: 10.5, color: '#64748b' }}>{area.estimatedMinutes}m</span>
                                )}
                              </div>

                              {/* Assigned cleaner avatars */}
                              {areaCleanerIds.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                  {areaCleanerIds.map((cId) => {
                                    const c = cleaners.find((x) => x._id === cId);
                                    const color = cleanerColorMap[cId];
                                    if (!c) return null;
                                    return (
                                      <span
                                        key={cId}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 3,
                                          fontSize: 10.5,
                                          fontWeight: 600,
                                          background: color?.bg || 'rgba(59,130,246,0.15)',
                                          border: `1px solid ${color?.border || 'rgba(59,130,246,0.3)'}`,
                                          color: color?.text || '#93c5fd',
                                          padding: '2px 6px',
                                          borderRadius: 100,
                                        }}
                                      >
                                        {initials(c.name)} {c.name.split(' ')[0]}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: 10.5, color: '#475569', fontStyle: 'italic' }}>
                                  {isClickable ? 'Click to assign' : 'Unassigned'}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PLACE-WIDE MODE ── */}
          {mode === 'place' && (
            <div style={{ padding: '20px 26px' }}>
              {/* Place summary banner */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📍 {place?.address}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                    Recommended: <strong style={{ color: '#34d399' }}>{place?.workersNeeded || 1}</strong> workers •{' '}
                    <span style={{ textTransform: 'capitalize' }}>{place?.frequency}</span> ({place?.timeOfDay})
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: selectedCleaners.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                    border: `1px solid ${selectedCleaners.length > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                    color: selectedCleaners.length > 0 ? '#60a5fa' : '#94a3b8',
                  }}
                >
                  {selectedCleaners.length} Selected
                </span>
              </div>


              <div style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="🔍 Search cleaners by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: 13, padding: '10px 14px' }}
                />
              </div>

              <div
                style={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  background: '#070d18',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {loadingCleaners ? (
                  <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
                  </div>
                ) : cleaners.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🧹</div>
                    No cleaners registered in the system yet.
                  </div>
                ) : filteredCleaners.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    No cleaners matched "{searchTerm}"
                  </div>
                ) : (
                  filteredCleaners.map((cleaner, index) => {
                    const isSelected = selectedCleaners.includes(cleaner._id);
                    return (
                      <div
                        key={cleaner._id}
                        onClick={() => togglePlaceCleaner(cleaner._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderBottom: index < filteredCleaners.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            className="user-mini-avatar"
                            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', width: 34, height: 34, fontSize: 12 }}
                          >
                            {initials(cleaner.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9' }}>{cleaner.name}</div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>{cleaner.email}</div>
                          </div>
                        </div>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: `1.5px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                            background: isSelected ? '#3b82f6' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 'bold',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 26px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(7, 13, 24, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Summary for area mode */}
          {mode === 'area' && hasFloors && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {Object.values(areaAssignments).filter((ids) => ids.length > 0).length} of {totalAreaCount} areas assigned
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-create"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : '✓ Save Assignments'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignCleanerModal;
