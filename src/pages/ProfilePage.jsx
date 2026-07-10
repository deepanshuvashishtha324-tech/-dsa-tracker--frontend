import React, { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { motion } from 'framer-motion'

const css = `
  .prof-page { display:flex; flex-direction:column; gap:20px; max-width:640px; }
  .prof-header h1 { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:-0.03em; color:var(--text); }
  .prof-header p  { font-size:12px; color:var(--muted); margin-top:3px; }

  /* PROFILE CARD */
  .prof-card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:24px; position:relative; overflow:hidden; }
  .prof-card-glow { position:absolute; inset:0; background:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.08) 0%,transparent 60%); pointer-events:none; }
  .prof-card-line { position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,var(--accent),rgba(99,102,241,0.2),transparent); }
  .prof-avatar-row { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
  .prof-avatar { width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--accent2)); display:flex; align-items:center; justify-content:center; font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700; color:white; flex-shrink:0; box-shadow:0 0 20px rgba(99,102,241,0.3); }
  .prof-avatar-info h2 { font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:700; color:var(--text); }
  .prof-avatar-info p  { font-size:12px; color:var(--muted); margin-top:2px; }

  .prof-field { margin-bottom:16px; }
  .prof-field label { display:block; font-size:11px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
  .prof-input { width:100%; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--text); font-family:'Inter',sans-serif; font-size:13px; outline:none; transition:border-color 0.15s; }
  .prof-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
  .prof-input::placeholder { color:var(--muted); }
  .prof-input:disabled { opacity:0.5; cursor:not-allowed; }
  .prof-input-wrap { position:relative; }
  .prof-input-prefix { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:13px; color:var(--muted); pointer-events:none; }
  .prof-input-padded { padding-left:28px; }
  .prof-hint { font-size:11px; color:var(--muted); margin-top:4px; }
  .prof-hint.success { color:var(--green); }
  .prof-hint.error   { color:var(--red); }

  .prof-save-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:8px; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; box-shadow:0 0 16px rgba(99,102,241,0.3); }
  .prof-save-btn:hover { background:var(--accent2); transform:translateY(-1px); }
  .prof-save-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

  /* SHARE CARD */
  .prof-share-card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:22px; }
  .prof-share-title { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; color:var(--text); margin-bottom:14px; }
  .prof-url-box { display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:9px; }
  .prof-url-text { flex:1; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--accent3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .prof-copy-btn { padding:6px 14px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); border-radius:7px; font-size:11px; font-weight:600; color:var(--accent3); cursor:pointer; transition:all 0.15s; white-space:nowrap; }
  .prof-copy-btn:hover { background:rgba(99,102,241,0.2); }
  .prof-open-btn { display:flex; align-items:center; gap:6px; margin-top:10px; padding:8px 14px; background:transparent; border:1px solid var(--border); border-radius:8px; font-size:12px; font-weight:500; color:var(--muted); cursor:pointer; transition:all 0.15s; text-decoration:none; }
  .prof-open-btn:hover { color:var(--text); border-color:#2E2E45; }

  .prof-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }
`

function isValidUsername(u) {
  return /^[a-z0-9_-]{3,20}$/.test(u)
}

export default function ProfilePage({ user, computed }) {
  const [name, setName]           = useState(user?.displayName || '')
  const [username, setUsername]   = useState('')
  const [usernameStatus, setUsernameStatus] = useState('') // 'checking' | 'available' | 'taken' | 'invalid'
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [copied, setCopied]       = useState(false)
  const [currentUsername, setCurrentUsername] = useState('')

  const profileUrl = currentUsername
    ? `${window.location.origin}/u/${currentUsername}`
    : null

  // Load existing profile
  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          const data = snap.data()
          setName(data.name || user.displayName || '')
          setUsername(data.username || '')
          setCurrentUsername(data.username || '')
        }
      } catch(e) { console.error(e) }
    }
    load()
  }, [user])

  // Username validation
  useEffect(() => {
    if (!username || username === currentUsername) { setUsernameStatus(''); return }
    if (!isValidUsername(username)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, 'usernames', username))
        setUsernameStatus(snap.exists() ? 'taken' : 'available')
      } catch(e) { setUsernameStatus('') }
    }, 500)
    return () => clearTimeout(timer)
  }, [username, currentUsername])

  const handleSave = async () => {
    if (!name.trim()) return
    if (username && username !== currentUsername && usernameStatus !== 'available') return
    setSaving(true)
    try {
      // Update Firebase Auth display name
      await updateProfile(auth.currentUser, { displayName: name.trim() })

      // Update Firestore user doc
      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        email: user.email,
        username: username || null,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      // Reserve username in separate collection
      if (username && username !== currentUsername) {
        // Release old username
        if (currentUsername) {
          await updateDoc(doc(db, 'usernames', currentUsername), { uid: null }).catch(() => {})
        }
        // Claim new username
        await setDoc(doc(db, 'usernames', username), { uid: user.uid })
        setCurrentUsername(username)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleCopy = () => {
    if (!profileUrl) return
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const usernameHint = () => {
    if (!username || username === currentUsername) return null
    if (usernameStatus === 'checking')  return <div className="prof-hint">Checking availability...</div>
    if (usernameStatus === 'available') return <div className="prof-hint success">✓ Username available!</div>
    if (usernameStatus === 'taken')     return <div className="prof-hint error">✗ Already taken</div>
    if (usernameStatus === 'invalid')   return <div className="prof-hint error">3-20 chars, only a-z 0-9 _ -</div>
    return null
  }

  const canSave = name.trim() && (!username || username === currentUsername || usernameStatus === 'available')

  return (
    <>
      <style>{css}</style>
      <motion.div className="prof-page" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.25}}>

        <div className="prof-header">
          <h1>Profile</h1>
          <p>Manage your public profile and shareable link</p>
        </div>

        {/* Profile Edit Card */}
        <div className="prof-card">
          <div className="prof-card-glow"/><div className="prof-card-line"/>

          <div className="prof-avatar-row">
            <div className="prof-avatar">
              {(name || user?.email || 'D')[0].toUpperCase()}
            </div>
            <div className="prof-avatar-info">
              <h2>{name || 'Your Name'}</h2>
              <p>{user?.email}</p>
            </div>
          </div>

          <div className="prof-field">
            <label>Display Name</label>
            <input className="prof-input" placeholder="Your full name"
              value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="prof-field">
            <label>Username <span style={{color:'var(--accent3)',fontSize:'10px',fontWeight:400,textTransform:'none'}}>(for public profile URL)</span></label>
            <div className="prof-input-wrap">
              <span className="prof-input-prefix">@</span>
              <input className="prof-input prof-input-padded"
                placeholder="deepanshu"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,''))}
              />
            </div>
            {usernameHint()}
            <div className="prof-hint">Letters, numbers, _ and - only. Min 3 chars.</div>
          </div>

          <button className="prof-save-btn" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? <><span className="prof-spinner"/> Saving...</> : saved ? '✓ Saved!' : 'Save Profile'}
          </button>
        </div>

        {/* Share Card */}
        <div className="prof-share-card">
          <div className="prof-share-title">🔗 Public Profile Link</div>
          {!currentUsername ? (
            <div style={{fontSize:'13px',color:'var(--muted)',lineHeight:1.6}}>
              Set a username above to get your shareable profile link.<br/>
              <span style={{color:'var(--accent3)'}}>yoursite.com/u/yourname</span>
            </div>
          ) : (
            <>
              <div className="prof-url-box">
                <span className="prof-url-text">{profileUrl}</span>
                <button className="prof-copy-btn" onClick={handleCopy}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="prof-open-btn">
                <span>↗</span> Open Public Profile
              </a>
            </>
          )}
        </div>

        {/* Stats preview */}
        {computed && (
          <div className="prof-share-card">
            <div className="prof-share-title">📊 Your Stats (shown on public profile)</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginTop:'8px'}}>
              {[
                { label:'Solved', val: computed.solved },
                { label:'Streak', val: `${computed.streak} 🔥` },
                { label:'Accuracy', val: `${computed.accuracy}%` },
              ].map(s => (
                <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'18px',fontWeight:700,color:'var(--accent2)'}}>{s.val}</div>
                  <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'3px'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </motion.div>
    </>
  )
}