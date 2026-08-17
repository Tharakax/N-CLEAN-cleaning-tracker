import { useState } from 'react';
import API from '../api/axios';
import MediaUpload from '../utils/mediaUpload';
import GoogleMapLocationPicker from './GoogleMapLocationPicker';
import FloorAreaBuilder from './FloorAreaBuilder';

const AddPlaceModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    address: '',
    estimatedTimeMinutes: 60,
    frequency: 'daily',
    customDate: '',
    description: '',
    workersNeeded: 1,
    timeOfDay: 'anytime',
    geofenceEnabled: true,
    geofenceRadiusMeters: 200,
  });

  const [floors, setFloors] = useState([]);

  const [locationData, setLocationData] = useState({
    latitude: null,
    longitude: null,
    googleMapsUrl: '',
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleLocationSelect = (loc) => {
    setLocationData({
      latitude: loc.latitude,
      longitude: loc.longitude,
      googleMapsUrl: loc.googleMapsUrl,
    });

    // If autocomplete provides an address and address field is empty, pre-fill it
    if (loc.address && !form.address) {
      setForm((prev) => ({ ...prev, address: loc.address }));
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 3) {
      setError('You can upload a maximum of 3 images (or leave blank).');
      return;
    }
    setError('');

    const newFiles = [...selectedFiles];
    const newPreviews = [...previews];

    files.forEach((file) => {
      if (newFiles.length < 3) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    });

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (
      locationData.latitude === null ||
      locationData.longitude === null ||
      isNaN(locationData.latitude) ||
      isNaN(locationData.longitude) ||
      locationData.latitude < -90 ||
      locationData.latitude > 90 ||
      locationData.longitude < -180 ||
      locationData.longitude > 180
    ) {
      setError('Please select a valid location on the Google Map (Latitude: -90 to 90, Longitude: -180 to 180).');
      return;
    }

    if (form.frequency === 'custom' && !form.customDate) {
      setError('Please select a custom date for custom frequency.');
      return;
    }

    // Floor & Area uniqueness check
    if (floors.length > 0) {
      const areaSet = new Set();
      for (const fl of floors) {
        if (!fl.floorName || !fl.floorName.trim()) {
          setError('Please provide a name for each configured floor.');
          return;
        }
        for (const ar of fl.areas || []) {
          if (!ar.name || !ar.name.trim()) {
            setError(`Please specify a name for all areas on floor "${fl.floorName}".`);
            return;
          }
          const key = `${fl.floorName.trim()} - ${ar.name.trim()}`.toLowerCase();
          if (areaSet.has(key)) {
            setError(`Area "${ar.name}" on floor "${fl.floorName}" is duplicated. All areas must be uniquely named.`);
            return;
          }
          areaSet.add(key);
        }
      }
    }

    setUploading(true);
    try {
      // 1. Upload files to Supabase Storage and collect Public URLs
      const uploadedUrls = [];
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          setUploadProgressText(`Uploading image ${i + 1} of ${selectedFiles.length}…`);
          const publicUrl = await MediaUpload(selectedFiles[i]);
          uploadedUrls.push(publicUrl);
        }
      }

      setUploadProgressText('Saving place details…');

      // 2. Save place details with GeoJSON latitude, longitude & googleMapsUrl
      const payload = {
        ...form,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        googleMapsUrl: locationData.googleMapsUrl,
        images: uploadedUrls,
        estimatedTimeMinutes: Number(form.estimatedTimeMinutes),
        workersNeeded: Number(form.workersNeeded),
        geofenceEnabled: Boolean(form.geofenceEnabled),
        geofenceRadiusMeters: Number(form.geofenceRadiusMeters) || 200,
        floors: floors,
      };

      const { data } = await API.post('/places', payload);
      onCreated(data);
      onClose();
    } catch (err) {
      console.error('Error in submission:', err);
      setError(
        typeof err === 'string'
          ? err
          : err.response?.data?.message || 'Failed to add cleaning place'
      );
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Cleaning Place</h3>
        <p className="modal-sub">
          Register a location that needs cleaning with scheduled requirements and map coordinates.
        </p>

        {error && (
          <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Place Name */}
          <div className="form-group">
            <label className="form-label">Place Name *</label>
            <input
              className="modal-input"
              name="name"
              placeholder="e.g. Grand City Mall - 2nd Floor Restrooms"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Address / Location Description *</label>
            <input
              className="modal-input"
              name="address"
              placeholder="e.g. 142 Galle Road, Colombo 03"
              value={form.address}
              onChange={handleChange}
              required
            />
          </div>

          {/* Google Maps Location Selector */}
          <div className="form-group">
            <label className="form-label">Google Maps Exact Location *</label>
            <GoogleMapLocationPicker onLocationSelect={handleLocationSelect} />
          </div>

          {/* 2-column Grid: Frequency & Custom Date */}
          <div className="modal-grid-2">
            <div className="form-group">
              <label className="form-label">Cleaning Frequency *</label>
              <select
                className="modal-select"
                name="frequency"
                value={form.frequency}
                onChange={handleChange}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Select Custom Date</option>
              </select>
            </div>

            {form.frequency === 'custom' && (
              <div className="form-group">
                <label className="form-label">Custom Date *</label>
                <input
                  type="date"
                  className="modal-input"
                  name="customDate"
                  value={form.customDate}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
          </div>

          {/* GPS Vicinity Check (Google Maps Geofence) Toggle */}
          <div
            style={{
              padding: '14px 16px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📍</span> Enforce GPS Vicinity Check on Start
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Cleaner must be physically at the location to start the cleaning countdown timer.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: form.geofenceEnabled ? '#34d399' : '#94a3b8' }}>
                  {form.geofenceEnabled ? 'Active' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, geofenceEnabled: !p.geofenceEnabled }))}
                  style={{
                    width: 46,
                    height: 24,
                    borderRadius: 20,
                    background: form.geofenceEnabled ? '#10b981' : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    padding: 2,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      transform: form.geofenceEnabled ? 'translateX(22px)' : 'translateX(0)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
              </div>
            </div>

            {form.geofenceEnabled && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Allowed Radius:</span>
                {[100, 200, 300, 500, 1000].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, geofenceRadiusMeters: radius }))}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1px solid ${form.geofenceRadiusMeters === radius ? 'rgba(52, 211, 153, 0.6)' : 'rgba(255,255,255,0.1)'}`,
                      background: form.geofenceRadiusMeters === radius ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: form.geofenceRadiusMeters === radius ? '#34d399' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    {radius >= 1000 ? `${radius / 1000} km` : `${radius}m`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2-column Grid: Approx time & Workers needed */}
          <div className="modal-grid-2">
            <div className="form-group">
              <label className="form-label">Approx. Cleaning Time (Minutes) *</label>
              <input
                type="number"
                min="5"
                step="5"
                className="modal-input"
                name="estimatedTimeMinutes"
                placeholder="60"
                value={form.estimatedTimeMinutes}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Workers Needed *</label>
              <input
                type="number"
                min="1"
                max="50"
                className="modal-input"
                name="workersNeeded"
                placeholder="2"
                value={form.workersNeeded}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Suitable Cleaning Time of Day */}
          <div className="form-group">
            <label className="form-label">Suitable Time of Day *</label>
            <select
              className="modal-select"
              name="timeOfDay"
              value={form.timeOfDay}
              onChange={handleChange}
            >
              <option value="anytime">Anytime of the day</option>
              <option value="morning">Morning (06:00 - 12:00)</option>
              <option value="afternoon">Afternoon (12:00 - 17:00)</option>
              <option value="evening">Evening (17:00 - 21:00)</option>
              <option value="night">Night (21:00 - 06:00)</option>
            </select>
          </div>

          {/* Images Upload via Supabase (Up to 3, or leave blank) */}
          <div className="form-group">
            <label className="form-label">
              Place Photos (Up to 3 images — Optional, can leave blank)
            </label>
            <label className="image-upload-zone">
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                disabled={selectedFiles.length >= 3 || uploading}
              />
              <div className="upload-icon-wrapper">
                ☁️
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>
                {selectedFiles.length >= 3
                  ? 'Maximum 3 images reached'
                  : 'Click to browse images'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Up to 3 images (PNG, JPG, WEBP) • Uploads to cloud
              </div>
            </label>

            {previews.length > 0 && (
              <div className="img-previews-list">
                {previews.map((src, index) => (
                  <div key={index} className="img-preview-item">
                    <img src={src} alt={`Selected preview ${index + 1}`} />
                    {!uploading && (
                      <button
                        type="button"
                        className="img-remove-btn"
                        onClick={() => removeFile(index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customized Floors & Areas Layout (Rooms, Saunas, Halls, etc.) */}
          <div className="form-group">
            <FloorAreaBuilder
              floors={floors}
              onChange={setFloors}
              error={error}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description / Special Instructions</label>
            <textarea
              className="modal-input"
              name="description"
              rows={3}
              placeholder="e.g. Focus on sanitizing door handles, restocking soap dispensers, and floor buffing."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={uploading}>
              {uploading ? uploadProgressText || 'Saving Place…' : 'Add Cleaning Place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlaceModal;
