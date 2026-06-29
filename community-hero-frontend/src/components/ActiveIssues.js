import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, StatusBadge, statusTone } from './ui';

const ActiveIssues = () => {
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchIssues = async () => {
    try {
      const res = await api.get('/issues');
      setIssues((res.data || []).filter((issue) => !['Resolved', 'Rejected'].includes(issue.status)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load issues.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchIssues();
  }, [navigate]);

  return (
    <div style={{ maxWidth: '1120px', margin: '32px auto' }}>
      <div className="card" style={{ marginBottom: '18px', background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>Active Issues</h1>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
              Track community problems, status, and AI reasoning.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ color: 'var(--danger)', marginBottom: '18px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {issues.length === 0 ? (
          <EmptyState title="No issues found" detail="New reports will appear here after residents submit them." />
        ) : (
          issues.map((issue) => (
            <div
              key={issue._id}
              className="card"
              style={{
                display: 'grid',
                gap: '14px',
                border: '1px solid var(--border)',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>{issue.title}</h3>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {issue.description}
                  </p>
                </div>

                <StatusBadge tone={statusTone(issue.status)}>{issue.status}</StatusBadge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '10px', fontSize: '0.92rem' }}>
                <div><strong>Category:</strong> {issue.category || '-'}</div>
                <div><strong>Severity:</strong> {issue.severityScore ?? '-'}</div>
                <div><strong>Reason:</strong> {issue.inferredReason || '-'}</div>
                <div><strong>Solver:</strong> {issue.solver?.name || 'Unclaimed'}</div>
                <div><strong>Team:</strong> {(issue.helpers?.length || 0) + (issue.solver ? 1 : 0)} member(s)</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  By {issue.creator?.name || 'Unknown'}
                </div>
                <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none' }}>
                  <button className="btn btn-primary">Open Details</button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveIssues;
