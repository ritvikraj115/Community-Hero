import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, Circle, Polygon, useJsApiLoader } from '@react-google-maps/api';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, Skeleton, StatusBadge, statusTone } from './ui';
import { googleMapsLoaderOptions } from '../utils/googleMaps';

const mapStyle = { width: '100%', height: '360px', borderRadius: 8 };
const defaultCenter = { lat: 20.5937, lng: 78.9629 };

const getArray = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const compactDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const displayMetricValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
};

const formatWind = (wind) => {
  if (!wind) return '-';
  if (typeof wind === 'object') {
    const speed = wind.speed ?? wind.value;
    const gust = wind.gust ? `, gust ${wind.gust}` : '';
    return speed !== undefined ? `${speed} m/s${gust}` : '-';
  }
  return wind;
};

export const usePanelData = (requests, enabled = true) => {
  const [state, setState] = useState({ loading: true, error: '', data: {} });
  const requestKey = JSON.stringify(requests);

  useEffect(() => {
    let alive = true;
    const activeRequests = JSON.parse(requestKey);
    if (!enabled) {
      setState({ loading: false, error: '', data: {} });
      return () => {
        alive = false;
      };
    }

    const load = async () => {
      try {
        setState((current) => ({ ...current, loading: true, error: '' }));
        const entries = await Promise.all(
          activeRequests.map(async ({ key, url }) => {
            const res = await api.get(url);
            return [key, res.data];
          })
        );
        if (alive) setState({ loading: false, error: '', data: Object.fromEntries(entries) });
      } catch (err) {
        if (alive) setState({ loading: false, error: err.response?.data?.error || 'Unable to load data.', data: {} });
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [enabled, requestKey]);

  return state;
};

export const MetricGrid = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
    {items.map((item) => (
      <div key={item.label} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>{item.label}</div>
        <div style={{ marginTop: 8, fontSize: '1.35rem', fontWeight: 900, color: item.color || 'var(--primary)' }}>{displayMetricValue(item.value)}</div>
      </div>
    ))}
  </div>
);

export const SimpleBars = ({ items }) => {
  const max = Math.max(1, ...items.map((item) => Number(item.value || item.total || 0)));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.slice(0, 8).map((item, index) => {
        const value = Number(item.value ?? item.total ?? 0);
        return (
          <div key={`${item.label || item._id || index}`} style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.88rem' }}>
              <strong>{item.label || item._id || 'Uncategorized'}</strong>
              <span style={{ color: 'var(--text-muted)' }}>{value}</span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((value / max) * 100)}%`, background: 'var(--primary)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const WeatherPanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([
    { key: 'weather', url: '/weather/current' },
    { key: 'alerts', url: '/weather-alerts' }
  ]);
  const rawWeather = data.weather?.weather || data.weather;
  const weather = rawWeather?.main ? rawWeather : { ...(rawWeather || {}), main: rawWeather || {} };
  const alerts = getArray(data.alerts, ['alerts']);
  const main = weather?.main || weather || {};

  if (loading) return <Skeleton rows={compact ? 2 : 3} />;
  if (error) return <EmptyState title="Weather unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 14 , alignItems: 'start'}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Weather Intelligence</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>{weather?.description || weather?.condition || 'Current society conditions'}</p>
        </div>
        <StatusBadge tone={alerts.length ? 'warning' : 'success'}>{alerts.length ? 'Alert Active' : 'Normal'}</StatusBadge>
      </div>
      <MetricGrid
        items={[
          {
            label: "Temperature",
            value: main.temp != null
              ? `${Math.round(main.temp)} C`
              : "-"
          },
          {
            label: "Humidity",
            value: main.humidity != null
              ? `${main.humidity}%`
              : "-"
          },
          {
            label: "Wind",
            value: weather?.windSpeed ?? formatWind(weather?.wind)
          },
          {
            label: "Visibility",
            value: weather?.visibility != null
              ? `${(weather.visibility / 1000).toFixed(1)} km`
              : "-"
          },
          {
            label: "Clouds",
            value: weather?.clouds?.all != null
              ? `${weather.clouds.all}%`
              : "-"
          },
          {
            label: "Rain",
            value: weather?.rainProbability ?? (weather?.rain
              ? `${weather.rain["1h"] ?? weather.rain["3h"] ?? 0} mm`
              : "0 mm")
          }
        ]}
      />
      {!compact && alerts.slice(0, 3).map((alert) => (
        <div key={alert._id || alert.title} className="ai-step">
          <span>{alert.title || alert.message}</span>
          <StatusBadge tone={statusTone(alert.severity || alert.status)}>{alert.severity || alert.status || 'ACTIVE'}</StatusBadge>
        </div>
      ))}
    </div>
  );
};

export const CommunityMapPanel = ({ compact = false }) => {
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader(googleMapsLoaderOptions);
  const { loading, error, data } = usePanelData([{ key: 'map', url: '/community-map' }]);
  const map = data.map || {};
  const center = map.geofence?.center
    ? { lat: map.geofence.center.latitude, lng: map.geofence.center.longitude }
    : defaultCenter;
  const polygon = map.geofence?.boundary?.coordinates?.[0]?.map(([lng, lat]) => ({ lat, lng })) || [];
  const issues = getArray(map, ['issues']);
  const maintenance = getArray(map, ['maintenance']);

  if (loading || !isLoaded) return <Skeleton rows={4} />;
  if (error) return <EmptyState title="Community map unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 14, alignItems: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Community Map</h2>
        <StatusBadge tone="info">{issues.length + maintenance.length} markers</StatusBadge>
      </div>
      <GoogleMap mapContainerStyle={{ ...mapStyle, height: compact ? '280px' : mapStyle.height }} center={center} zoom={15} options={{ mapTypeControl: false, streetViewControl: false }}>
        <Marker position={center} label="C" />
        {polygon.length >= 3 ? (
          <Polygon paths={polygon} options={{ fillColor: '#2563eb', fillOpacity: 0.12, strokeColor: '#2563eb', strokeWeight: 2 }} />
        ) : (
          <Circle center={center} radius={Number(map.geofence?.radius || 0)} options={{ fillColor: '#2563eb', fillOpacity: 0.1, strokeColor: '#2563eb', strokeWeight: 2 }} />
        )}
        {issues.map((issue) => {
          const [lng, lat] = issue.location?.coordinates || [];
          if (!lat || !lng) return null;
          const label = issue.status === 'Resolved' ? 'R' : issue.status === 'Pending Approval' ? 'P' : 'I';
          return <Marker key={issue._id} position={{ lat, lng }} label={label} onClick={() => navigate(`/issues/${issue._id}`)} />;
        })}
        {maintenance.map((task) => task.location?.coordinates ? (
          <Marker key={task._id} position={{ lat: task.location.coordinates[1], lng: task.location.coordinates[0] }} label="M" />
        ) : null)}
      </GoogleMap>
    </div>
  );
};

export const TimelinePanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([{ key: 'timeline', url: '/community-timeline' }]);
  const timeline = getArray(data.timeline, ['timeline']);

  if (loading) return <Skeleton rows={4} />;
  if (error) return <EmptyState title="Timeline unavailable" detail={error} />;
  if (!timeline.length) return <EmptyState title="No community activity yet" detail="Community events will appear after residents begin participating." />;

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Community History</h2>
      {timeline.slice(0, compact ? 5 : 20).map((item, index) => (
        <Link key={`${item.type}-${item.date}-${index}`} to={item.issueId ? `/issues/${item.issueId}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }} className="ai-step">
          <div>
            <strong>{item.title || item.type}</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', lineHeight: 1.45 }}>{item.description || item.status || item.type}</p>
          </div>
          <StatusBadge tone={statusTone(item.status || item.type)}>{compactDate(item.date)}</StatusBadge>
        </Link>
      ))}
    </div>
  );
};

export const KnowledgePanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([{ key: 'knowledge', url: '/history/community' }]);
  const insights = getArray(data.knowledge, ['insights']);

  if (loading) return <Skeleton rows={4} />;
  if (error) return <EmptyState title="Knowledge base unavailable" detail={error} />;
  if (!insights.length) return <EmptyState title="No community knowledge yet" detail="Resolved issue patterns will appear here." />;

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Community Knowledge</h2>
      {insights.slice(0, compact ? 4 : 20).map((item) => (
        <details key={item._id} className="ai-step" style={{ display: 'block' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{item.category || 'Issue'} - {item.inferredReason || 'Recurring reason'}</summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <span>Occurrences: {item.totalOccurrences ?? 0}</span>
            <span>Resolved: {item.resolvedOccurrences ?? 0}</span>
            <span>Avg severity: {item.averageSeverity ?? '-'}</span>
            <span>Resolution: {item.commonSolution || 'No resolution summary recorded.'}</span>
          </div>
        </details>
      ))}
    </div>
  );
};

export const AnalyticsPanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([{ key: 'analytics', url: '/analytics/dashboard' }]);
  const analytics = data.analytics || {};
  const stats = analytics.statistics || {};
  const categoryItems = Object.entries(stats.categoryCounts || {}).map(([label, value]) => ({ label, value }));
  const recurring = getArray(analytics, ['recurringProblems']);

  if (loading) return <Skeleton rows={4} />;
  if (error) return <EmptyState title="Analytics unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Analytics</h2>
      <MetricGrid
        items={[
          { label: 'Health', value: analytics.health?.score ?? analytics.health?.healthScore ?? '-' },
          { label: 'Total Issues', value: stats.totalIssues ?? '-' },
          { label: 'Resolved', value: stats.resolvedIssues ?? stats.resolved ?? '-' },
          { label: 'Recurring', value: recurring.length }
        ]}
      />
      <SimpleBars items={(categoryItems.length ? categoryItems : recurring.map((item) => ({ label: item.inferredReason || item.category, value: item.totalOccurrences }))).slice(0, compact ? 5 : 8)} />
    </div>
  );
};

export const AchievementsPanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([{ key: 'achievements', url: '/achievements' }]);
  const payload = data.achievements || {};
  const achievements = getArray(payload, ['achievements']);

  if (loading) return <Skeleton rows={3} />;
  if (error) return <EmptyState title="Achievements unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Achievements</h2>
      <MetricGrid
        items={[
          { label: 'Points', value: payload.statistics?.points ?? 0 },
          { label: 'Reported', value: payload.statistics?.reported ?? 0 },
          { label: 'Claimed', value: payload.statistics?.claimed ?? 0 },
          { label: 'Resolved', value: payload.statistics?.resolved ?? 0 }
        ]}
      />
      {achievements.length ? achievements.slice(0, compact ? 4 : 20).map((item) => (
        <div key={item.badge} className="ai-step">
          <strong>{item.badge}</strong>
          <StatusBadge tone="success">Earned</StatusBadge>
        </div>
      )) : <EmptyState title="No badges earned yet" detail="Badges unlock as residents report and resolve issues." />}
    </div>
  );
};

export const NotificationsPanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([
    { key: 'notifications', url: '/notifications' },
    { key: 'unread', url: '/notifications/unread-count' }
  ]);
  const notifications = getArray(data.notifications, ['notifications']);

  if (loading) return <Skeleton rows={3} />;
  if (error) return <EmptyState title="Notifications unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 12, alignItems: 'start' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Notifications</h2>
        <StatusBadge tone={data.unread?.unread ? 'warning' : 'success'}>{data.unread?.unread || 0} unread</StatusBadge>
      </div>
      {notifications.length ? notifications.slice(0, compact ? 5 : 30).map((item) => (
        <div key={item._id} className="ai-step">
          <div>
            <strong>{item.title}</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{item.message}</p>
          </div>
          <StatusBadge tone={statusTone(item.priority)}>{item.type}</StatusBadge>
        </div>
      )) : <EmptyState title="Inbox is clear" detail="Vote, issue, weather, and maintenance events will appear here." />}
    </div>
  );
};

export const PersonalHistoryPanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([{ key: 'personal', url: '/personal-history' }]);
  const payload = data.personal || {};
  const history = getArray(payload, ['history']);

  if (loading) return <Skeleton rows={4} />;
  if (error) return <EmptyState title="Profile history unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Profile</h2>
      <MetricGrid
        items={[
          { label: 'Points', value: payload.profile?.points ?? 0 },
          { label: 'Rank', value: payload.profile?.leaderboardRank || '-' },
          { label: 'Accuracy', value: `${payload.profile?.reportingAccuracy ?? 0}%` },
          { label: 'Reported', value: payload.profile?.totalReported ?? 0 }
        ]}
      />
      {history.slice(0, compact ? 5 : 20).map((item) => (
        <div key={item._id} className="ai-step">
          <span>{item.description || item.action}</span>
          <StatusBadge tone="info">{compactDate(item.createdAt)}</StatusBadge>
        </div>
      ))}
    </div>
  );
};

export const CommunityFeedPanel = ({ compact = false }) => {
  const { loading, error, data } = usePanelData([{ key: 'feed', url: '/community-feed' }]);
  const feed = getArray(data.feed, ['feed']);

  if (loading) return <Skeleton rows={4} />;
  if (error) return <EmptyState title="Community feed unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Community Feed</h2>
      {feed.length ? feed.slice(0, compact ? 5 : 20).map((item, index) => (
        <div key={`${item.type}-${index}`} className="ai-step">
          <span>{item.data?.title || item.data?.category || item.data?.message || item.type}</span>
          <StatusBadge tone={statusTone(item.type)}>{compactDate(item.date)}</StatusBadge>
        </div>
      )) : <EmptyState title="No feed items yet" detail="Community activity will appear here." />}
    </div>
  );
};

export const CommandCenterSections = ({ user }) => {
  if (!user?.societyId) return null;

  return (
    <div className="command-center">
      <div className="command-center-feature-grid">
        <WeatherPanel compact />
        <CommunityMapPanel compact />
      </div>
      <div className="command-center-panel-grid">
        <AnalyticsPanel compact />
        <AchievementsPanel compact />
        <LeaderboardPreview />
        <NotificationsPanel compact />
        <KnowledgePanel compact />
        <TimelinePanel compact />
        <CommunityFeedPanel compact />
        <PersonalHistoryPanel compact />
      </div>
    </div>
  );
};

export const LeaderboardPreview = () => {
  const { loading, error, data } = usePanelData([{ key: 'leaderboard', url: '/leaderboard/top' }]);
  const rows = getArray(data.leaderboard, ['leaderboard', 'topResidents', 'residents']);

  if (loading) return <Skeleton rows={3} />;
  if (error) return <EmptyState title="Leaderboard unavailable" detail={error} />;

  return (
    <div className="card" style={{ display: 'grid', gap: 12, alignItems: 'start' }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Leaderboard</h2>
      {rows.length ? rows.slice(0, 5).map((row, index) => (
        <div key={row._id || row.user?._id || index} className="ai-step">
          <strong>{index + 1}. {row.name || row.user?.name || 'Resident'}</strong>
          <StatusBadge tone="info">{row.gamificationPoints ?? row.totalPoints ?? 0} pts</StatusBadge>
        </div>
      )) : <EmptyState title="No rankings yet" detail="Points appear after civic actions." />}
    </div>
  );
};
