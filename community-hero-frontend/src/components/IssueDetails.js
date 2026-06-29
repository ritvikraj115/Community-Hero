import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { Field, StatusBadge, similarityPercent, statusTone } from './ui';
import { formatAccuracy, getAccurateLocation } from '../utils/location';

const formatHistoryItem = (item) => ({
  id: item.issue || item._id,
  title: item.title || item.reason || item.inferredReason || 'Similar resolved issue',
  solution: item.solution || item.commonSolution || item.resolutionSummary || '',
  similarity: item.similarity,
  confidence: item.confidence || item.aiConfidenceAverage,
  resolutionTimeHours: item.resolutionTimeHours || item.averageResolutionHours,
  solver: item.solver || item.solvedBy
});

const IssueDetails = () => {
  const { issueId } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [user, setUser] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [fixFile, setFixFile] = useState(null);
  const [fixPreview, setFixPreview] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [helpNote, setHelpNote] = useState('');
  const [eta, setEta] = useState('');
  const [resourcesNeeded, setResourcesNeeded] = useState('');
  const [historical, setHistorical] = useState([]);

  useEffect(() => {
    if (!fixFile) {
      setFixPreview('');
      return undefined;
    }

    const url = URL.createObjectURL(fixFile);
    setFixPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [fixFile]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (!storedUser) {
        navigate('/login', { replace: true });
        return;
      }
      setUser(storedUser);

      const res = await api.get(`/issues/${issueId}`);
      setIssue(res.data);
      if (res.data?.category && res.data?.inferredReason) {
        const historyRes = await api.get('/insights/history', {
          params: {
            category: res.data.category,
            reason: res.data.inferredReason
          }
        });
        setHistorical((historyRes.data?.history || []).map(formatHistoryItem));
      } else {
        setHistorical([]);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to load issue.');
    } finally {
      setLoading(false);
    }
  }, [issueId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    loadData();
  }, [loadData, navigate]);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const current = JSON.parse(localStorage.getItem('user') || '{}');
      const updated = { ...current, ...res.data };
      localStorage.setItem('user', JSON.stringify(updated));
      window.dispatchEvent(new Event('auth-updated'));
      setUser(updated);
    } catch {}
  };

  const reloadIssue = async () => {
    const res = await api.get(`/issues/${issueId}`);
    setIssue(res.data);
  };

  const claimIssue = async () => {
    try {
      await api.post(`/issues/${issueId}/claim`, {
        estimatedCompletion: eta || null,
        resourcesNeeded
      });
      setMessage(issue?.solver ? 'You joined the resolution team.' : 'You claimed the issue.');
      await reloadIssue();
      await refreshUser();
    } catch (err) {
      setMessage(err.response?.data?.error || err.message || 'Failed to claim.');
    }
  };

  const voteApproval = async () => {
    try {
      await api.post(`/issues/${issueId}/vote-approval`);
      setMessage('Approval vote recorded.');
      await reloadIssue();
      await refreshUser();
    } catch (err) {
      setMessage(err.response?.data?.error || err.message || 'Failed to vote.');
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/issues/${issueId}/comments`, { text: commentText });
      setCommentText('');
      setMessage('Comment added.');
      await reloadIssue();
    } catch (err) {
      setMessage(err.response?.data?.error || err.message || 'Failed to add comment.');
    }
  };

  const submitResolution = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      if (fixFile) formData.append('resolvedImage', fixFile);
      formData.append('resolutionSummary', resolutionSummary);

      if (user?.role === 'admin') {
        setMessage('Checking admin onsite location...');
        const coordinates = await getAccurateLocation({
          onUpdate: (best) => {
            setMessage(`Improving admin onsite GPS accuracy${formatAccuracy(best.accuracy)}...`);
          }
        });
        formData.append('latitude', coordinates.latitude);
        formData.append('longitude', coordinates.longitude);
        formData.append('locationAccuracy', coordinates.accuracy);
      }

      const res = await api.post(`/issues/${issueId}/resolve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage(`Resolution submitted. AI confidence: ${res.data?.aiConfidenceScore ?? res.data?.resolutionConfidence ?? '-'}%.`);
      setFixFile(null);
      setResolutionSummary('');
      await reloadIssue();
    } catch (err) {
      setMessage(err.response?.data?.error || err.message || 'Failed to submit resolution.');
    }
  };

  const requestHelp = async () => {
    try {
      await api.post(`/issues/${issueId}/request-help`, { note: helpNote });
      setMessage('Help request sent to the community.');
      setHelpNote('');
      await reloadIssue();
    } catch (err) {
      setMessage(err.response?.data?.error || err.message || 'Failed to request help.');
    }
  };

  const voteResolution = async () => {
    try {
      await api.post(`/issues/${issueId}/vote-resolution`);
      setMessage('Resolution vote recorded.');
      await reloadIssue();
    } catch (err) {
      setMessage(err.response?.data?.error || err.message || 'Failed to vote on resolution.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>
        {message || 'Issue not found.'}
      </div>
    );
  }

  const currentUserId = String(user?.id || user?._id || '');
  const creatorId = String(issue.creator?._id || issue.creator || '');
  const solverId = String(issue.solver?._id || issue.solver || '');
  const helperIds = (issue.helpers || []).map((helper) => String(helper.user?._id || helper.user || ''));
  const submittedById = String(issue.resolutionSubmittedBy?._id || issue.resolutionSubmittedBy || '');
  const isResident = user?.role === 'resident';
  const isAdmin = user?.role === 'admin';
  const isCreator = creatorId === currentUserId;
  const isSolver = solverId === currentUserId;
  const isHelper = helperIds.includes(currentUserId);
  const isResolver = isSolver || isHelper || submittedById === currentUserId;
  const isActiveIssue = ['Open', 'In Progress'].includes(issue.status);
  const canVoteApproval = isResident && !isCreator;
  const canVoteResolution = isResident && !isResolver;
  const canSubmitFix = isActiveIssue && (isAdmin || isSolver || isHelper);
  const canJoinResolution = isResident && isActiveIssue && !isSolver && !isHelper;
  const canRequestHelp = isActiveIssue && (isAdmin || isSolver || isHelper);
  const timeline = [
    { label: 'Reported', value: issue.createdAt ? new Date(issue.createdAt).toLocaleString() : '-' },
    { label: 'Approved/Open', value: issue.status === 'Pending Approval' ? 'Waiting for community approval' : 'Ready' },
    { label: 'Claimed', value: issue.claimedAt ? new Date(issue.claimedAt).toLocaleString() : issue.solver ? 'Claimed' : 'Unclaimed' },
    { label: 'Resolved', value: issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleString() : issue.status === 'Resolved' ? 'Completed' : 'Pending' }
  ];

  return (
    <div style={{ maxWidth: '1120px', margin: '32px auto' }}>
      <div className="card" style={{ marginBottom: '18px', background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)' }}>{issue.title}</h1>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', lineHeight: 1.6 }}>{issue.description}</p>
          </div>
          <div style={{ display: 'grid', justifyItems: 'end', gap: 10 }}>
            <StatusBadge tone={statusTone(issue.status)}>{issue.status}</StatusBadge>
            {message && <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{message}</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.95fr', gap: '18px' }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Issue Media</h2>
            {issue.mediaUrl ? (
              <img
                src={issue.mediaUrl}
                alt="Issue"
                style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 18, border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{ padding: 30, color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 16, textAlign: 'center' }}>
                No media uploaded.
              </div>
            )}
          </div>

          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>AI Reason Engine</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <Field label="Category" value={issue.category || '-'} />
              <Field label="Severity" value={issue.severityScore ?? '-'} />
              <Field label="Reason" value={issue.inferredReason || '-'} />
              <Field label="Root Cause" value={issue.rootCause || '-'} />
              <Field label="Risk" value={issue.risk || issue.priority || '-'} />
              <Field label="Status" value={<StatusBadge tone={statusTone(issue.status)}>{issue.status}</StatusBadge>} />
              <Field label="Approval Votes" value={issue.approvalVoters?.length || 0} />
              <Field label="Resolution Votes" value={issue.resolutionVoters?.length || 0} />
            </div>
          </div>

          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Semantic Intelligence</h2>
              <StatusBadge tone="info">Google Embeddings</StatusBadge>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Embedding Model" value={issue.embeddingModel || '-'} />
              <Field label="Semantic Similarity" value={issue.semanticSimilarity ? similarityPercent(issue.semanticSimilarity) : '-'} />
              <Field label="Image Similarity" value={issue.imageSimilarity ? similarityPercent(issue.imageSimilarity) : '-'} />
              {issue.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {issue.tags.map((tag) => <StatusBadge key={tag} tone="neutral">{tag}</StatusBadge>)}
                </div>
              )}
              {issue.semanticSummary && (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 14, borderRadius: 8, background: '#f8fafc', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {issue.semanticSummary}
                </pre>
              )}
            </div>
          </div>

          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Historical Similar Issues</h2>
            {historical.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {historical.map((item, index) => (
                  <div key={item.id || index} className="ai-step" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{item.title}</strong>
                      <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.solution || 'No solution summary recorded.'}</p>
                      <div style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Resolution time: {item.resolutionTimeHours ?? '-'} hrs | Confidence: {item.confidence ?? '-'}
                      </div>
                    </div>
                    <StatusBadge tone="info">{similarityPercent(item.similarity)}</StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No resolved semantic matches found yet.</div>
            )}
          </div>

          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Comments</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{issue.comments?.length || 0} comments</span>
            </div>

            {issue.comments?.length ? (
              <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                {issue.comments.map((c) => (
                  <div key={c._id} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 16, background: '#fff' }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>{c.user?.name || 'User'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{c.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No comments yet.</div>
            )}

            <form onSubmit={addComment} style={{ display: 'grid', gap: 10 }}>
              <textarea
                className="input-field"
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                disabled={issue.status === 'Pending Approval'}
              />
              <button className="btn btn-primary" type="submit" disabled={issue.status === 'Pending Approval'}>
                Add Comment
              </button>
            </form>
          </div>

          {canSubmitFix && (
            <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Submit Fix</h2>
              <form onSubmit={submitResolution} style={{ display: 'grid', gap: 12 }}>
                <textarea
                  className="input-field"
                  rows={4}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Describe what you fixed, materials used, and anything future solvers should know."
                  required
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFixFile(e.target.files?.[0] || null)}
                  required
                />
                {fixPreview && (
                  <img
                    src={fixPreview}
                    alt="Fix preview"
                    style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                )}
                <button className="btn btn-primary" type="submit" disabled={!resolutionSummary.trim() || !fixFile}>
                  Upload Fix
                </button>
              </form>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Action Panel</h2>

            <div style={{ display: 'grid', gap: 10 }}>
              {issue.status === 'Pending Approval' && isResident && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <button className="btn btn-primary" onClick={voteApproval} disabled={!canVoteApproval}>
                    Vote to Approve
                  </button>
                  {!canVoteApproval && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Issue creators cannot vote to approve their own issue.
                    </div>
                  )}
                </div>
              )}

              {canJoinResolution && (
                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    className="input-field"
                    type="datetime-local"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                  />
                  <textarea
                    className="input-field"
                    rows={3}
                    value={resourcesNeeded}
                    onChange={(e) => setResourcesNeeded(e.target.value)}
                    placeholder="Resources needed"
                  />
                  <button className="btn btn-primary" onClick={claimIssue}>
                    {issue.solver ? 'Join Resolution Team' : 'Take Responsibility'}
                  </button>
                </div>
              )}

              {canRequestHelp && (
                <div style={{ display: 'grid', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={helpNote}
                    onChange={(e) => setHelpNote(e.target.value)}
                    placeholder="What kind of help is needed?"
                  />
                  <button className="btn btn-outline" onClick={requestHelp}>
                    Request Community Help
                  </button>
                </div>
              )}

              {issue.status === 'Pending Verification' && isResident && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <button className="btn btn-primary" onClick={voteResolution} disabled={!canVoteResolution}>
                    Vote for Resolution
                  </button>
                  {!canVoteResolution && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Resolvers cannot vote to verify their own resolution.
                    </div>
                  )}
                </div>
              )}

              {issue.status === 'Resolved' && (
                <div style={{ color: 'var(--success)', fontWeight: 800 }}>Issue has been resolved.</div>
              )}
            </div>
          </div>

          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Metadata</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Creator" value={issue.creator?.name || 'Unknown'} />
              <Field label="Solver" value={issue.solver?.name || 'Unclaimed'} />
              <Field
                label="Helpers"
                value={issue.helpers?.length ? issue.helpers.map((helper) => helper.user?.name || 'Resident').join(', ') : '-'}
              />
              <Field label="Help Requested" value={issue.helpRequested ? (issue.helpRequestNote || 'Yes') : 'No'} />
              <Field label="ETA" value={issue.estimatedCompletion ? new Date(issue.estimatedCompletion).toLocaleString() : '-'} />
              <Field label="Resources" value={issue.resourcesNeeded || '-'} />
              <Field label="Location" value={issue.location?.coordinates?.join(', ') || '-'} />
              <Field label="Required Approval %" value={`${issue.requiredApprovalVotes}%`} />
              <Field label="Required Resolution %" value={`${issue.requiredResolutionVotes}%`} />
              <Field label="AI Confidence" value={issue.aiConfidenceScore ?? issue.resolutionConfidence ?? '-'} />
              <Field label="Fix Submitted By" value={issue.resolutionSubmittedBy?.name || '-'} />
              <Field label="Fix Summary" value={issue.resolutionSummary || '-'} />
            </div>
          </div>

          <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Timeline</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {timeline.map((item) => (
                <div key={item.label} className="ai-step">
                  <strong>{item.label}</strong>
                  <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {issue.resolvedMediaUrl && (
            <div className="card" style={{ boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: 800 }}>Fixed Media</h2>
              <img
                src={issue.resolvedMediaUrl}
                alt="Resolved"
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 18, border: '1px solid var(--border)' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueDetails;
