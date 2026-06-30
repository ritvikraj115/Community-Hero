import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import AdminSetup from './components/AdminSetup';
import Dashboard from './components/Dashboard';
import CreateIssue from './components/CreateIssue';
import ActiveIssues from './components/ActiveIssues';
import IssueDetails from './components/IssueDetails';
import Leaderboard from './components/Leaderboard';
import Alerts from './components/Alerts';
import MaintenanceBoard from './components/MaintainceBoard';
import Navbar from './components/Navbar';
import {
  AchievementsPage,
  AnalyticsPage,
  CommunityFeedPage,
  CommunityMapPage,
  CommunityTimelinePage,
  KnowledgePage,
  NotificationsPage,
  PendingIssuesPage,
  PendingResidentsPage,
  ProfilePage,
  ReportsPage
} from './components/FeaturePages';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const sameUser = (left, right) => JSON.stringify(left || null) === JSON.stringify(right || null);

const ProtectedRoute = ({ children, user, allowedRoles, requireApproval }) => {
  const token = localStorage.getItem('token');
  const currentUser = user || readStoredUser();

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireApproval && currentUser?.role === 'resident' && currentUser?.joinStatus !== 'approved') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppShell() {
  const [authUser, setAuthUser] = useState(readStoredUser());

  useEffect(() => {
    const syncAuthUser = () => {
      const nextUser = readStoredUser();
      setAuthUser((currentUser) => (sameUser(currentUser, nextUser) ? currentUser : nextUser));
    };

    window.addEventListener('auth-updated', syncAuthUser);
    window.addEventListener('storage', syncAuthUser);

    return () => {
      window.removeEventListener('auth-updated', syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setAuthUser(null);
    window.location.href = '/login';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {authUser && <Navbar user={authUser} onLogout={handleLogout} />}

      <main style={{ flex: 1, padding: '40px 20px' }}>
        <Routes>
          <Route path="/login" element={!authUser ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/register" element={!authUser ? <Register /> : <Navigate to="/dashboard" replace />} />

          <Route
            path="/admin-setup"
            element={
              <ProtectedRoute user={authUser} allowedRoles={['admin']}>
                <AdminSetup />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={authUser}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/issues"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <ActiveIssues />
              </ProtectedRoute>
            }
          />

          <Route
            path="/issues/:issueId"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <IssueDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-issue"
            element={
              <ProtectedRoute user={authUser} allowedRoles={['resident']} requireApproval={true}>
                <CreateIssue />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute user={authUser}>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/alerts"
            element={
              <ProtectedRoute user={authUser}>
                <Alerts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/maintenance"
            element={
              <ProtectedRoute user={authUser}>
                <MaintenanceBoard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community-map"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <CommunityMapPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/knowledge"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <KnowledgePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/achievements"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <AchievementsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute user={authUser}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute user={authUser}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community-history"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <CommunityTimelinePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community-feed"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <CommunityFeedPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pending-issues"
            element={
              <ProtectedRoute user={authUser} requireApproval={true}>
                <PendingIssuesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pending-residents"
            element={
              <ProtectedRoute user={authUser} allowedRoles={['admin']}>
                <PendingResidentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute user={authUser} allowedRoles={['admin']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to={authUser ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to={authUser ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
