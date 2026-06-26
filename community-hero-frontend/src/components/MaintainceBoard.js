import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, PageHeader, Skeleton, StatusBadge, statusTone } from './ui';

const MaintenanceBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMaintenance = async () => {
    try {
      setLoading(true);
      const [boardRes, overdueRes] = await Promise.all([
        api.get('/maintenance-board'),
        api.get('/maintenance-board/overdue')
      ]);
      setTasks(boardRes.data?.board || []);
      setOverdue(overdueRes.data?.overdue || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load maintenance board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, []);

  return (
    <div style={{ maxWidth: '1120px', margin: '32px auto' }}>
      <PageHeader
        title="Maintenance Board"
        subtitle="Upcoming, overdue, completed, and issue-linked maintenance tasks."
        action={<button className="btn btn-outline" onClick={loadMaintenance}>Refresh</button>}
      />

      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <EmptyState title="Maintenance unavailable" detail={error} action={<button className="btn btn-primary" onClick={loadMaintenance}>Retry</button>} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No maintenance tasks" detail="Admin-created tasks and overdue issue links will appear here." />
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {overdue.length > 0 && (
            <div className="card" style={{ borderColor: '#FECACA', background: '#fff7f7' }}>
              <strong style={{ color: 'var(--danger)' }}>{overdue.length} overdue task{overdue.length > 1 ? 's' : ''} need attention</strong>
            </div>
          )}

          {tasks.map((task) => (
            <div key={task._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{task.title}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {task.category || 'Maintenance'} · Deadline {task.deadline ? new Date(task.deadline).toLocaleString() : '-'}
                </div>
                {task.linkedIssue && (
                  <div style={{ marginTop: 6, fontSize: '0.86rem', color: 'var(--primary)', fontWeight: 700 }}>
                    Linked issue: {task.linkedIssue.status}
                  </div>
                )}
              </div>
              <StatusBadge tone={task.overdue ? 'danger' : statusTone(task.status)}>{task.overdue ? 'OVERDUE' : task.status}</StatusBadge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceBoard;
