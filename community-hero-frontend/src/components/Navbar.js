import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import api from '../api/client';

const Navbar = ({ user, onLogout }) => {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadUnread = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        if (alive) setUnread(Number(res.data?.unread) || 0);
      } catch {
        if (alive) setUnread(0);
      }
    };

    loadUnread();
    window.addEventListener('auth-updated', loadUnread);
    return () => {
      alive = false;
      window.removeEventListener('auth-updated', loadUnread);
    };
  }, []);

  const residentApproved = user?.role === 'resident' && user?.joinStatus === 'approved';
  const admin = user?.role === 'admin';
  const hasCommunity = Boolean(user?.societyId);

  const primaryLinks = [
    ['Dashboard', '/dashboard', true],
    ['Create Issue', '/create-issue', residentApproved],
    ['Issues', '/issues', residentApproved || (admin && hasCommunity)],
    ['Pending Residents', '/pending-residents', admin && hasCommunity],
    ['Pending Issues', '/pending-issues', hasCommunity],
    ['Community Setup', '/admin-setup', admin && !hasCommunity]
  ].filter(([, , visible]) => visible);

  const moreLinks = [
    ['Community Map', '/community-map', hasCommunity],
    ['Knowledge', '/knowledge', hasCommunity],
    ['Analytics', '/analytics', hasCommunity],
    ['Community History', '/community-history', hasCommunity],
    ['Community Feed', '/community-feed', hasCommunity],
    ['Reports', '/reports', admin && hasCommunity],
    ['Maintenance', '/maintenance', hasCommunity],
    ['Leaderboard', '/leaderboard', hasCommunity],
    ['Achievements', '/achievements', residentApproved],
    ['Profile', '/profile', true]
  ].filter(([, , visible]) => visible);

  return (
    <header className="topbar">
      <div className="topbar-shell">
        <Link to="/dashboard" className="brand-lockup" aria-label="Community Hero Dashboard">
          <span className="brand-mark">CH</span>
          <span>
            <strong>Community Hero</strong>
            <small>{hasCommunity ? 'Civic Intelligence' : 'Setup Required'}</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {primaryLinks.map(([label, to]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {label}
            </NavLink>
          ))}

          {moreLinks.length > 0 && (
            <details className="nav-menu">
              <summary>More</summary>
              <div className="nav-menu-panel">
                {moreLinks.map(([label, to]) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `nav-menu-link ${isActive ? 'active' : ''}`}>
                    {label}
                  </NavLink>
                ))}
              </div>
            </details>
          )}
        </nav>

        <div className="topbar-actions">
          <NavLink to="/notifications" className={({ isActive }) => `notification-link ${isActive ? 'active' : ''}`}>
            Notifications
            {unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}
          </NavLink>

          <span className={`role-chip ${user?.role === 'admin' ? 'admin' : ''}`}>
            {user?.role === 'resident' ? `Resident - ${user?.joinStatus || 'none'}` : 'Admin'}
          </span>

          <button onClick={onLogout} className="logout-button" type="button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
