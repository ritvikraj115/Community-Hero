import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, PageHeader, Skeleton, StatusBadge, statusTone } from './ui';
import {
  AchievementsPanel,
  AnalyticsPanel,
  CommunityFeedPanel,
  CommunityMapPanel,
  KnowledgePanel,
  NotificationsPanel,
  PersonalHistoryPanel,
  SimpleBars,
  TimelinePanel,
  usePanelData
} from './DashboardWidgets';

const getArray = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

export const CommunityMapPage = () => (
  <div style={{ maxWidth: 1180, margin: '32px auto' }}>
    <PageHeader title="Community Map" subtitle="Society boundary, active issues, maintenance markers, and geofence intelligence." />
    <CommunityMapPanel />
  </div>
);

export const AnalyticsPage = () => (
  <div style={{ maxWidth: 1180, margin: '32px auto' }}>
    <PageHeader title="Analytics" subtitle="Community health, issue distribution, recurring reasons, and resolution performance." />
    <AnalyticsPanel />
  </div>
);

export const AchievementsPage = () => (
  <div style={{ maxWidth: 980, margin: '32px auto' }}>
    <PageHeader title="Achievements" subtitle="Badges, contribution progress, points, and civic activity." />
    <AchievementsPanel />
  </div>
);

export const NotificationsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const markAllRead = async () => {
    await api.put('/notifications/mark-all-read');
    window.dispatchEvent(new Event('auth-updated'));
    setRefreshKey((value) => value + 1);
  };

  return (
    <div style={{ maxWidth: 980, margin: '32px auto' }}>
      <PageHeader
        title="Notifications"
        subtitle="Issue updates, votes, comments, weather, maintenance, and resolution events."
        action={<button className="btn btn-outline" style={{ width: 'auto' }} onClick={markAllRead}>Mark All Read</button>}
      />
      <NotificationsPanel key={refreshKey} />
    </div>
  );
};

export const KnowledgePage = () => (
  <div style={{ maxWidth: 980, margin: '32px auto' }}>
    <PageHeader title="Knowledge Base" subtitle="Historical community intelligence from resolved and recurring issue patterns." />
    <KnowledgePanel />
  </div>
);

export const ProfilePage = () => (
  <div style={{ maxWidth: 980, margin: '32px auto' }}>
    <PageHeader title="Profile" subtitle="Personal history, rank, reporting accuracy, and contribution timeline." />
    <PersonalHistoryPanel />
  </div>
);

export const CommunityTimelinePage = () => (
  <div style={{ maxWidth: 980, margin: '32px auto' }}>
    <PageHeader title="Community History" subtitle="Chronological activity across issues, maintenance, weather, and resolutions." />
    <TimelinePanel />
  </div>
);

export const CommunityFeedPage = () => (
  <div style={{ maxWidth: 980, margin: '32px auto' }}>
    <PageHeader title="Community Feed" subtitle="Latest issue, alert, and maintenance activity." />
    <CommunityFeedPanel />
  </div>
);

export const ReportsPage = () => {
  const { loading, error, data } = usePanelData([
    { key: 'report', url: '/reports/community' },
    { key: 'overview', url: '/admin/overview' },
    { key: 'statistics', url: '/admin/statistics' }
  ]);
  const report = data.report || {};
  const overview = data.overview?.overview || {};
  const issueStats = getArray(data.statistics, ['issues']);

  const exportDashboard = async () => {
    const res = await api.get('/exports/dashboard');
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `community-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ maxWidth: 980, margin: '32px auto' }}><Skeleton rows={6} /></div>;

  return (
    <div style={{ maxWidth: 1080, margin: '32px auto' }}>
      <PageHeader
        title="Reports"
        subtitle="Admin report summary for community status, issue categories, severity, maintenance, and export."
        action={<button className="btn btn-primary" style={{ width: 'auto' }} onClick={exportDashboard}>Export Dashboard JSON</button>}
      />
      {error ? <EmptyState title="Reports unavailable" detail={error} /> : (
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Admin Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
              {[
                ['Residents', overview.residents],
                ['Pending Residents', overview.pendingResidents],
                ['Active Issues', overview.activeIssues],
                ['Resolved Issues', overview.resolvedIssues],
                ['Maintenance', overview.maintenanceTasks],
                ['Active Alerts', overview.activeAlerts]
              ].map(([label, value]) => (
                <div key={label} className="field-row">
                  <span>{label}</span>
                  <strong>{value ?? '-'}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
              {Object.entries(report.summary || {}).map(([key, value]) => (
                <div key={key} className="field-row">
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Category Report</h2>
            <SimpleBars items={getArray(report, ['categoryWise']).map((item) => ({ label: item._id || 'Uncategorized', value: item.total }))} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Severity Report</h2>
            <SimpleBars items={getArray(report, ['severityWise']).map((item) => ({ label: `Severity ${item._id ?? '-'}`, value: item.total }))} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Status Statistics</h2>
            <SimpleBars items={issueStats.map((item) => ({ label: item._id || 'Unknown', value: item.count }))} />
          </div>
        </div>
      )}
    </div>
  );
};

export const PendingIssuesPage = () => {
  const { loading, error, data } = usePanelData([
    { key: 'approval', url: '/community-approval/pending' },
    { key: 'verification', url: '/resolution-verification/pending' }
  ]);
  const approval = getArray(data.approval, ['issues']);
  const verification = getArray(data.verification, ['issues', 'verifications']);

  if (loading) return <div style={{ maxWidth: 980, margin: '32px auto' }}><Skeleton rows={6} /></div>;

  return (
    <div style={{ maxWidth: 1080, margin: '32px auto' }}>
      <PageHeader title="Pending Issues" subtitle="Approval and resolution verification queues." />
      {error ? <EmptyState title="Pending queues unavailable" detail={error} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }}>
          <QueueCard title="Pending Approval" rows={approval} />
          <QueueCard title="Pending Verification" rows={verification} />
        </div>
      )}
    </div>
  );
};

export const PendingResidentsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { loading, error, data } = usePanelData([{ key: 'residents', url: `/societies/pending-residents?refresh=${refreshKey}` }]);
  const residents = getArray(data.residents, ['residents']);

  const approveResident = async (residentUserId) => {
    await api.post('/societies/approve-resident', { residentUserId });
    setRefreshKey((value) => value + 1);
  };

  if (loading) return <div style={{ maxWidth: 980, margin: '32px auto' }}><Skeleton rows={5} /></div>;

  return (
    <div style={{ maxWidth: 980, margin: '32px auto' }}>
      <PageHeader title="Pending Residents" subtitle="Residents who verified location and requested community access." />
      {error ? <EmptyState title="Pending residents unavailable" detail={error} /> : (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          {residents.length ? residents.map((resident) => (
            <div key={resident._id} className="ai-step">
              <div>
                <strong>{resident.name}</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{resident.email}</p>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => approveResident(resident._id)}>
                Approve
              </button>
            </div>
          )) : <EmptyState title="No pending residents" detail="New verified join requests will appear here." />}
        </div>
      )}
    </div>
  );
};

const QueueCard = ({ title, rows }) => (
  <div className="card" style={{ display: 'grid', gap: 12 }}>
    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
    {rows.length ? rows.map((issue) => (
      <Link key={issue._id || issue.issue?._id} to={`/issues/${issue._id || issue.issue?._id}`} className="ai-step" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div>
          <strong>{issue.title || issue.issue?.title || issue.category || 'Issue'}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{issue.inferredReason || issue.issue?.inferredReason || issue.status}</p>
        </div>
        <StatusBadge tone={statusTone(issue.status || issue.issue?.status)}>{issue.status || issue.issue?.status || 'Pending'}</StatusBadge>
      </Link>
    )) : <EmptyState title="Queue is clear" detail="No issues are waiting here right now." />}
  </div>
);
