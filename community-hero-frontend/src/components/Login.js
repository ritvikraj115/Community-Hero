import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

const Login = () => {
  const [role, setRole] = useState('resident');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Verify GPS before signing in to a joined community.');
  const [isLocating, setIsLocating] = useState(false);
  const navigate = useNavigate();

  const dispatchAuthUpdate = () => {
    window.dispatchEvent(new Event('auth-updated'));
  };

  const lockUserLocation = () => {
    setIsLocating(true);
    setLocationStatus('Acquiring high-accuracy GPS signal...');

    if (!navigator.geolocation) {
      setLocationStatus('❌ Geolocation not supported by browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationStatus('✅ Location verified securely.');
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        setLocationStatus('❌ Please enable location permissions.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        email,
        password,
        role
      };

      if (coordinates) {
        payload.latitude = coordinates.lat;
        payload.longitude = coordinates.lng;
      }

      const response = await api.post('/auth/login', payload);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: response.data._id,
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
          societyId: response.data.societyId || null,
          pendingSocietyId: response.data.pendingSocietyId || null,
          joinStatus: response.data.joinStatus || 'none',
          lastKnownLocation: response.data.lastKnownLocation || null,
          gamificationPoints: response.data.gamificationPoints || 0
        })
      );

      dispatchAuthUpdate();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '40px auto' }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: '700' }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Sign in to your community portal</p>
      </div>

      <div style={{ display: 'flex', backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '4px', marginBottom: '24px', border: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setRole('resident')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            backgroundColor: role === 'resident' ? '#FFFFFF' : 'transparent',
            color: role === 'resident' ? 'var(--primary)' : 'var(--text-muted)',
            boxShadow: role === 'resident' ? 'var(--shadow-sm)' : 'none'
          }}
        >
          Resident
        </button>
        <button
          type="button"
          onClick={() => setRole('admin')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            backgroundColor: role === 'admin' ? '#FFFFFF' : 'transparent',
            color: role === 'admin' ? 'var(--text-main)' : 'var(--text-muted)',
            boxShadow: role === 'admin' ? 'var(--shadow-sm)' : 'none'
          }}
        >
          Admin
        </button>
      </div>

      <div
          style={{
            padding: '16px',
            backgroundColor: coordinates ? '#ECFDF5' : '#F8FAFC',
            borderRadius: '8px',
            border: `1px solid ${coordinates ? 'var(--success)' : 'var(--border)'}`,
            marginBottom: '24px'
          }}
        >
          <button
            type="button"
            onClick={lockUserLocation}
            disabled={isLocating}
            className={coordinates ? 'btn btn-success' : 'btn btn-outline'}
            style={{ marginBottom: '8px' }}
          >
            {coordinates ? '📍 Physical Presence Confirmed' : '📍 Verify Physical Presence'}
          </button>
          <p
            style={{
              fontSize: '0.8rem',
              textAlign: 'center',
              color: coordinates ? 'var(--success)' : 'var(--text-muted)',
              fontWeight: '600'
            }}
          >
            {locationStatus}
          </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#FEF2F2',
            color: 'var(--danger)',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            textAlign: 'center',
            fontWeight: '500'
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Email Address</label>
          <input
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Password</label>
          <input
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn"
          style={{
            marginTop: '8px',
            backgroundColor: role === 'admin' ? '#0F172A' : 'var(--primary)',
            color: 'white'
          }}
        >
          Sign In as {role === 'admin' ? 'Admin' : 'Resident'}
        </button>
      </form>

      <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
          Register here
        </Link>
      </p>
    </div>
  );
};

export default Login;
