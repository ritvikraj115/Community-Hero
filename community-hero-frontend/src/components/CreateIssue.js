import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, PageHeader, StatusBadge, similarityPercent } from './ui';
import { formatAccuracy, getAccurateLocation } from '../utils/location';
import { googleMapsLoaderOptions } from '../utils/googleMaps';

const mapContainerStyle = {
  width: '100%',
  height: '280px',
  borderRadius: '8px'
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

const processingSteps = [
  'Analyzing Image',
  'Generating AI Reason',
  'Generating Google Embedding',
  'Searching Semantic Matches',
  'Comparing Images',
  'Searching Historical Solutions'
];

const RecommendationCard = ({ item }) => (
  <div className="ai-step" style={{ alignItems: 'flex-start' }}>
    <div style={{ display: 'grid', gap: 8 }}>
      <strong>{item.title || item.reason || 'Previous similar issue'}</strong>
      <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.solution || 'Resolution summary was not recorded.'}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Resolution time: {item.resolutionTimeHours ?? '-'} hrs · Confidence: {item.confidence ?? '-'}
      </span>
    </div>
    <StatusBadge tone="info">{similarityPercent(item.similarity)}</StatusBadge>
  </div>
);

const CreateIssue = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [markerPosition, setMarkerPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [locationStatus, setLocationStatus] = useState('GPS location required');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const mapRef = useRef();

  const { isLoaded } = useJsApiLoader(googleMapsLoaderOptions);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const canSubmit = useMemo(() => (
    title.trim() &&
    description.trim() &&
    imageFile &&
    markerPosition &&
    !isSubmitting
  ), [title, description, imageFile, markerPosition, isSubmitting]);

  const lockUserLocation = async () => {
    setIsLocating(true);
    setLocationStatus('Acquiring high-accuracy GPS signal...');

    try {
      const location = await getAccurateLocation({
        onUpdate: (best) => {
          setLocationStatus(`Improving GPS accuracy${formatAccuracy(best.accuracy)}...`);
        }
      });
      const pos = {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      };
      setMapCenter(pos);
      setMarkerPosition(pos);
      setLocationStatus(`Location locked${formatAccuracy(location.accuracy)}.`);
    } catch (locationErr) {
      setLocationStatus(locationErr.message || 'Enable location permission to submit a geofenced report.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleImageChange = (file) => {
    setImageFile(file || null);
    setResult(null);
    setError('');

    if (!file) {
      setImagePreview('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!canSubmit) {
      setError('Complete title, description, image, and GPS verification first.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('latitude', markerPosition.lat);
    formData.append('longitude', markerPosition.lng);
    if (Number.isFinite(markerPosition.accuracy)) {
      formData.append('locationAccuracy', markerPosition.accuracy);
    }
    formData.append('issueImage', imageFile);

    try {
      setIsSubmitting(true);
      const response = await api.post('/issues', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);

      if (!response.data?.duplicate && response.data?.issue?._id) {
        window.dispatchEvent(new Event('auth-updated'));
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.aiReason || 'Failed to submit issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>Loading map engine...</div>;
  }

  const recommendations = result?.historicalRecommendations || [];
  const duplicateIssue = result?.duplicateIssue || result?.issue;

  return (
    <div style={{ maxWidth: '1180px', margin: '32px auto' }}>
      <PageHeader
        title="Report a Community Issue"
        subtitle="Gemini Vision, Google embeddings, semantic duplicate detection, and historical solution retrieval run on submit."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 18 }}>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: 18 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Issue Title</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Water logging near Block B" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Description</label>
            <textarea className="input-field" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you can see and where residents are affected." />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Take or Upload Photo</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              onChange={(e) => handleImageChange(e.target.files?.[0])}
            />
            {imagePreview && (
              <img src={imagePreview} alt="Issue preview" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', marginTop: 12 }} />
            )}
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: markerPosition ? '#ECFDF5' : '#F8FAFC' }}>
              <strong>{locationStatus}</strong>
              <button type="button" className={markerPosition ? 'btn btn-success' : 'btn btn-outline'} style={{ width: 'auto' }} onClick={lockUserLocation} disabled={isLocating}>
                {isLocating ? 'Locating...' : markerPosition ? 'Location Locked' : 'Verify GPS'}
              </button>
            </div>
            <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={markerPosition ? 18 : 5} onLoad={onMapLoad} options={{ disableDefaultUI: true, zoomControl: true }}>
              {markerPosition && <Marker position={markerPosition} />}
            </GoogleMap>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            Submit & Run Google AI Analysis
          </button>
        </form>

        <aside style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="card">
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>AI Processing</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {processingSteps.map((step, index) => (
                <div className="ai-step" key={step}>
                  <span>{step}</span>
                  <StatusBadge tone={isSubmitting ? 'info' : result ? 'success' : 'neutral'}>
                    {isSubmitting ? (index < 2 ? 'Running' : 'Queued') : result ? 'Done' : 'Ready'}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </div>

          {result?.duplicate && duplicateIssue && (
            <div className="card" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Duplicate Match Found</h2>
              {duplicateIssue.mediaUrl && <img src={duplicateIssue.mediaUrl} alt="Existing issue" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />}
              <div style={{ display: 'grid', gap: 10 }}>
                <StatusBadge tone="warning">{duplicateIssue.status}</StatusBadge>
                <div>Distance: <strong>{result.distance ?? result.distanceMeters ?? '-'}m</strong></div>
                <div>Semantic similarity: <strong>{similarityPercent(result.semanticSimilarity)}</strong></div>
                <div>Image similarity: <strong>{similarityPercent(result.imageSimilarity)}</strong></div>
                <div>Matched reason: <strong>{result.matchedReason || duplicateIssue.inferredReason || '-'}</strong></div>
                <button className="btn btn-primary" onClick={() => navigate(`/issues/${duplicateIssue._id}`)}>View Existing Issue</button>
                <button className="btn btn-outline" onClick={() => setResult(null)}>Cancel</button>
              </div>
            </div>
          )}

          {result && !result.duplicate && result.issue && (
            <div className="card" style={{ borderColor: '#BBF7D0', background: '#ECFDF5' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Issue Created</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Gemini classified the report and submitted it for community approval.</p>
              <button className="btn btn-primary" onClick={() => navigate(`/issues/${result.issue._id}`)}>Open Pending Issue</button>
            </div>
          )}

          {recommendations.length > 0 ? (
            <div className="card">
              <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Previous Similar Issues</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {recommendations.map((item, index) => <RecommendationCard key={item.issue || index} item={item} />)}
              </div>
            </div>
          ) : result ? (
            <EmptyState title="No resolved semantic matches yet" detail="This report may become the first knowledge-base example for this problem." />
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default CreateIssue;
