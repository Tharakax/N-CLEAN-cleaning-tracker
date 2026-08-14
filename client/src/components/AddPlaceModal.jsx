import { useState } from 'react';
import API from '../api/axios';
import MediaUpload from '../utils/mediaUpload';

const AddPlaceModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    address: '',
    googleMapUrl: '',
    estimatedTimeMinutes: 60,
    frequency: 'daily',
    customDate: '',
    description: '',
    workersNeeded: 1,
    timeOfDay: 'anytime',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

    if (form.frequency === 'custom' && !form.customDate) {
      setError('Please select a custom date for custom frequency.');
      return;
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

      // 2. Save place details with Supabase image URLs in DB
      const payload = {
        ...form,
        images: uploadedUrls,
        estimatedTimeMinutes: Number(form.estimatedTimeMinutes),
        workersNeeded: Number(form.workersNeeded),
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
          Register a location that needs cleaning with scheduled requirements.
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
            <label className="form-label">Address *</label>
            <input
              className="modal-input"
              name="address"
              placeholder="e.g. 142 Galle Road, Colombo 03"
              value={form.address}
              onChange={handleChange}
              required
            />
          </div>

          {/* Google Maps URL */}
          <div className="form-group">
            <label className="form-label">Google Maps Location URL (Optional)</label>
            <input
              className="modal-input"
              name="googleMapUrl"
              placeholder="https://maps.google.com/?q=..."
              value={form.googleMapUrl}
              onChange={handleChange}
            />
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
              {uploading ? uploadProgressText || 'Uploading…' : 'Add Cleaning Place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlaceModal;
