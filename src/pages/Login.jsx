import React, { useState } from 'react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate, Link } from 'react-router-dom'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#08080E; --surface:#0F0F1A; --card:#13131F; --border:#1E1E30;
    --accent:#6366F1; --accent2:#818CF8; --text:#F1F5F9; --muted:#64748B;
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes glow { 0%,100%{opacity:0.5} 50%{opacity:1} }

  .auth-bg {
    min-height: 100vh; width: 100%;
    background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif;
    position: relative; overflow: hidden;
  }
  .auth-orb1 {
    position: absolute; width: 400px; height: 400px; border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
    top: -100px; left: -100px; pointer-events: none;
    animation: glow 4s ease-in-out infinite;
  }
  .auth-orb2 {
    position: absolute; width: 300px; height: 300px; border-radius: 50%;
    background: radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 70%);
    bottom: -80px; right: -80px; pointer-events: none;
    animation: glow 4s ease-in-out infinite 2s;
  }
  .auth-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 20px; padding: 40px 36px;
    width: 100%; max-width: 400px;
    animation: fadeUp 0.4s ease;
    position: relative; z-index: 1;
  }
  .auth-logo {
    display: flex; align-items: center; gap: 8px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 15px; font-weight: 700; color: var(--text);
    margin-bottom: 28px;
  }
  .auth-logo-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 12px var(--accent);
  }
  .auth-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 24px; font-weight: 700;
    letter-spacing: -0.03em; color: var(--text);
    margin-bottom: 4px;
  }
  .auth-sub { font-size: 13px; color: var(--muted); margin-bottom: 28px; }
  .auth-field { margin-bottom: 16px; }
  .auth-label {
    display: block; font-size: 11px; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--muted); margin-bottom: 6px;
  }
  .auth-input {
    width: 100%; padding: 11px 14px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 9px; color: var(--text);
    font-family: 'Inter', sans-serif; font-size: 13px;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .auth-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
  .auth-input::placeholder { color: var(--muted); }
  .auth-btn {
    width: 100%; padding: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: white; border: none; border-radius: 9px;
    font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
    cursor: pointer; margin-top: 8px;
    box-shadow: 0 0 24px rgba(99,102,241,0.3);
    transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .auth-btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 0 32px rgba(99,102,241,0.45); }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .auth-error {
    padding: 10px 14px; background: rgba(244,63,94,0.1);
    border: 1px solid rgba(244,63,94,0.25); border-radius: 8px;
    font-size: 12px; color: #fb7185; margin-bottom: 16px;
  }
  .auth-footer { text-align: center; font-size: 13px; color: var(--muted); margin-top: 20px; }
  .auth-link { color: var(--accent2); text-decoration: none; font-weight: 500; }
  .auth-link:hover { color: var(--text); }
  .auth-divider { height: 1px; background: var(--border); margin: 20px 0; }
  .auth-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
  .auth-brand { font-size: 11px; color: var(--muted); text-align: right; font-style: italic; margin-bottom: 24px; }

  @media (max-width: 480px) {
    .auth-card { padding: 28px 20px; margin: 16px; border-radius: 16px; }
    .auth-title { font-size: 20px; }
    .auth-brand { font-size: 10px; }
  }
`

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err) {
      const msgs = {
        'auth/user-not-found':  'No account found with this email.',
        'auth/wrong-password':  'Incorrect password. Try again.',
        'auth/invalid-email':   'Invalid email address.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
      }
      setError(msgs[err.code] || 'Login failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{css}</style>
      <div className="auth-bg">
        <div className="auth-orb1"/><div className="auth-orb2"/>
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-dot"/>
            DSA Tracker
          </div>

          <div className="auth-title">Welcome Back, Coder</div>
          <div className="auth-sub">Track your DSA journey with AI precision</div>
          <div className="auth-brand">by Deepanshu 🚀 | Grind. Track. Grow.</div>

          {error && <div className="auth-error">⚠ {error}</div>}

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <input
                className="auth-input" type="email"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input" type="password"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? <><span className="auth-spinner"/> Signing in...</> : 'Initialize Session →'}
            </button>
          </form>

          <div className="auth-divider"/>
          <div className="auth-footer">
            New to the platform?{' '}
            <Link to="/register" className="auth-link">Create an account</Link>
          </div>
        </div>
      </div>
    </>
  )
}