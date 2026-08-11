import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Link } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';
import { LogOut, Plus, MapPin, Calendar, CheckCircle, Search } from 'lucide-react';
import mitLogo from '../assets/mit_logo.png';

export default function Dashboard() {
  const items = useQuery(api.items.getAllItems) || [];
  const user = useQuery(api.users.current);
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

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f6fa' }}>
      {/* Official MIT-WPU Header Bar */}
      <nav className="wpu-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo-circle-sm">
            <img src={mitLogo} alt="MIT World Peace University" />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--wpu-navy)', letterSpacing: '-0.01em' }}>
              Lost & Found Portal
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              College Administration System (CAS)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--wpu-navy)' }}>
              {user?.name || 'Student'} (PRN: {user?.prn || '---'})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.email}</div>
          </div>
          
          <Link to="/report" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <Plus size={16} /> Report Item
          </Link>
          
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
            onClick={() => signOut()} 
            title="Sign Out"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container" style={{ padding: '2.5rem 1.5rem', flex: 1 }}>
        
        {/* Title & Search Bar */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1d2b56', letterSpacing: '-0.02em' }}>
              Campus Feed & Reports
            </h1>
            <p style={{ marginTop: '0.2rem', fontSize: '0.98rem', color: 'var(--text-secondary)' }}>
              Search for items reported across MIT WPU Pune campus buildings.
            </p>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search location, item..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.2rem', padding: '0.5rem 0.8rem 0.5rem 2.2rem', borderRadius: 'var(--radius-full)' }}
              />
            </div>

            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 'var(--radius-full)', padding: '3px' }}>
              <button 
                onClick={() => setFilterType('all')} 
                style={{ 
                  border: 'none', 
                  background: filterType === 'all' ? 'var(--wpu-navy)' : 'transparent', 
                  color: filterType === 'all' ? '#fff' : 'var(--text-primary)',
                  padding: '0.4rem 0.9rem', 
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: filterType === 'all' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType('lost')} 
                style={{ 
                  border: 'none', 
                  background: filterType === 'lost' ? '#dc2626' : 'transparent', 
                  color: filterType === 'lost' ? '#fff' : 'var(--text-primary)',
                  padding: '0.4rem 0.9rem', 
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: filterType === 'lost' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Lost
              </button>
              <button 
                onClick={() => setFilterType('found')} 
                style={{ 
                  border: 'none', 
                  background: filterType === 'found' ? '#16a34a' : 'transparent', 
                  color: filterType === 'found' ? '#fff' : 'var(--text-primary)',
                  padding: '0.4rem 0.9rem', 
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: filterType === 'found' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
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
                {item.imageUrl && (
                  <div style={{ width: '100%', height: '220px', background: '#f8fafc', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                
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
                      <Calendar size={15} color="var(--wpu-navy)" /> <strong style={{ color: 'var(--wpu-navy)' }}>Date:</strong> <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
