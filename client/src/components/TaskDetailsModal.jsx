import { useState } from 'react';

const formatFrequency = (freq, customDate) => {
  if (freq === 'custom' && customDate) {
    return `Custom: ${new Date(customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return (freq || 'daily').charAt(0).toUpperCase() + (freq || 'daily').slice(1);
};

const TaskDetailsModal = ({ place, onClose, onStatusChange, isUpdating }) => {
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
                    className="btn-status-action btn-complete-cleaning"
                    onClick={() => onStatusChange(place._id, 'completed')}
                    disabled={isUpdating}
                    style={{ padding: '10px 20px', fontSize: 14 }}
                  >
                    {isUpdating ? 'Updating…' : '✓ Mark as Completed'}
                  </button>
                </>
              )}

              {status === 'completed' && (
                <button
                  className="btn-reset-status"
                  onClick={() => onStatusChange(place._id, 'in-progress')}
                  disabled={isUpdating}
                  style={{ padding: '9px 16px' }}
                >
                  🔄 Re-open Task
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
