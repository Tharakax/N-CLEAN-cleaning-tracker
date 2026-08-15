import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from '@react-google-maps/api';

const libraries = ['places'];

// Default center: Colombo, Sri Lanka
const defaultCenter = {
  lat: 6.9271,
  lng: 79.8612,
};

const mapContainerStyle = {
  width: '100%',
  height: '280px',
  borderRadius: '12px',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    {
      featureType: 'administrative.country',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#4b6878' }],
    },
    {
      featureType: 'landscape.man_made',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#334e87' }],
    },
    {
      featureType: 'landscape.natural',
      elementType: 'geometry',
      stylers: [{ color: '#021019' }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#283d6a' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#304a7d' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#98a5be' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0e1626' }],
    },
  ],
};

const GoogleMapLocationPicker = ({
  onLocationSelect,
  initialLat,
  initialLng,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [position, setPosition] = useState(null);
  const [map, setMap] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const searchTimeoutRef = useRef(null);

  // Initialize position if initial coordinates provided
  useEffect(() => {
    if (initialLat && initialLng && !isNaN(initialLat) && !isNaN(initialLng)) {
      const initPos = { lat: Number(initialLat), lng: Number(initialLng) };
      setPosition(initPos);
      notifyParent(initPos.lat, initPos.lng);
    }
  }, [initialLat, initialLng]);

  const notifyParent = (lat, lng, addressText) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const googleMapsUrl = `https://www.google.com/maps?q=${latNum.toFixed(6)},${lngNum.toFixed(6)}`;
    onLocationSelect({
      latitude: latNum,
      longitude: lngNum,
      googleMapsUrl,
      address: addressText,
    });
  };

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Click on map to place/move marker
  const handleMapClick = useCallback(
    (e) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const newPos = { lat, lng };
      setPosition(newPos);
      setGeoError('');
      notifyParent(lat, lng);
    },
    [onLocationSelect]
  );

  // Drag marker to adjust location
  const handleMarkerDragEnd = useCallback(
    (e) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const newPos = { lat, lng };
      setPosition(newPos);
      setGeoError('');
      notifyParent(lat, lng);
    },
    [onLocationSelect]
  );

  // High-accuracy Multi-tier Search:
  // 1. Google Places Autocomplete & Details (Finds exact shops, offices, businesses, POIs)
  // 2. Google Geocoder
  // 3. OpenStreetMap Nominatim with rich addressdetails & POI support
  const performSearch = async (queryText) => {
    if (!queryText || queryText.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);

    try {
      // 1. First priority: Google Places Autocomplete Service (Exact businesses, offices, workplaces, shops)
      if (window.google?.maps?.places?.AutocompleteService) {
        try {
          const autoService = new window.google.maps.places.AutocompleteService();
          const autoResults = await new Promise((resolve) => {
            autoService.getPlacePredictions(
              {
                input: queryText,
                // Bias slightly towards current map position if set
                locationBias: position
                  ? new window.google.maps.LatLng(position.lat, position.lng)
                  : new window.google.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
              },
              (predictions, status) => {
                if (
                  status === window.google.maps.places.PlacesServiceStatus.OK &&
                  predictions &&
                  predictions.length > 0
                ) {
                  resolve(predictions);
                } else {
                  resolve(null);
                }
              }
            );
          });

          if (autoResults && autoResults.length > 0) {
            setSearchResults(
              autoResults.map((item) => ({
                isGooglePlace: true,
                place_id: item.place_id,
                display_name: item.description,
                main_text: item.structured_formatting?.main_text || item.description,
                secondary_text: item.structured_formatting?.secondary_text || '',
              }))
            );
            setShowDropdown(true);
            setSearching(false);
            return;
          }
        } catch (e) {
          console.warn('Google Places Autocomplete failed, trying Geocoder...', e);
        }
      }

      // 2. Google Geocoder fallback
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await new Promise((resolve) => {
          geocoder.geocode({ address: queryText }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(
                results.map((r) => ({
                  display_name: r.formatted_address,
                  lat: r.geometry.location.lat(),
                  lon: r.geometry.location.lng(),
                }))
              );
            } else {
              resolve(null);
            }
          });
        });

        if (response && response.length > 0) {
          setSearchResults(response);
          setShowDropdown(true);
          setSearching(false);
          return;
        }
      }

      // 3. High-accuracy OpenStreetMap Nominatim Search (covers POIs, shops, offices worldwide)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          queryText
        )}&addressdetails=1&extratags=1&namedetails=1&limit=8`
      );
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setSearchResults(
          data.map((item) => ({
            ...item,
            display_name: item.display_name,
            main_text: item.name || item.display_name.split(',')[0],
            secondary_text: item.display_name.split(',').slice(1).join(',').trim(),
          }))
        );
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(val);
    }, 300);
  };

  const handleSelectSearchResult = async (item) => {
    // If it's a Google Place prediction, resolve details (lat/lng) via PlacesService or Geocoder
    if (item.isGooglePlace && item.place_id) {
      try {
        if (window.google?.maps?.places?.PlacesService && map) {
          const service = new window.google.maps.places.PlacesService(map);
          service.getDetails(
            { placeId: item.place_id, fields: ['geometry', 'formatted_address', 'name'] },
            (place, status) => {
              if (
                status === window.google.maps.places.PlacesServiceStatus.OK &&
                place?.geometry?.location
              ) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const newPos = { lat, lng };

                setPosition(newPos);
                setSearchQuery(item.display_name);
                setShowDropdown(false);
                setGeoError('');

                if (map) {
                  map.panTo(newPos);
                  map.setZoom(17);
                }

                notifyParent(lat, lng, place.formatted_address || item.display_name);
                return;
              }
              // Fallback to geocoding if getDetails failed
              fallbackGeocodePlace(item);
            }
          );
          return;
        } else {
          fallbackGeocodePlace(item);
          return;
        }
      } catch (err) {
        console.error('Error fetching place details:', err);
        fallbackGeocodePlace(item);
        return;
      }
    }

    // Direct Lat/Lng items (Nominatim / Geocoder)
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon || item.lng);
    const newPos = { lat, lng };

    setPosition(newPos);
    setSearchQuery(item.display_name);
    setShowDropdown(false);
    setGeoError('');

    if (map) {
      map.panTo(newPos);
      map.setZoom(17);
    }

    notifyParent(lat, lng, item.display_name);
  };

  const fallbackGeocodePlace = (item) => {
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ placeId: item.place_id }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          const newPos = { lat, lng };

          setPosition(newPos);
          setSearchQuery(item.display_name);
          setShowDropdown(false);
          setGeoError('');

          if (map) {
            map.panTo(newPos);
            map.setZoom(17);
          }

          notifyParent(lat, lng, results[0].formatted_address || item.display_name);
        }
      });
    }
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newPos = { lat, lng };
        setPosition(newPos);
        setGeoLoading(false);

        if (map) {
          map.panTo(newPos);
          map.setZoom(17);
        }
        notifyParent(lat, lng);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission was denied. Please search or click on the map manually.');
        } else {
          setGeoError('Unable to retrieve your current location. Please click on the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loadError) {
    return (
      <div
        style={{
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          color: '#fca5a5',
          fontSize: '13px',
        }}
      >
        ⚠️ Google Maps failed to load. Please verify your API key and network connection.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="skeleton" style={{ height: '320px', borderRadius: '12px', marginBottom: '14px' }} />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Places Search Box */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="modal-input"
          placeholder="🔍 Search address, town, or place (e.g. beralapanathara, Colombo 03)..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          style={{
            paddingRight: '36px',
          }}
        />

        {searching && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '12px',
              color: '#3b82f6',
            }}
          >
            Searching…
          </div>
        )}

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              maxHeight: '260px',
              overflowY: 'auto',
            }}
          >
            {searchResults.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSearchResult(item)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom:
                    idx < searchResults.length - 1
                      ? '1px solid rgba(255, 255, 255, 0.05)'
                      : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <span style={{ fontSize: '15px', marginTop: '1px' }}>
                  {item.isGooglePlace ? '🏢' : '📍'}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#f8fafc',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.main_text || item.display_name}
                  </span>
                  {item.secondary_text && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.secondary_text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Google Map */}
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          position: 'relative',
        }}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={position || defaultCenter}
          zoom={position ? 15 : 11}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={mapOptions}
        >
          {position && (
            <Marker
              position={position}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
              animation={window.google?.maps?.Animation?.DROP}
            />
          )}
        </GoogleMap>

        {!position && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            👆 Click anywhere on the map or search to place a marker
          </div>
        )}
      </div>

      {/* Location Actions & Current Location Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px',
            color: '#60a5fa',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'background 0.2s',
          }}
        >
          <span>🎯</span> {geoLoading ? 'Detecting Location…' : 'Use My Current Location'}
        </button>

        {position && (
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            ✓ Location Point Selected
          </span>
        )}
      </div>

      {geoError && (
        <div style={{ fontSize: '12px', color: '#fca5a5' }}>
          ⚠️ {geoError}
        </div>
      )}

      {/* Lat / Lng / Google Maps URL Display */}
      {position ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px 14px',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latitude</span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', fontFamily: 'monospace' }}>
                {position.lat.toFixed(6)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Longitude</span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', fontFamily: 'monospace' }}>
                {position.lng.toFixed(6)}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Google Maps URL:</span>
            <a
              href={`https://www.google.com/maps?q=${position.lat.toFixed(6)},${position.lng.toFixed(6)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                color: '#3b82f6',
                textDecoration: 'none',
                maxWidth: '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              https://www.google.com/maps?q={position.lat.toFixed(6)},{position.lng.toFixed(6)}
            </a>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '8px',
            color: '#fbbf24',
            fontSize: '12.5px',
          }}
        >
          📍 Please select a location on the map, search, or use your current location.
        </div>
      )}
    </div>
  );
};

export default GoogleMapLocationPicker;
