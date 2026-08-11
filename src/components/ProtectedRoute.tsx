import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthActions } from '@convex-dev/auth/react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.current);
  const updatePrn = useMutation(api.users.updatePrn);
  const { signOut } = useAuthActions();
  
  const [nameInput, setNameInput] = useState('');
  const [prnInput, setPrnInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: '#f5f5f7' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading student profile...</p>
      </div>
    );
  }

  // PRN or Name missing (e.g. after Google or Resend OTP login)
  if (user !== null && (!user.prn || !user.name)) {
    const handleProfileSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const prnToSave = user.prn || prnInput.trim();
      const nameToSave = user.name || nameInput.trim();

      if (!prnToSave) return;
      setLoading(true);
      try {
        await updatePrn({ prn: prnToSave, name: nameToSave });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: '1.5rem', background: '#f5f5f7' }}>
        <div className="apple-panel animate-fade-in" style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Complete Your Profile</h2>
          <p style={{ marginTop: '0.4rem', marginBottom: '2rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Please confirm your Name and Student PRN to access the MIT WPU Lost & Found dashboard.
          </p>
          
          <form onSubmit={handleProfileSubmit}>
            {!user.name && (
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>
            )}

            {!user.prn && (
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Student PRN</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={prnInput}
                  onChange={(e) => setPrnInput(e.target.value)}
                  placeholder="e.g. 1032210000"
                  required
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Saving Profile...' : 'Continue to Campus Feed'}
            </button>
          </form>

          <button 
            className="btn btn-outline" 
            style={{ width: '100%', marginTop: '1rem', padding: '0.65rem' }}
            onClick={() => signOut()}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
