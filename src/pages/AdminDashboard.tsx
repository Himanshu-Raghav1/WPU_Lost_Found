import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Link } from 'react-router-dom';
import { LogOut, CheckCircle, XCircle, MapPin, Calendar, Phone, Mail, User, Shield, Zap, Plus, Trash2 } from 'lucide-react';
import { useAuthActions } from '@convex-dev/auth/react';
import mitLogo from '../assets/mit_logo.png';

type Tab = 'pending' | 'all' | 'matches' | 'admins';

export default function AdminDashboard() {
  const { signOut } = useAuthActions();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [confirmingMatch, setConfirmingMatch] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [allSearch, setAllSearch] = useState('');
  const [allFilter, setAllFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'resolved'>('all');

  const pendingItems = useQuery(api.admin.getPendingItems) ?? [];
  const allItems = useQuery(api.admin.getAllItemsAdmin) ?? [];
  const adminEmails = useQuery(api.admin.getAdminEmails) ?? [];
  const matchSuggestions = useQuery(api.admin.getMatchSuggestions) ?? [];

  const approveItem = useMutation(api.admin.approveItem);
  const rejectItem = useMutation(api.admin.rejectItem);
  const addAdminEmail = useMutation(api.admin.addAdminEmail);
  const removeAdminEmail = useMutation(api.admin.removeAdminEmail);
  const confirmMatch = useAction(api.admin.confirmMatch);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (itemId: any) => {
    try { await approveItem({ itemId }); showToast('Item approved and is now live on the feed!'); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleReject = async (itemId: any) => {
    try {
      await rejectItem({ itemId, reason: rejectReason[itemId] || 'Rejected by admin.' });
      setRejectOpen(null);
      showToast('Item rejected successfully.');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleAddAdmin = async () => {
    try {
      await addAdminEmail({ email: newAdminEmail.trim() });
      setNewAdminEmail('');
      showToast(`Admin access granted to ${newAdminEmail}`);
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleConfirmMatch = async (lostItemId: any, foundItemId: any, key: string) => {
    setConfirmingMatch(key);
    try {
      await confirmMatch({ lostItemId, foundItemId });
      showToast('✅ Match confirmed! Emails sent to both students.');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setConfirmingMatch(null); }
  };

  const approvedCount = allItems.filter(i => (i.approvalStatus || 'approved') === 'approved').length;
  const rejectedCount = allItems.filter(i => i.approvalStatus === 'rejected').length;
  const resolvedCount = allItems.filter(i => i.status === 'resolved').length;

  const filteredAllItems = allItems.filter((i) => {
    const statusStr = (i.approvalStatus || 'approved').toLowerCase();
    const matchesFilter =
      allFilter === 'all' ||
      (allFilter === 'resolved' ? i.status === 'resolved' : statusStr === allFilter);

    const queryStr = allSearch.trim().toLowerCase();
    const matchesSearch =
      !queryStr ||
      (i.title || '').toLowerCase().includes(queryStr) ||
      (i.description || '').toLowerCase().includes(queryStr) ||
      (i.reporterName || '').toLowerCase().includes(queryStr) ||
      (i.reporterPrn || '').toLowerCase().includes(queryStr) ||
      (i.reporterEmail || '').toLowerCase().includes(queryStr) ||
      (i.location || '').toLowerCase().includes(queryStr);

    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '0.9rem 1.5rem', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '0.95rem', fontWeight: 600,
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Admin Nav */}
      <nav className="wpu-nav">
        <div className="wpu-nav-brand">
          <div className="logo-circle-sm"><img src={mitLogo} alt="MIT WPU" /></div>
          <div>
            <div className="wpu-nav-title">🛡️ Admin Panel</div>
            <div className="wpu-nav-subtitle">MIT WPU Lost &amp; Found — Campus Administration</div>
          </div>
        </div>
        <div className="wpu-nav-actions">
          <Link to="/dashboard" className="btn btn-outline btn-sm">Student View</Link>
          <button className="btn btn-outline btn-sm" onClick={() => signOut()}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Stats Bar */}
      <div style={{ background: '#1d2b56', color: '#fff', padding: '1.25rem 2rem', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Pending Approval', value: pendingItems.length, color: '#facc15' },
          { label: 'Approved Live', value: approvedCount, color: '#4ade80' },
          { label: 'Rejected', value: rejectedCount, color: '#f87171' },
          { label: 'Resolved/Matched', value: resolvedCount, color: '#60a5fa' },
          { label: 'Match Suggestions', value: matchSuggestions.length, color: '#c084fc' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '2px solid #e2e8f0', padding: '0 2rem', display: 'flex', gap: '0', overflowX: 'auto' }}>
        {([
          { key: 'pending', label: `⏳ Pending (${pendingItems.length})` },
          { key: 'all', label: `📋 All Reports (${allItems.length})` },
          { key: 'matches', label: `🔗 Smart Match (${matchSuggestions.length})` },
          { key: 'admins', label: '🔐 Admin Access' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              border: 'none', background: 'transparent', padding: '1rem 1.5rem',
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              color: activeTab === t.key ? '#1d2b56' : '#64748b',
              borderBottom: activeTab === t.key ? '3px solid #1d2b56' : '3px solid transparent',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >{t.label}</button>
        ))}
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>

        {/* ── PENDING TAB ─────────────────────────────────────────── */}
        {activeTab === 'pending' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d2b56', marginBottom: '1.5rem' }}>
              Pending Reports — Awaiting Your Approval
            </h2>
            {pendingItems.length === 0 ? (
              <div className="wpu-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <CheckCircle size={48} color="#16a34a" style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: '#16a34a' }}>All Clear! No pending reports.</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {pendingItems.map((item: any) => (
                  <div key={item._id} className="wpu-card" style={{ padding: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                            {item.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                            {item.category.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '2px 10px', borderRadius: '99px', fontWeight: 700 }}>
                            ⏳ PENDING
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1d2b56', marginBottom: '0.4rem' }}>{item.title}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>{item.description}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <MapPin size={14} color="#1d2b56" /> <strong>Location:</strong> {item.location}
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <Calendar size={14} color="#1d2b56" /> <strong>Date:</strong> {item.date}
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <User size={14} color="#1d2b56" /> <strong>Name:</strong> {item.reporterName} (PRN: {item.reporterPrn})
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <Mail size={14} color="#1d2b56" /> <strong>Email:</strong> {item.reporterEmail}
                          </div>
                          {item.reporterPhone && (
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <Phone size={14} color="#1d2b56" /> <strong>Phone:</strong> {item.reporterPhone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Image (admin always sees it) */}
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.title}
                          style={{ width: '160px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0', flexShrink: 0 }}
                        />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" style={{ background: '#16a34a' }} onClick={() => handleApprove(item._id)}>
                        <CheckCircle size={16} /> Approve — Publish to Feed
                      </button>

                      {rejectOpen === item._id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, minWidth: '180px', padding: '0.5rem 0.75rem' }}
                            placeholder="Reason for rejection (optional)"
                            value={rejectReason[item._id] || ''}
                            onChange={(e) => setRejectReason(prev => ({ ...prev, [item._id]: e.target.value }))}
                          />
                          <button className="btn" style={{ background: '#dc2626', color: '#fff' }} onClick={() => handleReject(item._id)}>
                            Confirm Reject
                          </button>
                          <button className="btn btn-outline" onClick={() => setRejectOpen(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-outline" style={{ borderColor: '#dc2626', color: '#dc2626' }} onClick={() => setRejectOpen(item._id)}>
                          <XCircle size={16} /> Reject Report
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ALL REPORTS TAB ──────────────────────────────────────── */}
        {activeTab === 'all' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d2b56' }}>
                All Reports — Full Admin Audit View
              </h2>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search PRN, email, title..."
                  value={allSearch}
                  onChange={(e) => setAllSearch(e.target.value)}
                  style={{ width: '220px', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                />
                <select
                  className="form-input"
                  value={allFilter}
                  onChange={(e: any) => setAllFilter(e.target.value)}
                  style={{ width: '150px', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {filteredAllItems.length === 0 ? (
              <div className="wpu-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <h3 style={{ color: '#64748b' }}>No matching reports found</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredAllItems.map((item: any) => {
                  const statusStr = (item.approvalStatus || 'approved').toLowerCase();
                  return (
                    <div key={item._id} className="wpu-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                              {(item.type || 'lost').toUpperCase()}
                            </span>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: '99px',
                              background: statusStr === 'approved' ? '#dcfce7' : statusStr === 'pending' ? '#fef3c7' : '#fee2e2',
                              color: statusStr === 'approved' ? '#16a34a' : statusStr === 'pending' ? '#b45309' : '#dc2626',
                            }}>
                              {statusStr.toUpperCase()}
                            </span>
                            {item.status === 'resolved' && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: '99px', background: '#eff6ff', color: '#2563eb' }}>
                                RESOLVED
                              </span>
                            )}
                          </div>
                          <strong style={{ color: '#1d2b56', fontSize: '1rem' }}>{item.title || 'Untitled'}</strong>
                          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.3rem 0 0.6rem 0' }}>{item.description}</p>
                          <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <span><User size={12} style={{ marginRight: 4 }} />{item.reporterName || 'Student'} · {item.reporterPrn || '---'}</span>
                            <span><Mail size={12} style={{ marginRight: 4 }} />{item.reporterEmail || '---'}</span>
                            {item.reporterPhone && <span><Phone size={12} style={{ marginRight: 4 }} />{item.reporterPhone}</span>}
                            <span><MapPin size={12} style={{ marginRight: 4 }} />{item.location || 'Campus'}</span>
                          </div>
                        </div>
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.title}
                            style={{ width: '90px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SMART MATCH TAB ──────────────────────────────────────── */}
        {activeTab === 'matches' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d2b56', marginBottom: '0.5rem' }}>
              🔗 Smart Match Suggestions
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Our system automatically scores Lost vs Found item pairs by keyword overlap, category, and location similarity.
              Confirm a match to resolve both items and automatically email contact details to both students.
            </p>
            {matchSuggestions.length === 0 ? (
              <div className="wpu-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Zap size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: '#64748b' }}>No match suggestions yet.</h3>
                <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Matches appear once there are approved Lost and Found items with similar descriptions.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {matchSuggestions.map((s: any, i: number) => {
                  const matchKey = `${s.lostItem._id}-${s.foundItem._id}`;
                  const pct = s.score;
                  const barColor = pct >= 60 ? '#16a34a' : pct >= 35 ? '#f59e0b' : '#94a3b8';
                  return (
                    <div key={i} className="wpu-card" style={{ padding: '1.75rem' }}>
                      {/* Score Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <span style={{ fontWeight: 800, color: '#1d2b56', fontSize: '1rem' }}>
                          Match #{i + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '120px', height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '99px', transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontWeight: 800, color: barColor, fontSize: '0.95rem' }}>{pct}% Match</span>
                        </div>
                      </div>

                      {/* Side-by-side comparison */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'start' }}>
                        {/* Lost Item */}
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.25rem' }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>LOST ITEM</p>
                          <p style={{ fontWeight: 700, color: '#1d2b56', marginBottom: '0.4rem' }}>{s.lostItem.title}</p>
                          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.4 }}>{s.lostItem.description}</p>
                          <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span>📍 {s.lostItem.location}</span>
                            <span>🏷️ {s.lostItem.category}</span>
                            <span style={{ marginTop: '0.5rem', fontWeight: 600 }}>👤 {s.lostItem.reporterName}</span>
                            <span>✉️ {s.lostItem.reporterEmail}</span>
                            {s.lostItem.reporterPhone && <span>📞 {s.lostItem.reporterPhone}</span>}
                          </div>
                        </div>

                        {/* Link */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                          <div style={{ fontSize: '1.5rem' }}>🔗</div>
                          <div style={{ width: '2px', height: '40px', background: '#e2e8f0' }} />
                        </div>

                        {/* Found Item */}
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.25rem' }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>FOUND ITEM</p>
                          <p style={{ fontWeight: 700, color: '#1d2b56', marginBottom: '0.4rem' }}>{s.foundItem.title}</p>
                          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.4 }}>{s.foundItem.description}</p>
                          <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span>📍 {s.foundItem.location}</span>
                            <span>🏷️ {s.foundItem.category}</span>
                            <span style={{ marginTop: '0.5rem', fontWeight: 600 }}>👤 {s.foundItem.reporterName}</span>
                            <span>✉️ {s.foundItem.reporterEmail}</span>
                            {s.foundItem.reporterPhone && <span>📞 {s.foundItem.reporterPhone}</span>}
                          </div>
                          {s.foundItem.imageUrl && (
                            <img src={s.foundItem.imageUrl} alt={s.foundItem.title}
                              style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.75rem' }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Confirm button */}
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          style={{ background: '#7c3aed' }}
                          disabled={confirmingMatch === matchKey}
                          onClick={() => handleConfirmMatch(s.lostItem._id, s.foundItem._id, matchKey)}
                        >
                          <Shield size={16} />
                          {confirmingMatch === matchKey ? 'Confirming & Sending Emails...' : 'Confirm Match & Notify Both Students'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN ACCESS TAB ─────────────────────────────────────── */}
        {activeTab === 'admins' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d2b56', marginBottom: '1.5rem' }}>
              🔐 Admin Email Access Management
            </h2>
            {/* Add new admin */}
            <div className="wpu-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, color: '#1d2b56', marginBottom: '0.75rem' }}>Grant Admin Access</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ flex: 1, minWidth: '240px' }}
                  placeholder="Enter @mitwpu.edu.in email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddAdmin}
                  disabled={!newAdminEmail.includes('@mitwpu.edu.in')}
                >
                  <Plus size={16} /> Grant Admin Access
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                Only @mitwpu.edu.in email addresses can be granted admin access.
              </p>
            </div>

            {/* Current admin list */}
            <div className="wpu-card" style={{ padding: '1.5rem' }}>
              <p style={{ fontWeight: 700, color: '#1d2b56', marginBottom: '1rem' }}>Current Admin Accounts</p>
              {/* Hardcoded initial admin */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: '#f0fdf4', borderRadius: '10px', marginBottom: '0.5rem', border: '1px solid #bbf7d0' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#1d2b56', fontSize: '0.9rem' }}>1262253515@mitwpu.edu.in</span>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.72rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>PRIMARY ADMIN</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>PRN: 1262253515</span>
              </div>
              {adminEmails.map((entry: any) => (
                <div key={entry._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '10px', marginBottom: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#1d2b56', fontSize: '0.9rem' }}>{entry.email}</span>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>Granted by PRN: {entry.grantedBy}</span>
                  </div>
                  <button
                    onClick={async () => {
                      try { await removeAdminEmail({ email: entry.email }); showToast('Admin access removed.'); }
                      catch (e: any) { showToast(e.message, 'error'); }
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.25rem' }}
                    title="Remove admin access"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {adminEmails.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No additional admins added yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
