import React from 'react';

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="card page-header">
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const StatusBadge = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: ['#F8FAFC', '#475569'],
    success: ['#ECFDF5', '#166534'],
    warning: ['#FFFBEB', '#92400e'],
    danger: ['#FEF2F2', '#991b1b'],
    info: ['#EFF6FF', '#1d4ed8'],
    dark: ['#0f172a', '#ffffff']
  };
  const [bg, color] = tones[tone] || tones.neutral;

  return (
    <span className="status-badge" style={{ background: bg, color }}>
      {children}
    </span>
  );
};

export const Skeleton = ({ rows = 3 }) => (
  <div className="card skeleton-wrap">
    {Array.from({ length: rows }).map((_, index) => (
      <div className="skeleton-line" key={index} />
    ))}
  </div>
);

export const EmptyState = ({ title, detail, action }) => (
  <div className="card empty-state">
    <strong>{title}</strong>
    {detail && <span>{detail}</span>}
    {action}
  </div>
);

export const Field = ({ label, value }) => (
  <div className="field-row">
    <span>{label}</span>
    <strong>{value || '-'}</strong>
  </div>
);

export const similarityPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${Math.round(number <= 1 ? number * 100 : number)}%`;
};

export const statusTone = (status) => {
  if (status === 'Resolved' || status === 'COMPLETED') return 'success';
  if (status === 'Pending Verification' || status === 'SCHEDULED') return 'warning';
  if (status === 'In Progress' || status === 'Open' || status === 'ACTIVE') return 'info';
  if (status === 'OVERDUE' || status === 'Rejected') return 'danger';
  return 'neutral';
};
