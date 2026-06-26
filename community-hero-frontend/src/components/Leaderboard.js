import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, PageHeader, Skeleton, StatusBadge } from './ui';

const Leaderboard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaderboard');
      setRows(res.data?.leaderboard || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  return (
    <div style={{ maxWidth: '1120px', margin: '32px auto' }}>
      <PageHeader
        title="Monthly Leaderboard"
        subtitle="Hall of fame for reports, claims, resolutions, and verification votes."
        action={<button className="btn btn-outline" onClick={loadLeaderboard}>Refresh</button>}
      />

      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <EmptyState title="Leaderboard unavailable" detail={error} action={<button className="btn btn-primary" onClick={loadLeaderboard}>Retry</button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No rankings yet" detail="Residents will appear after earning civic points." />
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {rows.map((row, idx) => {
            const user = row.user || {};
            return (
              <div key={row._id || user._id || idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: idx === 0 ? '#dbeafe' : '#f8fafc', color: idx === 0 ? '#1d4ed8' : '#475569', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{user.name || 'Resident'}</div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Reports {row.issuesCreated || 0} · Claims {row.issuesClaimed || 0} · Votes {row.votesCast || 0}
                    </div>
                  </div>
                </div>
                <StatusBadge tone={idx === 0 ? 'info' : 'success'}>{row.totalPoints || 0} pts</StatusBadge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
