import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { formatAccuracy, getAccurateLocation } from '../utils/location';

const Login = () => {
  const [role, setRole] = useState('resident');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('Location is checked only after your account is identified.');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const dispatchAuthUpdate = () => {
    window.dispatchEvent(new Event('auth-updated'));
  };

  const persistSession = (response) => {
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
  };

  const submitLogin = (extraPayload = {}) => api.post('/auth/login', {
    email,
    password,
    role,
    ...extraPayload
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setLocationStatus('Checking account...');

    try {
      const response = await submitLogin();
      setLocationStatus('No community location check required for this account.');
      persistSession(response);
      setIsSubmitting(false);
    } catch (err) {
      const needsGps = err.response?.status === 428 && err.response?.data?.code === 'GPS_REQUIRED';

      if (!needsGps) {
        setLocationStatus('Location is checked only after your account is identified.');
        setError(err.response?.data?.error || 'Login failed');
        setIsSubmitting(false);
        return;
      }

      try {
        setIsLocating(true);
        setLocationStatus('Account identified. Checking location against your community boundary...');
        const coordinates = await getAccurateLocation({
          onUpdate: (best) => {
            setLocationStatus(`Improving GPS accuracy${formatAccuracy(best.accuracy)}...`);
          }
        });
        const response = await submitLogin(coordinates);
        setLocationStatus(`Location matched your community boundary${formatAccuracy(coordinates.accuracy)}.`);
        persistSession(response);
      } catch (locationErr) {
        setLocationStatus('Location check failed.');
        setError(locationErr.response?.data?.error || locationErr.message || 'Location verification failed.');
      } finally {
        setIsLocating(false);
        setIsSubmitting(false);
      }
      return;
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
            backgroundColor: isLocating ? '#ECFDF5' : '#F8FAFC',
            borderRadius: '8px',
            border: `1px solid ${isLocating ? 'var(--success)' : 'var(--border)'}`,
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: isLocating ? 'var(--success)' : 'var(--text-main)',
              textAlign: 'center',
              marginBottom: 8
            }}
          >
            Account First, Location Second
          </div>
          <p
            style={{
              fontSize: '0.8rem',
              textAlign: 'center',
              color: isLocating ? 'var(--success)' : 'var(--text-muted)',
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn"
          disabled={isSubmitting || isLocating}
          style={{
            marginTop: '8px',
            backgroundColor: role === 'admin' ? '#0F172A' : 'var(--primary)',
            color: 'white'
          }}
        >
          {isSubmitting || isLocating ? 'Signing In...' : `Sign In as ${role === 'admin' ? 'Admin' : 'Resident'}`}
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
