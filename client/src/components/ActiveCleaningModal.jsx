import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import API from '../api/axios';
import './ActiveCleaningModal.css';

/**
 * Calculate distance between two coordinates using the Haversine formula (meters)
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

const formatSeconds = (seconds) => {
  const absSecs = Math.abs(seconds);
  const m = Math.floor(absSecs / 60);
  const s = absSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatDurationSummary = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

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

const ActiveCleaningModal = ({ place, currentUser, onClose, onCompleted }) => {
  // Extract place coordinates [lng, lat]
  const targetLng = place?.location?.coordinates?.[0];
  const targetLat = place?.location?.coordinates?.[1];
  const hasCoordinates = typeof targetLat === 'number' && typeof targetLng === 'number';

  const geofenceActive = Boolean(place?.geofenceEnabled && hasCoordinates);
  const allowedRadius = place?.geofenceRadiusMeters || 200;

  // Flatten tasks: each area across all floors
  const initialTasks = useMemo(() => {
    const tasksList = [];
    if (Array.isArray(place?.floors) && place.floors.length > 0) {
      place.floors.forEach((floor, fIdx) => {
        (floor.areas || []).forEach((area, aIdx) => {
          tasksList.push({
            id: `${fIdx}_${aIdx}`,
            floorName: floor.floorName,
            areaName: area.name,
            areaType: area.type || 'room',
            estimatedMinutes: area.estimatedMinutes || 15,
            completed: false,
            completedAt: null,
          });
        });
      });
    }

    // If no floors/areas configured, create default general cleaning task
    if (tasksList.length === 0) {
      tasksList.push({
        id: 'general_cleaning',
        floorName: 'Main Facility',
        areaName: 'Complete Place Cleaning',
        areaType: 'other',
        estimatedMinutes: place?.estimatedTimeMinutes || 60,
        completed: false,
        completedAt: null,
      });
    }

    return tasksList;
  }, [place]);

  // Phase: 'verifying' | 'active' | 'summary'
  const [phase, setPhase] = useState('verifying');

  // Vicinity state
  const [checkingLocation, setCheckingLocation] = useState(geofenceActive);
  const [vicinityVerified, setVicinityVerified] = useState(!geofenceActive);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  // Active Task & Timer state
  const totalEstimatedSeconds = (place?.estimatedTimeMinutes || 60) * 60;
  const [timeRemaining, setTimeRemaining] = useState(totalEstimatedSeconds);
  const [exactElapsedSeconds, setExactElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [submitting, setSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  const timerRef = useRef(null);

  // Check GPS vicinity
  const verifyLocation = useCallback(() => {
    if (!geofenceActive) {
      setVicinityVerified(true);
      setCheckingLocation(false);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device/browser.');
      setCheckingLocation(false);
      return;
    }

    setCheckingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = calculateHaversineDistance(latitude, longitude, targetLat, targetLng);

        setUserLocation({ latitude, longitude, distanceMeters: dist });
        setCurrentDistance(dist);
        setCheckingLocation(false);

        if (dist <= allowedRadius) {
          setVicinityVerified(true);
        } else {
          setVicinityVerified(false);
        }
      },
      (error) => {
        setCheckingLocation(false);
        let errorMsg = 'Failed to obtain GPS coordinates.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access was denied. Please allow location permissions in your browser to verify vicinity.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'GPS location request timed out. Please try again.';
        }
        setLocationError(errorMsg);
        setVicinityVerified(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [geofenceActive, targetLat, targetLng, allowedRadius]);

  useEffect(() => {
    verifyLocation();
  }, [verifyLocation]);

  // Timer interval when active
  useEffect(() => {
    if (phase === 'active' && startTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setExactElapsedSeconds(elapsed);
        setTimeRemaining(totalEstimatedSeconds - elapsed);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, startTime, totalEstimatedSeconds]);

  // Handle Confirm Start
  const handleConfirmStart = async () => {
    try {
      // Mark status in-progress on backend
      await API.patch(`/places/${place._id}/status`, { status: 'in-progress' });
    } catch (err) {
      console.warn('Status patch notice:', err);
    }

    const start = new Date();
    setStartTime(start);
    setPhase('active');
  };

  // Toggle individual task completed
  const handleToggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date() : null,
            }
          : t
      )
    );
  };

  // Handle Confirm Finish
  const handleConfirmFinish = async () => {
    const allChecked = tasks.every((t) => t.completed);
    if (!allChecked) {
      const confirmIncomplete = window.confirm(
        'Some tasks have not been marked as completed yet. Do you want to finish and submit anyway?'
      );
      if (!confirmIncomplete) return;
    }

    const endTime = new Date();
    const finalSeconds = Math.max(1, exactElapsedSeconds);
    const estSeconds = totalEstimatedSeconds;
    const extraSeconds = Math.max(0, finalSeconds - estSeconds);
    const roundedHours = Math.max(1, Math.ceil(finalSeconds / 3600));

    const completedTasksPayload = tasks
      .filter((t) => t.completed)
      .map((t) => ({
        floorName: t.floorName,
        areaName: t.areaName,
        areaType: t.areaType,
        completedAt: t.completedAt || endTime,
      }));

    const payload = {
      placeId: place._id,
      startedAt: startTime || new Date(endTime.getTime() - finalSeconds * 1000),
      completedAt: endTime,
      scheduledDate: place.customDate || new Date(),
      estimatedMinutes: place.estimatedTimeMinutes || 60,
      exactDurationSeconds: finalSeconds,
      completedTasks: completedTasksPayload,
      verifiedVicinity: vicinityVerified,
      cleanerLocation: userLocation,
    };

    setSubmitting(true);
    try {
      const { data } = await API.post('/cleaning-logs', payload);
      setCompletionResult({
        ...data,
        exactSeconds: finalSeconds,
        extraSeconds,
        roundedHours,
      });
      setPhase('summary');
      if (onCompleted) onCompleted(data);
    } catch (err) {
      console.error('Error finishing cleaning session:', err);
      alert(err.response?.data?.message || 'Failed to submit cleaning session log');
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const isOvertime = timeRemaining < 0;

  return (
    <div className="active-clean-modal-overlay">
      <div className="active-clean-modal">
        {/* Header */}
        <div className="active-clean-header">
          <div>
            <h2 className="active-clean-title">
              {phase === 'summary' ? '🎉 Cleaning Session Finished!' : place.name}
            </h2>
            <div className="active-clean-sub">
              <span>📍</span> {place.address}
            </div>
          </div>

          {phase !== 'active' && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="active-clean-body">
          {/* ── PHASE 1: VERIFYING & START CONFIRMATION ── */}
          {phase === 'verifying' && (
            <div>
              {/* Geofence / Vicinity status banner */}
              {geofenceActive ? (
                <div
                  className={`vicinity-banner ${
                    checkingLocation
                      ? 'checking'
                      : vicinityVerified
                      ? 'verified'
                      : 'failed'
                  }`}
                >
                  <div className="vicinity-icon">
                    {checkingLocation ? '📡' : vicinityVerified ? '✅' : '⚠️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="vicinity-title">
                      {checkingLocation
                        ? 'Verifying Location Vicinity…'
                        : vicinityVerified
                        ? 'Location Vicinity Verified'
                        : 'Outside Cleaning Vicinity'}
                    </div>
                    <div className="vicinity-desc">
                      {checkingLocation &&
                        'Acquiring high-accuracy GPS coordinates to confirm you are at the cleaning site.'}
                      {!checkingLocation &&
                        vicinityVerified &&
                        `You are within ${currentDistance !== null ? `${currentDistance}m` : 'the allowed radius'} of ${place.name} (Requirement: within ${allowedRadius}m). You may now begin.`}
                      {!checkingLocation &&
                        !vicinityVerified &&
                        (locationError ||
                          `You are currently ~${currentDistance}m away. The required vicinity is within ${allowedRadius}m of the Google Maps location.`)}
                    </div>

                    {!checkingLocation && !vicinityVerified && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={verifyLocation}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            background: 'rgba(239, 68, 68, 0.25)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#fca5a5',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🔄 Re-check GPS Location
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="vicinity-banner disabled">
                  <div className="vicinity-icon">🌐</div>
                  <div>
                    <div className="vicinity-title">Standard Start (GPS Vicinity Check Disabled)</div>
                    <div className="vicinity-desc">
                      Admin has set this assignment to allow direct start without geofence GPS enforcement.
                    </div>
                  </div>
                </div>
              )}

              {/* Task Preview Card */}
              <div className="tasks-checklist-card">
                <div className="tasks-checklist-header">
                  <span className="tasks-checklist-title">
                    📋 Assigned Tasks / Areas ({tasks.length})
                  </span>
                  <span className="tasks-progress-badge">
                    Est. Duration: {place.estimatedTimeMinutes || 60} mins
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasks.map((task) => {
                    const icon = AREA_TYPE_ICONS[task.areaType] || '🚪';
                    return (
                      <div
                        key={task.id}
                        className="task-item-row"
                        style={{ cursor: 'default' }}
                      >
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#f1f5f9' }}>
                            {task.areaName}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Floor: {task.floorName}
                          </div>
                        </div>
                        <span className="task-floor-tag">⏱️ {task.estimatedMinutes}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions */}
              {place.description && (
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 18,
                    fontSize: 12.5,
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <strong style={{ color: '#cbd5e1' }}>Instructions:</strong> {place.description}
                </div>
              )}
            </div>
          )}

          {/* ── PHASE 2: ACTIVE CLEANING SESSION WITH LIVE TIMER ── */}
          {phase === 'active' && (
            <div>
              {/* Dynamic Live Timer Card */}
              <div className={`timer-container ${isOvertime ? 'overtime' : 'countdown'}`}>
                <div className="timer-badge">
                  {isOvertime ? '⚠️ Overtime Counting Up' : '⏱️ Time Remaining (Counting Down)'}
                </div>

                <div className="timer-digits">
                  {isOvertime
                    ? `+${formatSeconds(Math.abs(timeRemaining))}`
                    : formatSeconds(timeRemaining)}
                </div>

                <div className="timer-subtitle">
                  {isOvertime ? (
                    <span style={{ color: '#fca5a5' }}>
                      Estimated time reached! Total elapsed: {formatDurationSummary(exactElapsedSeconds)}
                    </span>
                  ) : (
                    <span>
                      Target: {place.estimatedTimeMinutes} mins • Elapsed: {formatDurationSummary(exactElapsedSeconds)}
                    </span>
                  )}
                </div>
              </div>

              {/* Individual Tasks Checklist */}
              <div className="tasks-checklist-card">
                <div className="tasks-checklist-header">
                  <span className="tasks-checklist-title">
                    Tick Completed Tasks & Areas
                  </span>
                  <span
                    className={`tasks-progress-badge ${
                      completedCount === tasks.length ? 'all-done' : ''
                    }`}
                  >
                    {completedCount} of {tasks.length} Completed {completedCount === tasks.length ? '✓' : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasks.map((task) => {
                    const icon = AREA_TYPE_ICONS[task.areaType] || '🚪';
                    return (
                      <div
                        key={task.id}
                        className={`task-item-row ${task.completed ? 'completed' : ''}`}
                        onClick={() => handleToggleTask(task.id)}
                      >
                        <div className="task-checkbox-custom">
                          {task.completed ? '✓' : ''}
                        </div>

                        <span style={{ fontSize: 18 }}>{icon}</span>

                        <span className="task-label-text">{task.areaName}</span>

                        <span className="task-floor-tag">{task.floorName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── PHASE 3: COMPLETION SUMMARY ── */}
          {phase === 'summary' && completionResult && (
            <div className="clean-summary-card">
              <div style={{ fontSize: 44, marginBottom: 8 }}>✨</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>
                Great Work, {currentUser?.name?.split(' ')[0] || 'Cleaner'}!
              </h3>
              <p style={{ fontSize: 13.5, color: '#94a3b8', margin: 0 }}>
                Your cleaning session details have been recorded and saved to the management reports.
              </p>

              <div className="summary-stats-grid">
                <div className="summary-stat-box">
                  <div className="summary-stat-label">Exact Duration</div>
                  <div className="summary-stat-val" style={{ color: '#60a5fa' }}>
                    ⏱️ {formatDurationSummary(completionResult.exactSeconds)}
                  </div>
                </div>

                <div className="summary-stat-box">
                  <div className="summary-stat-label">Extra Overtime</div>
                  <div
                    className="summary-stat-val"
                    style={{
                      color: completionResult.extraSeconds > 0 ? '#f87171' : '#34d399',
                    }}
                  >
                    {completionResult.extraSeconds > 0
                      ? `+${formatDurationSummary(completionResult.extraSeconds)}`
                      : '0s (On Time)'}
                  </div>
                </div>

                <div className="summary-stat-box">
                  <div className="summary-stat-label">Total Rounded Hours</div>
                  <div className="summary-stat-val" style={{ color: '#34d399' }}>
                    🕒 {completionResult.roundedHours} Hour{completionResult.roundedHours > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                    (Rounded up to next full hour)
                  </div>
                </div>

                <div className="summary-stat-box">
                  <div className="summary-stat-label">Completed Tasks</div>
                  <div className="summary-stat-val" style={{ color: '#c084fc' }}>
                    ✅ {completionResult.completedTasks?.length || tasks.length} Tasks
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="active-clean-footer">
          {phase === 'verifying' && (
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                style={{ flex: 1, padding: '12px 16px' }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-confirm-start"
                onClick={handleConfirmStart}
                disabled={!vicinityVerified || checkingLocation}
                style={{ flex: 2 }}
              >
                {checkingLocation ? 'Checking Vicinity…' : '🚀 Confirm Start Cleaning'}
              </button>
            </div>
          )}

          {phase === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
              <div style={{ fontSize: 12.5, color: '#94a3b8' }}>
                Completed:{' '}
                <strong style={{ color: '#f1f5f9' }}>
                  {completedCount} of {tasks.length}
                </strong>
              </div>

              <button
                type="button"
                className="btn-confirm-finish"
                onClick={handleConfirmFinish}
                disabled={submitting}
              >
                {submitting ? 'Saving Session…' : '✓ Confirm Finish Cleaning'}
              </button>
            </div>
          )}

          {phase === 'summary' && (
            <button
              type="button"
              className="btn-create"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                fontWeight: 800,
              }}
            >
              Done & Return to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveCleaningModal;
