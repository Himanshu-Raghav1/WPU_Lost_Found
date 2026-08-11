import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import mitLogo from '../assets/mit_logo.png';

export default function Login() {
  const { signIn } = useAuthActions();
  const setPasswordAndProfile = useMutation(api.users.setPasswordAndProfile);

  // Mode: 'signIn' | 'signUp'
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  // Sign-Up: 2 steps
  // Step 1 → collect Name, PRN, Email, Password (send OTP)
  // Step 2 → enter OTP → verify + save profile atomically → /dashboard
  const [signUpStep, setSignUpStep] = useState<1 | 2>(1);

  // Sign-In sub-method
  const [signInMethod, setSignInMethod] = useState<'password' | 'otp'>('password');
  const [signInOtpStep, setSignInOtpStep] = useState<'request' | 'verify'>('request');

  // Shared form fields
  const [name, setName] = useState('');
  const [prn, setPrn] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (val: string) => {
    if (!val.trim().toLowerCase().endsWith('@mitwpu.edu.in')) {
      setError('You must use your official @mitwpu.edu.in email address.');
      return false;
    }
    return true;
  };

  // ─────────────────────────────────────────────
  // SIGN-UP STEP 1 – collect all data, send OTP
  // ─────────────────────────────────────────────
  const handleSignUpStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!prn.trim())  { setError('Please enter your Student PRN.'); return; }
    if (!validateEmail(email)) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match. Please retype.'); return; }

    setLoading(true);
    try {
      await signIn('resend-otp', { email: email.trim() });
      setSignUpStep(2);
      setInfo(`A 6-digit verification code was sent to ${email.trim()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // SIGN-UP STEP 2 – verify OTP, save profile + password, go to dashboard
  // ─────────────────────────────────────────────
  const handleSignUpStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) { setError('Please enter the 6-digit verification code.'); return; }

    setLoading(true);
    try {
      // 1. Verify OTP — user is now authenticated on the server
      await signIn('resend-otp', { email: email.trim(), code: code.trim() });

      // 2. Immediately save Name, PRN & hashed password before React flips
      //    isAuthenticated and /login redirects to /dashboard.
      //    The Convex client already holds the new JWT token at this point.
      await setPasswordAndProfile({
        email:    email.trim(),
        prn:      prn.trim(),
        name:     name.trim(),
        password: password,
      });

      // 3. Hard navigate so the new auth session is fully applied
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Could not verify code. Check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // SIGN-IN – PASSWORD
  // ─────────────────────────────────────────────
  const handleSignInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      await signIn('password', { email: email.trim(), password, flow: 'signIn' });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // SIGN-IN – OTP (for users who prefer code login)
  // ─────────────────────────────────────────────
  const handleSignInOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      await signIn('resend-otp', { email: email.trim() });
      setSignInOtpStep('verify');
      setInfo(`A 6-digit code was sent to ${email.trim()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignInOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('Please enter the 6-digit code.'); return; }

    setLoading(true);
    try {
      await signIn('resend-otp', { email: email.trim(), code: code.trim() });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'signIn' | 'signUp') => {
    setMode(m);
    setSignUpStep(1);
    setSignInOtpStep('request');
    setError('');
    setInfo('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1.5rem', background: '#ffffff' }}>
      <div className="wpu-panel animate-fade-in" style={{ width: '100%', maxWidth: '460px', boxShadow: '0 4px 32px rgba(29,43,86,0.10)', border: '1px solid #e2e8f0' }}>

        {/* Header */}
        <div style={{ background: '#ffffff', padding: '2rem 1.5rem', textAlign: 'center', borderBottom: '3px solid #1d2b56' }}>
          <div className="logo-circle" style={{ margin: '0 auto 1.25rem auto', width: '72px', height: '72px', borderWidth: '3px' }}>
            <img src={mitLogo} alt="MIT World Peace University" />
          </div>
          <h1 style={{ color: '#1d2b56', fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            MIT-WPU Lost &amp; Found Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Official Campus Administration System
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '2rem 2.25rem', background: '#ffffff' }}>

          {/* Tab Switch */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            {(['signIn', 'signUp'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: mode === m ? 'var(--wpu-navy)' : 'transparent',
                  fontWeight: mode === m ? 700 : 500,
                  color: mode === m ? '#ffffff' : '#64748b',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: mode === m ? '0 2px 6px rgba(29,43,86,0.15)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'signIn' ? 'Sign In' : 'Sign Up (Verified)'}
              </button>
            ))}
          </div>

          {/* ════════════════════════════ SIGN UP ════════════════════════════ */}
          {mode === 'signUp' && (
            <div>
              {/* Step Indicator */}
              <div className="step-indicator">
                <div className={`step-item ${signUpStep >= 1 ? (signUpStep > 1 ? 'completed' : 'active') : ''}`}>1</div>
                <div className={`step-item ${signUpStep >= 2 ? 'active' : ''}`}>2</div>
              </div>

              {/* ── STEP 1: All details + password ── */}
              {signUpStep === 1 && (
                <form onSubmit={handleSignUpStep1}>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'center' }}>
                    Enter your details and create a password. We'll send a verification code to your email.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={name}
                      onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Student PRN</label>
                    <input type="text" className="form-input" value={prn}
                      onChange={e => setPrn(e.target.value)} placeholder="e.g. 1032210000" required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">MIT WPU Email</label>
                    <input type="email" className="form-input" value={email}
                      onChange={e => setEmail(e.target.value)} placeholder="student@mitwpu.edu.in" required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Create Password</label>
                    <input type="password" className="form-input" value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input type="password" className="form-input" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} placeholder="Retype password" required minLength={6} />
                  </div>

                  <button type="submit" className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                    {loading ? 'Sending OTP Code...' : 'Send Verification Code'}
                  </button>
                </form>
              )}

              {/* ── STEP 2: Verify OTP ── */}
              {signUpStep === 2 && (
                <form onSubmit={handleSignUpStep2}>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', textAlign: 'center' }}>
                      {info}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">6-Digit Verification Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      autoFocus
                      style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.35em', fontWeight: 700 }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                    {loading ? 'Verifying & Creating Account...' : 'Verify & Complete Registration'}
                  </button>

                  <button type="button" onClick={() => { setSignUpStep(1); setCode(''); setError(''); }}
                    className="btn btn-outline"
                    style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', fontSize: '0.85rem' }}>
                    ← Back to Edit Details
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ════════════════════════════ SIGN IN ════════════════════════════ */}
          {mode === 'signIn' && (
            <div>
              {/* Method tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {(['password', 'otp'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setSignInMethod(m); setSignInOtpStep('request'); setError(''); setInfo(''); setCode(''); }}
                    style={{
                      flex: 1, padding: '0.4rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      background: signInMethod === m ? 'var(--wpu-navy)' : '#fff',
                      color: signInMethod === m ? '#fff' : 'var(--text-primary)',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {m === 'password' ? 'Password Login' : 'Email OTP'}
                  </button>
                ))}
              </div>

              {/* Password sign-in */}
              {signInMethod === 'password' && (
                <form onSubmit={handleSignInPassword}>
                  <div className="form-group">
                    <label className="form-label">MIT WPU Email</label>
                    <input type="email" className="form-input" value={email}
                      onChange={e => setEmail(e.target.value)} placeholder="student@mitwpu.edu.in" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-input" value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <button type="submit" className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              )}

              {/* OTP sign-in */}
              {signInMethod === 'otp' && (
                <div>
                  {signInOtpStep === 'request' ? (
                    <form onSubmit={handleSignInOtpRequest}>
                      <div className="form-group">
                        <label className="form-label">MIT WPU Email</label>
                        <input type="email" className="form-input" value={email}
                          onChange={e => setEmail(e.target.value)} placeholder="student@mitwpu.edu.in" required />
                      </div>
                      <button type="submit" className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                        {loading ? 'Sending OTP...' : 'Send OTP Code'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignInOtpVerify}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
                        {info}
                      </p>
                      <div className="form-group">
                        <label className="form-label">6-Digit Code</label>
                        <input
                          type="text"
                          className="form-input"
                          value={code}
                          onChange={e => setCode(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                          required
                          autoFocus
                          style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.3em', fontWeight: 700 }}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify & Sign In'}
                      </button>
                      <button type="button"
                        onClick={() => { setSignInOtpStep('request'); setCode(''); setError(''); }}
                        className="btn btn-outline"
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', fontSize: '0.85rem' }}>
                        ← Change Email
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error / Info messages */}
          {error && (
            <p className="text-error" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
