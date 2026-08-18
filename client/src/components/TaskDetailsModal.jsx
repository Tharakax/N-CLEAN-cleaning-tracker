import { useState } from 'react';

const formatFrequency = (freq, customDate) => {
  if (freq === 'custom' && customDate) {
    return `Custom: ${new Date(customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return (freq || 'daily').charAt(0).toUpperCase() + (freq || 'daily').slice(1);
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

const TaskDetailsModal = ({ place, onClose, onStatusChange, isUpdating, currentUserId }) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  if (!place) return null;

  const status = place.cleaningStatus || 'pending';
  const mapsLink =
    place.googleMapsUrl ||
    place.googleMapUrl ||
    (place.location?.coordinates && place.location.coordinates.length === 2
      ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.coordinates[1]},${place.location.coordinates[0]}`
      : null);

  const images = place.images || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-large"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 620, padding: 0, overflow: 'hidden', borderRadius: 20 }}
      >
        {/* Modal Header Media & Close */}
        <div style={{ position: 'relative', width: '100%', height: images.length > 0 ? 240 : 120, background: '#0b1220' }}>
          {images.length > 0 ? (
            <>
              <img
                src={images[activeImgIndex]}
                alt={place.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {images.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {activeImgIndex + 1} / {images.length}
                  <button
                    onClick={() => setActiveImgIndex((prev) => (prev + 1) % images.length)}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, padding: 0 }}
                  >
                    ▶
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#64748b' }}>
              <span style={{ fontSize: 36 }}>🏢</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>No photos uploaded for this place</span>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px 28px', maxHeight: 'calc(85vh - 240px)', overflowY: 'auto' }}>
          {/* Title & Status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                {place.name}
              </h2>
              <div style={{ fontSize: 13.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📍</span> {place.address}
              </div>
            </div>

            <span className={`cleaner-status-badge ${status}`} style={{ fontSize: 12, padding: '5px 12px' }}>
              {status === 'completed' && '✓ Completed'}
              {status === 'in-progress' && '🚀 In-Progress'}
              {status === 'pending' && '⏳ To Do'}
            </span>
          </div>

          {/* Direction / Google Maps Button */}
          {mapsLink && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 18px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                borderRadius: 12,
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
                margin: '16px 0 20px',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 18 }}>🧭</span> Get Directions in Google Maps →
            </a>
          )}

          {/* Details Section */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Estimated Duration
              </span>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#60a5fa', marginTop: 3 }}>
                ⏱️ {place.estimatedTimeMinutes} Minutes
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Shift / Time Window
              </span>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#c084fc', marginTop: 3 }}>
                ☀️ {(place.timeOfDay || 'anytime').charAt(0).toUpperCase() + (place.timeOfDay || 'anytime').slice(1)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Frequency
              </span>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#f59e0b', marginTop: 3 }}>
                🔄 {formatFrequency(place.frequency, place.customDate)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Required Workers
              </span>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#34d399', marginTop: 3 }}>
                👥 {place.workersNeeded || 1} Person
              </div>
            </div>
          </div>

          {/* Floors & Custom Areas Breakdown */}
          {place.floors && place.floors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                🏢 Floors & Custom Areas to Clean ({place.floors.length} Floors):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {place.floors.map((fl, fIdx) => (
                  <div
                    key={fIdx}
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#60a5fa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🏛️</span> {fl.floorName}
                    </div>

                    {(!fl.areas || fl.areas.length === 0) ? (
                      <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                        No specific sub-areas listed for this floor.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {fl.areas.map((ar, aIdx) => {
                          const icon = AREA_TYPE_ICONS[ar.type] || '🚪';
                          const areaCleaners = ar.assignedCleaners || [];
                          const isMyArea = currentUserId && areaCleaners.some(
                            (c) => (typeof c === 'object' ? c._id : c) === currentUserId
                          );
                          return (
                            <div
                              key={aIdx}
                              style={{
                                background: isMyArea
                                  ? 'rgba(16, 185, 129, 0.08)'
                                  : 'rgba(15, 23, 42, 0.6)',
                                border: isMyArea
                                  ? '1.5px solid rgba(16, 185, 129, 0.35)'
                                  : '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: 8,
                                padding: '8px 12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: areaCleaners.length > 0 ? 6 : 0 }}>
                                <span style={{ fontWeight: 600, fontSize: 12.5, color: isMyArea ? '#34d399' : '#f1f5f9', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span>{icon}</span> {ar.name}
                                  {isMyArea && (
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: 'rgba(16, 185, 129, 0.2)',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      color: '#34d399',
                                      padding: '1px 6px',
                                      borderRadius: 100,
                                      marginLeft: 4,
                                    }}>
                                      ⭐ Your Area
                                    </span>
                                  )}
                                </span>
                                {ar.estimatedMinutes && (
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{ar.estimatedMinutes}m</span>
                                )}
                              </div>

                              {/* Assigned cleaners for this area */}
                              {areaCleaners.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {areaCleaners.map((c) => {
                                    const cId = typeof c === 'object' ? c._id : c;
                                    const cName = typeof c === 'object' ? c.name : 'Cleaner';
                                    const isMe = currentUserId && cId === currentUserId;
                                    return (
                                      <span
                                        key={cId}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 3,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          background: isMe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                                          border: isMe ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                          color: isMe ? '#34d399' : '#94a3b8',
                                          padding: '2px 7px',
                                          borderRadius: 100,
                                        }}
                                      >
                                        🧹 {cName.split(' ')[0]}{isMe ? ' (You)' : ''}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {areaCleaners.length === 0 && (
                                <div style={{ fontSize: 10.5, color: '#475569', fontStyle: 'italic', marginTop: 2 }}>Unassigned</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cleaning Instructions / Description */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              📋 Cleaning Instructions & Notes:
            </span>
            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: 13.5,
                color: '#cbd5e1',
                lineHeight: 1.5,
              }}
            >
              {place.description ? (
                place.description
              ) : (
                <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                  No special instructions specified for this place. Perform standard routine cleaning.
                </span>
              )}
            </div>
          </div>

          {/* Assigned Co-workers on Site */}
          {place.assignedCleaners && place.assignedCleaners.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                👥 Assigned Team Members ({place.assignedCleaners.length}):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {place.assignedCleaners.map((c) => (
                  <span
                    key={typeof c === 'object' ? c._id : c}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      padding: '4px 10px',
                      borderRadius: 100,
                    }}
                  >
                    <span>🧹</span> {typeof c === 'object' ? c.name : 'Cleaner'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Button Strip */}
          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              style={{ minWidth: 100 }}
            >
              Close
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {status === 'pending' && (
                <button
                  className="btn-status-action btn-start-cleaning"
                  onClick={() => onStatusChange(place._id, 'in-progress')}
                  disabled={isUpdating}
                  style={{ padding: '10px 20px', fontSize: 14 }}
                >
                  {isUpdating ? 'Updating…' : '🚀 Start Cleaning Now'}
                </button>
              )}

              {status === 'in-progress' && (
                <>
                  <button
                    className="btn-reset-status"
                    onClick={() => onStatusChange(place._id, 'pending')}
                    disabled={isUpdating}
                    style={{ padding: '9px 14px' }}
                  >
                    Reset to To-Do
                  </button>
                  <button
                    className="btn-status-action btn-start-cleaning"
                    onClick={() => onStatusChange(place._id, 'in-progress')}
                    disabled={isUpdating}
                    style={{
                      padding: '10px 20px',
                      fontSize: 14,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                    }}
                  >
                    ⏱️ View Active Timer
                  </button>
                </>
              )}

              {status === 'completed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#34d399', fontWeight: 700 }}>
                    ✓ Cleaning Finished {place.lastCleanedAt ? `at ${new Date(place.lastCleanedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
