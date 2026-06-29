import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, PageHeader, Skeleton, StatusBadge, statusTone } from './ui';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user?.role === 'admin';

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

  const runWeatherScan = async () => {
    try {
      setActionLoading(true);
      await api.post('/weather-alerts/scan');
      await loadAlerts();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to run weather scan.');
    } finally {
      setActionLoading(false);
    }
  };

  const archiveAlert = async (alertId) => {
    try {
      setActionLoading(true);
      await api.put(`/weather-alerts/${alertId}/archive`);
      await loadAlerts();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to archive weather alert.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '32px auto' }}>
      <PageHeader
        title="Alerts & Notifications"
        subtitle="Weather intelligence, issue updates, votes required, maintenance, and approvals."
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isAdmin && (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={runWeatherScan} disabled={actionLoading}>
                {actionLoading ? 'Scanning...' : 'Run Weather Scan'}
              </button>
            )}
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={loadAlerts}>Refresh</button>
          </div>
        }
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
                  <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                    <StatusBadge tone={statusTone(alert.status)}>{alert.severity}</StatusBadge>
                    {isAdmin && (
                      <button className="btn btn-outline" style={{ width: 'auto', padding: '8px 10px' }} onClick={() => archiveAlert(alert._id)} disabled={actionLoading}>
                        Archive
                      </button>
                    )}
                  </div>
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
