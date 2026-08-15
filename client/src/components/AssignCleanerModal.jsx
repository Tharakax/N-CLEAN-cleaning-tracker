import { useState, useEffect } from 'react';
import API from '../api/axios';

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const AssignCleanerModal = ({ place, onClose, onAssigned }) => {
  const [cleaners, setCleaners] = useState([]);
  const [selectedCleaners, setSelectedCleaners] = useState([]);
  const [loadingCleaners, setLoadingCleaners] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Pre-populate with currently assigned cleaners
    if (place?.assignedCleaners) {
      const existingIds = place.assignedCleaners.map((c) =>
        typeof c === 'object' ? c._id : c
      );
      setSelectedCleaners(existingIds);
    }

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

  const toggleCleaner = (id) => {
    setSelectedCleaners((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { data } = await API.put(`/places/${place._id}/assign`, {
        cleanerIds: selectedCleaners,
      });
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🧹</span> Assign Cleaners
            </h3>
            <p className="modal-sub" style={{ margin: 0 }}>
              Assign cleaners to <strong>{place?.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Place summary banner */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
              Workers Recommended: <strong style={{ color: '#34d399' }}>{place?.workersNeeded || 1}</strong> &bull; Schedule: <span style={{ textTransform: 'capitalize' }}>{place?.frequency}</span> ({place?.timeOfDay})
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
            {selectedCleaners.length} Cleaner{selectedCleaners.length !== 1 ? 's' : ''} Selected
          </span>
        </div>

        {error && (
          <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 14, background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Search Filter */}
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

        {/* Cleaners List */}
        <div
          style={{
            maxHeight: 250,
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            background: '#070d18',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loadingCleaners ? (
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
              ))}
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
                  onClick={() => toggleCleaner(cleaner._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom:
                      index < filteredCleaners.length - 1
                        ? '1px solid rgba(255, 255, 255, 0.05)'
                        : 'none',
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      className="user-mini-avatar"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                        width: 34,
                        height: 34,
                        fontSize: 12,
                      }}
                    >
                      {initials(cleaner.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9' }}>
                        {cleaner.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>
                        {cleaner.email}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: `1.5px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'}`,
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

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-create" onClick={handleSave} disabled={saving}>
            {saving ? 'Assigning…' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignCleanerModal;
