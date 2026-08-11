import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ArrowLeft, Upload, Check } from 'lucide-react';
import mitLogo from '../assets/mit_logo.png';

export default function ReportItem() {
  const navigate = useNavigate();
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createItem = useMutation(api.items.createItem);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('electronics');
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let imageId = undefined;

      if (file) {
        // Step 1: Get upload URL from Convex
        const postUrl = await generateUploadUrl();

        // Step 2: POST the file to Convex Storage
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        const { storageId } = await result.json();
        imageId = storageId;
      }

      // Step 3: Create the item record
      await createItem({
        title,
        description,
        category,
        type,
        location,
        date,
        imageId,
      });

      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit item report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fa', paddingBottom: '3rem' }}>
      {/* Top Banner */}
      <nav className="wpu-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo-circle-sm">
            <img src={mitLogo} alt="MIT World Peace University" />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--wpu-navy)' }}>
              Lost & Found Portal
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Report Item Form
            </div>
          </div>
        </div>

        <Link to="/dashboard" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Feed
        </Link>
      </nav>

      <div className="container" style={{ maxWidth: '650px', marginTop: '2rem' }}>
        <div className="wpu-panel animate-fade-in" style={{ padding: '2.5rem' }}>
          <div style={{ marginBottom: '2rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--wpu-navy)', letterSpacing: '-0.02em' }}>
              Official Item Report Form
            </h1>
            <p style={{ marginTop: '0.3rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Provide accurate details so MIT WPU students and security can identify the item.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Type selector */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Report Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setType('lost')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: type === 'lost' ? '2px solid #dc2626' : '1px solid var(--border-color)',
                    background: type === 'lost' ? '#fef2f2' : '#fff',
                    color: type === 'lost' ? '#dc2626' : 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {type === 'lost' && <Check size={16} />} I Lost Something
                </button>

                <button
                  type="button"
                  onClick={() => setType('found')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: type === 'found' ? '2px solid #16a34a' : '1px solid var(--border-color)',
                    background: type === 'found' ? '#f0fdf4' : '#fff',
                    color: type === 'found' ? '#16a34a' : 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {type === 'found' && <Check size={16} />} I Found Something
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Item Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Blue HP Laptop Charger / MIT WPU ID Card"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing & Bags</option>
                  <option value="id-card">ID Card & Documents</option>
                  <option value="keys">Keys & Wallets</option>
                  <option value="books">Stationery & Books</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Campus Location</label>
              <input
                type="text"
                className="form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Vyas Building, 3rd Floor Lab 304 /Encave Chanakya"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description & Identification Details</label>
              <textarea
                className="form-input form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe distinguishing marks, color, brand, or where it can be claimed..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Photo Attachment (Convex Storage)</label>
              <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.5rem', textAlign: 'center', background: '#f8fafc' }}>
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-upload" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  <Upload size={16} /> {file ? file.name : 'Choose Image File'}
                </label>
                {file && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--wpu-navy)', fontWeight: 600 }}>
                    Attached: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>

            {error && <p className="text-error" style={{ marginBottom: '1rem' }}>{error}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', marginTop: '1rem', fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Submitting Report...' : 'Publish Official Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
