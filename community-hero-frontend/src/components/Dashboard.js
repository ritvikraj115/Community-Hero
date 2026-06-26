import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { CommandCenterSections, CommunityMapPanel, LeaderboardPreview, NotificationsPanel, WeatherPanel } from './DashboardWidgets';

const StatCard = ({ label, value, hint, tone = 'default' }) => {
  const tones = {
    default: { bg: '#ffffff', border: 'var(--border)', accent: 'var(--primary)' },
    success: { bg: '#ECFDF5', border: '#BBF7D0', accent: 'var(--success)' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', accent: '#B45309' },
    danger: { bg: '#FEF2F2', border: '#FECACA', accent: 'var(--danger)' },
    info: { bg: '#EFF6FF', border: '#BFDBFE', accent: 'var(--primary)' }
  };

  const t = tones[tone] || tones.default;

  return (
    <div
      className="card"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: 10, fontSize: '1.7rem', fontWeight: 800, color: t.accent, lineHeight: 1.1 }}>
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: 8, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
    <div>
      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{title}</h2>
      {subtitle && <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Badge = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: { bg: '#F8FAFC', color: '#475569' },
    success: { bg: '#ECFDF5', color: '#166534' },
    warning: { bg: '#FFFBEB', color: '#92400e' },
    danger: { bg: '#FEF2F2', color: '#991b1b' },
    info: { bg: '#EFF6FF', color: '#1d4ed8' }
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        fontSize: '0.8rem',
        fontWeight: 700,
        background: t.bg,
        color: t.color
      }}
    >
      {children}
    </span>
  );
};

const sameUser = (left, right) => JSON.stringify(left || null) === JSON.stringify(right || null);

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [pendingResidents, setPendingResidents] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [communityMembers, setCommunityMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [joinSocietyId, setJoinSocietyId] = useState('');
  const [joinStatusMsg, setJoinStatusMsg] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [verifyingJoinLocation, setVerifyingJoinLocation] = useState(false);
  const [joinCoordinates, setJoinCoordinates] = useState(null);
  const [syncingProfile, setSyncingProfile] = useState(false);

  const navigate = useNavigate();

  const saveUser = (nextUser) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser((existingUser) => (sameUser(existingUser, nextUser) ? existingUser : nextUser));

    if (!sameUser(currentUser, nextUser)) {
      window.dispatchEvent(new Event('auth-updated'));
    }
  };

  const syncProfile = async () => {
    try {
      setSyncingProfile(true);
      const res = await api.get('/auth/me');
      const current = JSON.parse(localStorage.getItem('user') || '{}');

      const merged = {
        ...current,
        ...res.data
      };

      saveUser(merged);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login', { replace: true });
      }
    } finally {
      setSyncingProfile(false);
    }
  };

  const syncPendingResidents = async () => {
    try {
      if (!user || user.role !== 'admin' || !user.societyId) return;

      setLoadingPending(true);
      const res = await api.get('/societies/pending-residents');
      setPendingResidents(Array.isArray(res.data) ? res.data : []);
      setPendingError('');
    } catch (err) {
      setPendingError(err.response?.data?.error || 'Failed to load pending approvals.');
    } finally {
      setLoadingPending(false);
    }
  };

  const syncCommunityMembers = async () => {
    try {
      if (!user || !user.societyId) return;

      setLoadingMembers(true);
      const res = await api.get('/societies/members');
      setCommunityMembers(Array.isArray(res.data) ? res.data : []);
      setMembersError('');
    } catch (err) {
      setMembersError(err.response?.data?.error || 'Failed to load community members.');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!storedToken || !storedUser) {
      navigate('/login', { replace: true });
      return;
    }

    setUser(storedUser);
    syncProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (user?.role === 'admin' && user?.societyId) {
      syncPendingResidents();
    }

    if (user?.societyId) {
      syncCommunityMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.societyId]);


  const verifyJoinLocationAgainstSociety = () => {
    const targetSocietyId = joinSocietyId.trim();

    if (!targetSocietyId) {
      setJoinCoordinates(null);
      setJoinStatusMsg('Enter a Society ID before verifying location.');
      return;
    }

    setJoinStatusMsg('Fetching location...');
    if (!navigator.geolocation) {
      setJoinStatusMsg('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setVerifyingJoinLocation(true);
          const res = await api.post('/societies/verify-location', {
            targetSocietyId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });

          setJoinCoordinates({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            societyId: targetSocietyId
          });
          setJoinStatusMsg(
            res.data?.society?.name
              ? `Location verified for ${res.data.society.name}.`
              : 'Location verified for this society.'
          );
        } catch (err) {
          setJoinCoordinates(null);
          setJoinStatusMsg(err.response?.data?.error || 'Location does not match this society.');
        } finally {
          setVerifyingJoinLocation(false);
        }
      },
      () => {
        setJoinCoordinates(null);
        setJoinStatusMsg('Please enable location permissions.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleJoinCommunity = async (e) => {
    e.preventDefault();

    if (!joinSocietyId.trim()) {
      setJoinStatusMsg('Please enter a Society ID.');
      return;
    }

    if (!joinCoordinates || joinCoordinates.societyId !== joinSocietyId.trim()) {
      setJoinStatusMsg('Verify your location for this Society ID first.');
      return;
    }

    try {
      setJoinLoading(true);
      setJoinStatusMsg('');

      const res = await api.post(
        '/societies/request-join',
        {
          targetSocietyId: joinSocietyId.trim(),
          latitude: joinCoordinates.lat,
          longitude: joinCoordinates.lng
        }
      );

      const current = JSON.parse(localStorage.getItem('user') || '{}');
      const updated = {
        ...current,
        societyId: null,
        pendingSocietyId: joinSocietyId.trim(),
        joinStatus: 'pending',
        lastKnownLocation: {
          latitude: joinCoordinates.lat,
          longitude: joinCoordinates.lng,
          verifiedAt: new Date().toISOString()
        }
      };

      saveUser(updated);
      setJoinStatusMsg(res.data?.message || 'Join request sent. Waiting for admin approval.');
    } catch (err) {
      setJoinStatusMsg(err.response?.data?.error || 'Failed to request access.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleApproveResident = async (residentUserId) => {
    try {
      await api.post('/societies/approve-resident', { residentUserId });

      await syncPendingResidents();
      await syncCommunityMembers();
      await syncProfile();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve resident.');
    }
  };

  const handleManualRefresh = async () => {
    await syncProfile();

    if (user?.societyId) {
      await syncCommunityMembers();
    }

    if (user?.role === 'admin' && user?.societyId) {
      await syncPendingResidents();
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  const isResidentApproved = user.role === 'resident' && user.societyId && user.joinStatus === 'approved';
  const isResidentPending = user.role === 'resident' && user.joinStatus === 'pending';
  const verificationText = user.lastKnownLocation?.verifiedAt
    ? `Verified at ${new Date(user.lastKnownLocation.verifiedAt).toLocaleString()}`
    : 'Not verified yet';

  const MembersCard = () => (
    <div className="card" style={{ marginBottom: '24px' }}>
      <SectionHeader
        title="Community Members"
        subtitle="Approved residents and admins in the same society."
        action={
          <button className="btn btn-outline" onClick={syncCommunityMembers} disabled={loadingMembers || !user.societyId}>
            {loadingMembers ? 'Loading...' : 'Refresh Members'}
          </button>
        }
      />

      {!user.societyId ? (
        <div style={{ padding: '10px 0', color: 'var(--text-muted)' }}>
          Join or create a community to see members here.
        </div>
      ) : membersError ? (
        <div style={{ padding: '10px 0', color: 'var(--danger)' }}>{membersError}</div>
      ) : communityMembers.length === 0 ? (
        <div style={{ padding: '10px 0', color: 'var(--text-muted)' }}>No approved community members found yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {communityMembers.map((member) => (
            <div
              key={member._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                background: '#fff',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>{member.name}</span>
                  {member.role === 'admin' && <Badge tone="info">Admin</Badge>}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {member.email}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Points: {member.gamificationPoints || 0} •{' '}
                  {member.lastKnownLocation?.verifiedAt ? 'Location verified' : 'No recent location verification'}
                </div>
              </div>

              <Badge tone={member.role === 'admin' ? 'info' : 'neutral'}>{member.role}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const topActions = (
    <button className="btn btn-outline" onClick={handleManualRefresh} disabled={syncingProfile}>
      {syncingProfile ? 'Refreshing...' : 'Refresh Status'}
    </button>
  );

  return user.role === 'admin' ? (
    <div style={{ maxWidth: '1120px', margin: '40px auto' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 900, margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Create the community, approve residents, and manage tasks.</p>
        </div>
        {topActions}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        <StatCard label="Role" value="Admin" hint="Community owner and moderator." tone="danger" />
        <StatCard label="Society" value={user.societyId ? 'Active' : 'Not created'} hint={user.societyId ? 'Members can join now.' : 'Initialize your society first.'} tone={user.societyId ? 'success' : 'warning'} />
        <StatCard label="Civic Points" value={user.gamificationPoints || 0} hint="Gamification total across actions." tone="info" />
        <StatCard label="Members" value={communityMembers.length} hint="Approved members in this society." tone="default" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Quick Overview"
          subtitle="Community at a glance"
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
            alignItems: "start",
            gridAutoRows: "min-content",
            gap: 24
          }}
        >

          <WeatherPanel compact />

          <CommunityMapPanel compact />

          <LeaderboardPreview compact />

          <NotificationsPanel compact />

        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card" style={{ background: '#fff', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
          <SectionHeader
            title="Admin Profile"
            subtitle="Quick summary of your community setup."
          />
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#f8fafc' }}>
              <span style={{ color: 'var(--text-muted)' }}>Role</span>
              <strong style={{ color: 'var(--danger)' }}>{user.role}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#f8fafc' }}>
              <span style={{ color: 'var(--text-muted)' }}>Community Status</span>
              <strong style={{ color: user.societyId ? 'var(--success)' : '#b45309' }}>{user.societyId ? 'Live' : 'Pending Setup'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#f8fafc' }}>
              <span style={{ color: 'var(--text-muted)' }}>Approval Queue</span>
              <strong>{loadingPending ? 'Loading...' : pendingResidents.length}</strong>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: user.societyId ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${user.societyId ? '#BBF7D0' : '#FECACA'}` }}>
          <SectionHeader
            title={user.societyId ? 'Community Live' : 'Community Not Initialized'}
            subtitle={user.societyId ? 'Share this ID with residents.' : 'Create the society to unlock member management.'}
          />
          {user.societyId ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: '14px 16px', background: '#fff', border: '1px dashed var(--border)', borderRadius: 16, wordBreak: 'break-all' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
                  Society ID
                </div>
                <div style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}>{user.societyId}</div>
              </div>
              <Badge tone="success">Residents can request access</Badge>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Your admin account is ready, but you still need to create the society and lock the geofence.
              </p>
              <Link to="/admin-setup" style={{ width: '100%', textDecoration: 'none' }}>
                <button className="btn btn-success" style={{ width: '100%' }}>
                  + Create Community
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <MembersCard />

      {user.societyId && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <SectionHeader
            title="Pending Join Approvals"
            subtitle="Residents who verified their location and requested access."
            action={
              <button className="btn btn-outline" onClick={syncPendingResidents} disabled={loadingPending}>
                {loadingPending ? 'Loading...' : 'Refresh Requests'}
              </button>
            }
          />

          {pendingError ? (
            <div style={{ color: 'var(--danger)' }}>{pendingError}</div>
          ) : pendingResidents.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No pending resident requests right now.</div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {pendingResidents.map((resident) => (
                <div
                  key={resident._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    background: '#fff',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{resident.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{resident.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Location: {resident.lastKnownLocation?.verifiedAt ? 'Verified' : 'Not verified'}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleApproveResident(resident._id)}>
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <SectionHeader
          title="Admin Controls"
          subtitle="Quick access to your operational pages."
        />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/issues" style={{ textDecoration: 'none' }}>
            <button className="btn btn-outline">View Active Issues</button>
          </Link>
          <Link to="/maintenance" style={{ textDecoration: 'none' }}>
            <button className="btn btn-outline">Maintenance Board</button>
          </Link>
        </div>
      </div>
    </div>
  ) : (
    <div style={{ maxWidth: '1120px', margin: '40px auto' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 900, margin: 0 }}>Resident Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Join your community, report issues, and track progress.</p>
        </div>
        {topActions}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
        <StatCard label="Join Status" value={user.joinStatus || 'none'} hint="Current approval state." tone={user.joinStatus === 'approved' ? 'success' : user.joinStatus === 'pending' ? 'warning' : 'danger'} />
        <StatCard label="Verification" value={user.lastKnownLocation?.verifiedAt ? 'Verified' : 'Not verified'} hint={verificationText} tone={user.lastKnownLocation?.verifiedAt ? 'success' : 'warning'} />
        <StatCard label="Civic Points" value={user.gamificationPoints || 0} hint="Points from community actions." tone="info" />
        <StatCard label="Society" value={user.societyId ? 'Joined' : 'Not joined'} hint={user.societyId ? 'Community access available.' : 'Need to request access.'} tone={user.societyId ? 'success' : 'warning'} />
      </div>

      <CommandCenterSections user={user} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card" style={{ background: '#fff', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
          <SectionHeader title="Resident Profile" subtitle="Your account and community status." />
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#f8fafc' }}>
              <span style={{ color: 'var(--text-muted)' }}>Role</span>
              <strong>{user.role}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#f8fafc' }}>
              <span style={{ color: 'var(--text-muted)' }}>Join Status</span>
              <strong style={{ color: user.joinStatus === 'approved' ? 'var(--success)' : user.joinStatus === 'pending' ? '#b45309' : 'var(--danger)' }}>
                {user.joinStatus || 'none'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#f8fafc' }}>
              <span style={{ color: 'var(--text-muted)' }}>Verification</span>
              <strong>{verificationText}</strong>
            </div>
          </div>
        </div>

        {!user.societyId ? (
          <div className="card" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <SectionHeader
              title="Join Your Community"
              subtitle="Enter a society ID and verify your location before requesting access."
            />

            <form onSubmit={handleJoinCommunity} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 700 }}>Society ID</label>
                <input
                  type="text"
                  className="input-field"
                  value={joinSocietyId}
                  onChange={(e) => {
                    setJoinSocietyId(e.target.value);
                    setJoinCoordinates(null);
                    setJoinStatusMsg('');
                  }}
                  placeholder="Paste society ID"
                  required
                />
              </div>

              <button
                type="button"
                className="btn btn-outline"
                onClick={verifyJoinLocationAgainstSociety}
                disabled={!joinSocietyId.trim() || verifyingJoinLocation || joinLoading}
              >
                {verifyingJoinLocation ? 'Verifying...' : joinCoordinates ? 'Location Verified' : 'Verify Location'}
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={joinLoading || !joinCoordinates || joinCoordinates.societyId !== joinSocietyId.trim()}
              >
                {joinLoading ? 'Requesting Access...' : 'Request Join Access'}
              </button>
            </form>

            {joinStatusMsg && <div style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{joinStatusMsg}</div>}
          </div>
        ) : isResidentApproved ? (
          <div className="card" style={{ background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
            <SectionHeader
              title="Community Access Approved"
              subtitle="You can now report issues and browse active tasks."
            />

            <div style={{ display: 'grid', gap: '10px' }}>
              <Link to="/create-issue" style={{ width: '100%', textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  + Report New Issue (+15 pts)
                </button>
              </Link>

              <Link to="/issues" style={{ width: '100%', textDecoration: 'none' }}>
                <button className="btn btn-outline" style={{ width: '100%' }}>
                  View Active Issues
                </button>
              </Link>
            </div>
          </div>
        ) : isResidentPending ? (
          <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <SectionHeader
              title="Join Request Pending"
              subtitle="Your request is waiting for the admin to approve."
            />
            <button className="btn btn-outline" style={{ width: '100%' }} disabled>
              Report Issue Locked Until Approval
            </button>
          </div>
        ) : (
          <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <SectionHeader
              title="Join Your Community First"
              subtitle="Enter your Society ID and verify your location to request access."
            />
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Once approved, this area will unlock issue reporting and community actions.
            </p>
          </div>
        )}
      </div>

      <MembersCard />

      <div className="card">
        <SectionHeader
          title="Active Community Tasks"
          subtitle="Browse active issues and create new ones after approval."
        />
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/issues" style={{ textDecoration: 'none' }}>
            <button className="btn btn-outline">Open Active Issues</button>
          </Link>
          {isResidentApproved && (
            <Link to="/create-issue" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary">Create New Issue</button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
