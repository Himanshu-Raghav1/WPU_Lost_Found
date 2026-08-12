import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Link } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';
import { LogOut, Plus, MapPin, Calendar, CheckCircle, Search, Shield, Lock } from 'lucide-react';
import mitLogo from '../assets/mit_logo.png';

export default function Dashboard() {
  const items = useQuery(api.items.getAllItems) || [];
  const user = useQuery(api.users.current);
  const isAdmin = useQuery(api.admin.isAdmin);
  const resolveItem = useMutation(api.items.resolveItem);
  const { signOut } = useAuthActions();

  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleResolve = async (itemId: any) => {
    try {
      await resolveItem({ itemId });
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredItems = items.filter((item) => {
    if (!item) return false;
    const title = item.title || '';
    const description = item.description || '';
    const location = item.location || '';
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Official MIT-WPU Header Bar */}
      <nav className="wpu-nav">
        <div className="wpu-nav-brand">
          <div className="logo-circle-sm">
            <img src={mitLogo} alt="MIT World Peace University" />
          </div>
          <div>
            <div className="wpu-nav-title">
              Lost &amp; Found Portal
            </div>
            <div className="wpu-nav-subtitle">
              College Administration System (CAS)
            </div>
          </div>
        </div>

        <div className="wpu-nav-user">
          <div className="wpu-nav-user-info">
            <div className="wpu-user-name">
              {user?.name || 'Student'} (PRN: {user?.prn || '---'})
            </div>
            <div className="wpu-user-email">{user?.email}</div>
          </div>
          
          <div className="wpu-nav-actions">
            {isAdmin && (
              <Link to="/admin" className="btn btn-sm" style={{ background: '#7c3aed', color: '#fff' }}>
                <Shield size={16} /> Admin Panel
              </Link>
            )}
            <Link to="/report" className="btn btn-primary btn-sm">
              <Plus size={16} /> Report Item
            </Link>
            
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => signOut()} 
              title="Sign Out"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container dashboard-main">
        
        {/* Title & Search Bar */}
        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <h1 className="dashboard-title">
              Campus Feed &amp; Reports
            </h1>
            <p className="dashboard-subtitle">
              Search for items reported across MIT WPU Pune campus buildings.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="dashboard-search-filters">
            <div className="dashboard-search-wrapper">
              <Search size={16} className="dashboard-search-icon" />
              <input 
                type="text" 
                className="form-input dashboard-search-input" 
                placeholder="Search location, item..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="dashboard-filter-tabs">
              <button 
                onClick={() => setFilterType('all')} 
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType('lost')} 
                className={`filter-btn filter-lost ${filterType === 'lost' ? 'active' : ''}`}
              >
                Lost
              </button>
              <button 
                onClick={() => setFilterType('found')} 
                className={`filter-btn filter-found ${filterType === 'found' ? 'active' : ''}`}
              >
                Found
              </button>
            </div>
          </div>
        </div>

        {/* Item Cards Grid */}
        {filteredItems.length === 0 ? (
          <div className="wpu-card" style={{ padding: '4rem 2rem', textAlign: 'center', background: '#fff' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--wpu-navy)' }}>No items reported yet</h3>
            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Be the first student to report a lost or found item on campus.
            </p>
          </div>
        ) : (
          <div className="grid-2">
            {filteredItems.map((item) => (
              <div key={item._id} className="wpu-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Found items: image is hidden from public (only admin sees it via backend) */}
                {item.type === 'found' && item.imageId && !item.imageUrl ? (
                  <div style={{ width: '100%', padding: '0.85rem 1.25rem', background: '#f0f9ff', borderBottom: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Lock size={15} color="#0369a1" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0369a1' }}>Photo hidden for anti-theft security — verified by Admin</span>
                  </div>
                ) : item.imageUrl ? (
                  <div style={{ width: '100%', height: '220px', background: '#f8fafc', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
                    <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : null}

                
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                      {item.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      {item.category.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', fontWeight: 700, color: 'var(--wpu-navy)' }}>{item.title}</h3>
                  
                  <p style={{ fontSize: '0.92rem', marginBottom: '1.25rem', flex: 1, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={15} color="var(--wpu-navy)" /> <strong style={{ color: 'var(--wpu-navy)' }}>Location:</strong> <span>{item.location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={15} color="var(--wpu-navy)" /> <strong style={{ color: 'var(--wpu-navy)' }}>Date:</strong> <span>{formatDate(item.date)}</span>
                    </div>
                  </div>

                  <div className="wpu-card-footer" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      Reporter: {item.reporterName || 'Student'} (PRN: {item.reporterPrn || '---'})
                    </span>
                    
                    {item.status === 'resolved' ? (
                      <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 700 }}>
                        <CheckCircle size={16} /> Resolved
                      </span>
                    ) : (
                      user?._id === item.reporterId && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleResolve(item._id)}
                        >
                          Mark Resolved
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
