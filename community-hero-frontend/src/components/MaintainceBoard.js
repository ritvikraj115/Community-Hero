import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, PageHeader, Skeleton, StatusBadge, statusTone } from './ui';

const MaintenanceBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'Other',
    priority: 'MEDIUM',
    scheduledDate: '',
    deadline: ''
  });
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user?.role === 'admin';

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

  const updateTaskField = (field, value) => {
    setNewTask((current) => ({ ...current, [field]: value }));
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post('/maintenance', newTask);
      setNewTask({
        title: '',
        description: '',
        category: 'Other',
        priority: 'MEDIUM',
        scheduledDate: '',
        deadline: ''
      });
      await loadMaintenance();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create maintenance task.');
    } finally {
      setActionLoading(false);
    }
  };

  const completeTask = async (taskId) => {
    try {
      setActionLoading(true);
      await api.put(`/maintenance/${taskId}/complete`);
      await loadMaintenance();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to complete maintenance task.');
    } finally {
      setActionLoading(false);
    }
  };

  const runScheduler = async () => {
    try {
      setActionLoading(true);
      await api.post('/maintenance/run-scheduler');
      await loadMaintenance();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to run maintenance scheduler.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '32px auto' }}>
      <PageHeader
        title="Maintenance Board"
        subtitle="Upcoming, overdue, completed, and issue-linked maintenance tasks."
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isAdmin && (
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={runScheduler} disabled={actionLoading}>
                Run Scheduler
              </button>
            )}
            <button className="btn btn-outline" style={{ width: 'auto' }} onClick={loadMaintenance}>Refresh</button>
          </div>
        }
      />

      {isAdmin && (
        <form onSubmit={createTask} className="card" style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Create Maintenance Task</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <input className="input-field" placeholder="Task title" value={newTask.title} onChange={(e) => updateTaskField('title', e.target.value)} required />
            <select className="input-field" value={newTask.category} onChange={(e) => updateTaskField('category', e.target.value)}>
              {['Water Tank', 'Drainage', 'Lift', 'Electrical', 'Road', 'Security', 'Cleaning', 'Fire Safety', 'Garden', 'Other'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="input-field" value={newTask.priority} onChange={(e) => updateTaskField('priority', e.target.value)}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input className="input-field" type="datetime-local" value={newTask.scheduledDate} onChange={(e) => updateTaskField('scheduledDate', e.target.value)} required />
            <input className="input-field" type="datetime-local" value={newTask.deadline} onChange={(e) => updateTaskField('deadline', e.target.value)} required />
          </div>
          <textarea className="input-field" rows={3} placeholder="Description" value={newTask.description} onChange={(e) => updateTaskField('description', e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Create Task'}
          </button>
        </form>
      )}

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
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {isAdmin && task.status !== 'COMPLETED' && (
                  <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => completeTask(task._id)} disabled={actionLoading}>
                    Complete
                  </button>
                )}
                <StatusBadge tone={task.overdue ? 'danger' : statusTone(task.status)}>{task.overdue ? 'OVERDUE' : task.status}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceBoard;
