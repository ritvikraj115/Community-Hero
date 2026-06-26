import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('resident');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const dispatchAuthUpdate = () => {
    window.dispatchEvent(new Event('auth-updated'));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role
      });

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
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '40px auto' }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: '700' }}>Create Account</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Join or create a community</p>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEF2F2', color: 'var(--danger)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Full Name</label>
          <input type="text" className="input-field" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Email Address</label>
          <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Password</label>
          <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500' }}>Account Role</label>
          <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="resident">Resident</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
          Create Account
        </button>
      </form>

      <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
          Login here
        </Link>
      </p>
    </div>
  );
};

export default Register;
