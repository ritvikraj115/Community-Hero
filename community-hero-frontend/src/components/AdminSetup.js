import React, { useMemo, useState } from 'react';
import { DrawingManager, GoogleMap, Marker, Polygon, useJsApiLoader } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const drawingLibraries = ['drawing'];
const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const mapContainerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: '8px'
};

const distanceMeters = (a, b) => {
  const radius = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return radius * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
};

const AdminSetup = () => {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState(500);
  const [blocks, setBlocks] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [geofenceMode, setGeofenceMode] = useState('radius');
  const [boundaryCoordinates, setBoundaryCoordinates] = useState([]);
  const [status, setStatus] = useState('');
  const [createdSocietyId, setCreatedSocietyId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({
    id: 'community-map-google',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: drawingLibraries
  });

  const fallbackRadius = useMemo(() => {
    if (!coordinates || boundaryCoordinates.length < 3) return Number(radius) || 500;
    return Math.max(
      50,
      Math.ceil(Math.max(...boundaryCoordinates.map((point) => distanceMeters(coordinates, point))))
    );
  }, [boundaryCoordinates, coordinates, radius]);

  const dispatchAuthUpdate = () => {
    window.dispatchEvent(new Event('auth-updated'));
  };

  const captureLocation = () => {
    setStatus('Fetching high-accuracy GPS coordinates...');
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locked = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCoordinates(locked);
        setStatus('Coordinates locked successfully.');
      },
      () => setStatus('Please enable location permissions.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handlePolygonComplete = (polygon) => {
    const path = polygon.getPath().getArray().map((point) => ({
      lat: point.lat(),
      lng: point.lng()
    }));
    polygon.setMap(null);
    setBoundaryCoordinates(path);
    setStatus(path.length >= 3 ? 'Community border drawn successfully.' : 'Draw at least three points for the border.');
  };

  const handleCreateSociety = async (e) => {
    e.preventDefault();

    if (!coordinates) {
      setStatus('Lock your current location first.');
      return;
    }

    if (geofenceMode === 'polygon' && boundaryCoordinates.length < 3) {
      setStatus('Draw the community border before creating the society.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus('Creating community...');
      const response = await api.post('/societies', {
        name: name.trim(),
        longitude: Number(coordinates.lng),
        latitude: Number(coordinates.lat),
        radiusInMeters: geofenceMode === 'polygon' ? fallbackRadius : Number(radius),
        boundaryCoordinates: geofenceMode === 'polygon' ? boundaryCoordinates : undefined,
        communityDetails: {
          totalBlocks: Number(blocks) || 0
        }
      });

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...currentUser,
        societyId: response.data._id,
        joinStatus: 'approved'
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatchAuthUpdate();

      setCreatedSocietyId(response.data._id);
      setStatus('Community created successfully.');
    } catch (err) {
      setStatus(err.response?.data?.error || 'Failed to create society.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(createdSocietyId);
      setStatus('Society ID copied to clipboard.');
    } catch {
      setStatus('Could not copy ID.');
    }
  };

  if (createdSocietyId) {
    return (
      <div style={{ maxWidth: '560px', margin: '60px auto', textAlign: 'center' }} className="card">
        <h2 style={{ color: 'var(--success)', fontSize: '1.75rem', fontWeight: 800, marginBottom: '16px' }}>
          Community Initialized
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          Your geofence is locked. Share this secure ID with residents.
        </p>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '2px dashed var(--primary)',
            padding: '24px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}
        >
          <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Official Society ID
          </p>
          <p style={{ fontSize: '1.25rem', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 800, wordBreak: 'break-all' }}>
            {createdSocietyId}
          </p>
        </div>

        {status && <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{status}</p>}

        <div style={{ display: 'grid', gap: '12px', marginTop: 20 }}>
          <button onClick={copyToClipboard} className="btn btn-outline" type="button">
            Copy ID
          </button>
          <button onClick={() => navigate('/dashboard', { replace: true })} className="btn btn-success" type="button">
            Enter Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ maxWidth: '560px', margin: '40px auto' }} className="card">
        Loading map engine...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '920px', margin: '40px auto' }} className="card">
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Initialize Community</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '8px', lineHeight: 1.5 }}>
          Lock the society center, then choose a radius or draw the real boundary on the map.
        </p>
      </div>

      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: coordinates ? '#ECFDF5' : '#F8FAFC',
          borderRadius: '8px',
          border: `1px solid ${coordinates ? 'var(--success)' : 'var(--border)'}`
        }}
      >
        <button
          type="button"
          onClick={captureLocation}
          className={coordinates ? 'btn btn-success' : 'btn btn-outline'}
          style={{ marginBottom: '12px' }}
        >
          {coordinates ? 'Location Locked' : 'Lock Current Location'}
        </button>
        {status && (
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: coordinates ? 'var(--success)' : 'var(--text-muted)', textAlign: 'center' }}>
            {status}
          </p>
        )}
        {coordinates && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
            Lng: {coordinates.lng.toFixed(5)}, Lat: {coordinates.lat.toFixed(5)}
          </p>
        )}
      </div>

      <form onSubmit={handleCreateSociety} style={{ display: 'grid', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 700 }}>Society Name</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Ashiana Woodlands"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 700 }}>Geofence Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className={geofenceMode === 'radius' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => setGeofenceMode('radius')}
              >
                Radius
              </button>
              <button
                type="button"
                className={geofenceMode === 'polygon' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => setGeofenceMode('polygon')}
              >
                Draw Border
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 700 }}>Geofence Radius (m)</label>
            <input
              type="number"
              className="input-field"
              placeholder="500"
              value={geofenceMode === 'polygon' ? fallbackRadius : radius}
              onChange={(e) => setRadius(e.target.value)}
              disabled={geofenceMode === 'polygon'}
              min={50}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 700 }}>Total Blocks/Towers</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 5"
              value={blocks}
              onChange={(e) => setBlocks(e.target.value)}
            />
          </div>
        </div>

        {geofenceMode === 'polygon' && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: 12, background: '#F8FAFC', color: 'var(--text-muted)', fontWeight: 800 }}>
              {boundaryCoordinates.length >= 3
                ? `${boundaryCoordinates.length} border points selected`
                : 'Use the polygon tool on the map to draw the community border.'}
            </div>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={coordinates || defaultCenter}
              zoom={coordinates ? 18 : 5}
              options={{ mapTypeControl: false, streetViewControl: false }}
            >
              {coordinates && <Marker position={coordinates} />}
              {boundaryCoordinates.length >= 3 ? (
                <Polygon
                  paths={boundaryCoordinates}
                  options={{
                    fillColor: '#2563eb',
                    fillOpacity: 0.16,
                    strokeColor: '#2563eb',
                    strokeWeight: 2
                  }}
                />
              ) : (
                <DrawingManager
                  onPolygonComplete={handlePolygonComplete}
                  options={{
                    drawingControl: true,
                    drawingControlOptions: {
                      drawingModes: ['polygon']
                    },
                    polygonOptions: {
                      fillColor: '#2563eb',
                      fillOpacity: 0.16,
                      strokeColor: '#2563eb',
                      strokeWeight: 2,
                      clickable: false,
                      editable: false
                    }
                  }}
                />
              )}
            </GoogleMap>
            {boundaryCoordinates.length >= 3 && (
              <button type="button" className="btn btn-outline" onClick={() => setBoundaryCoordinates([])} style={{ margin: 12 }}>
                Redraw Border
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!coordinates || isSubmitting || (geofenceMode === 'polygon' && boundaryCoordinates.length < 3)}
          className="btn btn-success"
          style={{ marginTop: '12px' }}
        >
          {isSubmitting ? 'Creating Community...' : 'Initialize Database & Geofence'}
        </button>
      </form>
    </div>
  );
};

export default AdminSetup;
