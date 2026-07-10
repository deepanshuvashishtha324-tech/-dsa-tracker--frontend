import React, { useState } from 'react'
import { auth, db } from '../firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
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
    top: -100px; right: -100px; pointer-events: none;
    animation: glow 4s ease-in-out infinite;
  }
  .auth-orb2 {
    position: absolute; width: 300px; height: 300px; border-radius: 50%;
    background: radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 70%);
    bottom: -80px; left: -80px; pointer-events: none;
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
    letter-spacing: -0.03em; color: var(--text); margin-bottom: 4px;
  }
  .auth-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
  .auth-field { margin-bottom: 14px; }
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
    font-size: 12px; color: #fb7185; margin-bottom: 14px;
  }
  .auth-success {
    padding: 10px 14px; background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.25); border-radius: 8px;
    font-size: 12px; color: #4ade80; margin-bottom: 14px;
  }
  .auth-footer { text-align: center; font-size: 13px; color: var(--muted); margin-top: 20px; }
  .auth-link { color: var(--accent2); text-decoration: none; font-weight: 500; }
  .auth-link:hover { color: var(--text); }
  .auth-divider { height: 1px; background: var(--border); margin: 20px 0; }
  .auth-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
  .auth-strength { display: flex; gap: 4px; margin-top: 6px; }
  .auth-strength-bar { height: 3px; flex: 1; border-radius: 2px; background: var(--border); transition: background 0.3s; }
  .auth-hint { font-size: 11px; color: var(--muted); margin-top: 4px; }

  @media (max-width: 480px) {
    .auth-card { padding: 28px 20px; margin: 16px; border-radius: 16px; }
    .auth-title { font-size: 20px; }
  }
`

function getPasswordStrength(pwd) {
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

export default function Register() {
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const strength = getPasswordStrength(form.password)
  const strengthColors = ['#1E1E30','#F43F5E','#F97316','#FBBF24','#22C55E','#22C55E']
  const strengthLabels = ['','Weak','Fair','Good','Strong','Very Strong']

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setError('Please fill in all fields.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(cred.user, { displayName: form.name })
      // Save user profile to Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: form.name,
        email: form.email,
        username: null,
        createdAt: serverTimestamp(),
        level: 'Beginner',
        xp: 0,
      })
      navigate('/dashboard')
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email':        'Invalid email address.',
        'auth/weak-password':        'Password is too weak. Use at least 6 characters.',
      }
      setError(msgs[err.code] || 'Registration failed. Please try again.')
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

          <div className="auth-title">Create Developer Account</div>
          <div className="auth-sub">Join and start tracking your DSA journey</div>

          {error && <div className="auth-error">⚠ {error}</div>}

          <form onSubmit={handleRegister}>
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <input
                className="auth-input" type="text"
                placeholder="Alex Coder"
                value={form.name} onChange={e => set('name', e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <input
                className="auth-input" type="email"
                placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input" type="password"
                placeholder="Min 6 characters"
                value={form.password} onChange={e => set('password', e.target.value)}
                autoComplete="new-password"
              />
              {form.password.length > 0 && (
                <>
                  <div className="auth-strength">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="auth-strength-bar"
                        style={{ background: i <= strength ? strengthColors[strength] : 'var(--border)' }}/>
                    ))}
                  </div>
                  <div className="auth-hint">{strengthLabels[strength]}</div>
                </>
              )}
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? <><span className="auth-spinner"/> Creating account...</> : 'Register Account →'}
            </button>
          </form>

          <div className="auth-divider"/>
          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign In</Link>
          </div>
        </div>
      </div>
    </>
  )
}