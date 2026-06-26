import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, PageHeader, Skeleton, StatusBadge, statusTone } from './ui';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const [weatherRes, notificationRes] = await Promise.all([
        api.get('/weather-alerts'),
        api.get('/notifications')
      ]);
      setAlerts(weatherRes.data?.alerts || []);
      setNotifications(Array.isArray(notificationRes.data) ? notificationRes.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div style={{ maxWidth: '1120px', margin: '32px auto' }}>
      <PageHeader
        title="Alerts & Notifications"
        subtitle="Weather intelligence, issue updates, votes required, maintenance, and approvals."
        action={<button className="btn btn-outline" onClick={loadAlerts}>Refresh</button>}
      />

      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <EmptyState title="Alerts unavailable" detail={error} action={<button className="btn btn-primary" onClick={loadAlerts}>Retry</button>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
          <div className="card">
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Weather Risk</h2>
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {alerts.length === 0 ? (
                <EmptyState title="No active weather alerts" detail="Community weather scans have not found an active risk." />
              ) : alerts.map((alert) => (
                <div key={alert._id} className="ai-step">
                  <div>
                    <strong>{alert.title}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', lineHeight: 1.5 }}>{alert.message}</p>
                  </div>
                  <StatusBadge tone={statusTone(alert.status)}>{alert.severity}</StatusBadge>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Notifications</h2>
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {notifications.length === 0 ? (
                <EmptyState title="Inbox is clear" detail="Issue, vote, maintenance, and approval updates will appear here." />
              ) : notifications.slice(0, 12).map((item) => (
                <div key={item._id} className="ai-step">
                  <div>
                    <strong>{item.title}</strong>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.message}</p>
                  </div>
                  <StatusBadge tone={item.isRead ? 'neutral' : 'info'}>{item.type}</StatusBadge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
