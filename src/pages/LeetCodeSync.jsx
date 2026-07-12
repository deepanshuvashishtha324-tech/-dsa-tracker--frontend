import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore'

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'

const css = `
  .lc-page { display:flex; flex-direction:column; gap:24px; width:100%; }
  .lc-header h1 { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:-0.03em; color:var(--text); }
  .lc-header p  { font-size:12px; color:var(--muted); margin-top:3px; }
  .lc-glass { background:rgba(19,19,31,0.7); border:1px solid rgba(99,102,241,0.2); border-radius:16px; padding:28px; position:relative; overflow:hidden; backdrop-filter:blur(12px); }
  .lc-glass::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 0% 0%,rgba(99,102,241,0.1) 0%,transparent 60%); pointer-events:none; }
  .lc-glass-line { position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,rgba(99,102,241,0.8),rgba(129,140,248,0.2),transparent); }

  .lc-tabs { display:flex; gap:4px; margin-bottom:20px; background:var(--surface); padding:4px; border-radius:10px; }
  .lc-tab { flex:1; padding:8px 12px; border:none; border-radius:7px; font-family:'Inter',sans-serif; font-size:12px; font-weight:500; cursor:pointer; transition:all 0.15s; background:transparent; color:var(--muted); }
  .lc-tab.active { background:var(--card); color:var(--text); box-shadow:0 1px 3px rgba(0,0,0,0.3); }

  .lc-input-row { display:flex; gap:10px; margin-bottom:16px; }
  .lc-input-wrap { flex:1; position:relative; }
  .lc-input-prefix { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:12px; color:var(--muted); pointer-events:none; font-family:'JetBrains Mono',monospace; white-space:nowrap; }
  .lc-input { width:100%; padding:11px 12px 11px 148px; background:rgba(8,8,14,0.6); border:1px solid rgba(99,102,241,0.2); border-radius:10px; color:var(--text); font-family:'Inter',sans-serif; font-size:13px; outline:none; transition:all 0.2s; }
  .lc-input:focus { border-color:rgba(99,102,241,0.6); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
  .lc-input::placeholder { color:#475569; }
  .lc-input-full { width:100%; padding:11px 12px; background:rgba(8,8,14,0.6); border:1px solid rgba(99,102,241,0.2); border-radius:10px; color:var(--text); font-family:'JetBrains Mono',monospace; font-size:11px; outline:none; transition:all 0.2s; margin-bottom:10px; }
  .lc-input-full:focus { border-color:rgba(99,102,241,0.6); }
  .lc-input-full::placeholder { color:#475569; font-family:'Inter',sans-serif; }

  .lc-sync-btn { padding:11px 20px; background:linear-gradient(135deg,#6366F1,#818CF8); border:none; border-radius:10px; color:white; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; white-space:nowrap; display:flex; align-items:center; gap:8px; box-shadow:0 0 20px rgba(99,102,241,0.3); }
  .lc-sync-btn:hover { transform:translateY(-1px); box-shadow:0 0 28px rgba(99,102,241,0.5); }
  .lc-sync-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .lc-sync-btn-full { width:100%; padding:11px; background:linear-gradient(135deg,#6366F1,#818CF8); border:none; border-radius:10px; color:white; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 0 20px rgba(99,102,241,0.3); margin-bottom:16px; }
  .lc-sync-btn-full:hover { transform:translateY(-1px); }
  .lc-sync-btn-full:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

  .lc-stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
  .lc-stat { background:rgba(8,8,14,0.5); border:1px solid rgba(30,30,48,0.8); border-radius:10px; padding:14px; text-align:center; }
  .lc-stat-val { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:var(--accent2); line-height:1; }
  .lc-stat-label { font-size:10px; color:var(--muted); margin-top:4px; }

  .lc-filter-row { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; align-items:center; }
  .lc-filter-btn { padding:5px 12px; border-radius:20px; border:1px solid rgba(30,30,48,0.8); background:transparent; color:var(--muted); font-size:11px; font-weight:500; cursor:pointer; transition:all 0.15s; }
  .lc-filter-btn.active { background:rgba(99,102,241,0.15); border-color:rgba(99,102,241,0.4); color:var(--accent3); }
  .lc-select-all { margin-left:auto; font-size:11px; color:var(--accent3); cursor:pointer; }
  .lc-select-all:hover { text-decoration:underline; }

  .lc-problems { display:flex; flex-direction:column; gap:5px; max-height:380px; overflow-y:auto; padding-right:4px; }
  .lc-problems::-webkit-scrollbar { width:4px; }
  .lc-problems::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .lc-problem-row { display:flex; align-items:center; gap:12px; padding:9px 12px; background:rgba(8,8,14,0.4); border:1px solid rgba(30,30,48,0.6); border-radius:8px; transition:all 0.15s; cursor:pointer; }
  .lc-problem-row:hover { border-color:rgba(99,102,241,0.3); background:rgba(99,102,241,0.04); }
  .lc-problem-row.selected { border-color:rgba(99,102,241,0.35); background:rgba(99,102,241,0.07); }
  .lc-check { width:16px; height:16px; border-radius:4px; border:1px solid rgba(99,102,241,0.4); background:transparent; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s; }
  .lc-check.checked { background:var(--accent); border-color:var(--accent); }
  .lc-problem-name { flex:1; font-size:12px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .lc-diff { display:inline-flex; padding:2px 7px; border-radius:4px; font-size:10px; font-weight:600; flex-shrink:0; }
  .lc-diff-easy   { background:rgba(34,197,94,0.12);  color:#4ade80; }
  .lc-diff-medium { background:rgba(251,191,36,0.12); color:#fbbf24; }
  .lc-diff-hard   { background:rgba(244,63,94,0.12);  color:#fb7185; }
  .lc-already { font-size:10px; color:var(--green); flex-shrink:0; }

  .lc-import-btn { width:100%; padding:12px; margin-top:16px; background:linear-gradient(135deg,#22C55E,#16A34A); border:none; border-radius:10px; color:white; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 0 20px rgba(34,197,94,0.2); }
  .lc-import-btn:hover { transform:translateY(-1px); }
  .lc-import-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

  .lc-status { padding:12px 16px; border-radius:10px; font-size:13px; font-weight:500; display:flex; align-items:center; gap:8px; margin-bottom:16px; }
  .lc-status-success { background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.25); color:#4ade80; }
  .lc-status-error   { background:rgba(244,63,94,0.1);  border:1px solid rgba(244,63,94,0.25);  color:#fb7185; }
  .lc-status-info    { background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); color:var(--accent3); }

  .lc-progress-wrap { margin-bottom:16px; }
  .lc-progress-info { display:flex; justify-content:space-between; font-size:11px; color:var(--muted); margin-bottom:5px; }
  .lc-progress-bar { height:4px; background:var(--border); border-radius:3px; overflow:hidden; }
  .lc-progress-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:3px; transition:width 0.3s; }

  .lc-user-card { display:flex; align-items:center; gap:14px; padding:14px 16px; background:rgba(8,8,14,0.5); border:1px solid rgba(99,102,241,0.15); border-radius:10px; margin-bottom:16px; }
  .lc-user-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#F97316,#FBBF24); display:flex; align-items:center; justify-content:center; font-family:'Space Grotesk',sans-serif; font-size:16px; font-weight:700; color:white; flex-shrink:0; }
  .lc-user-name { font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:600; color:var(--text); }
  .lc-user-sub { font-size:11px; color:var(--muted); margin-top:2px; }

  .lc-steps { display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
  .lc-step { display:flex; gap:12px; align-items:flex-start; }
  .lc-step-num { width:22px; height:22px; border-radius:50%; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:var(--accent3); flex-shrink:0; margin-top:1px; }
  .lc-step-text { font-size:12px; color:#C4CCDC; line-height:1.6; }
  .lc-step-text code { background:rgba(99,102,241,0.1); padding:1px 5px; border-radius:3px; font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--accent2); }

  .lc-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.25); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }
  .lc-empty { text-align:center; padding:32px 20px; color:var(--muted); }
  .lc-empty-icon { font-size:36px; margin-bottom:10px; opacity:0.4; }

  @media(max-width:600px) {
    .lc-stats-row { grid-template-columns:1fr 1fr; }
    .lc-input-row { flex-direction:column; }
  }
`

const DIFF_MAP = { Easy:'Easy', Medium:'Medium', Hard:'Hard' }

export default function LeetCodeSync() {
  const [tab, setTab]             = useState('quick')
  const [username, setUsername]   = useState(() => localStorage.getItem('lc_username') || '')
  const [session, setSession]     = useState(() => localStorage.getItem('lc_session') || '')
  const [csrf, setCsrf]           = useState(() => localStorage.getItem('lc_csrf') || '')
  const [cookieSaved, setCookieSaved] = useState(() => !!localStorage.getItem('lc_session'))
  const [fetching, setFetching]   = useState(false)
  const [lcData, setLcData]       = useState(null)
  const [problems, setProblems]   = useState([])
  const [selected, setSelected]   = useState(new Set())
  const [filter, setFilter]       = useState('All')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState({ current:0, total:0 })
  const [status, setStatus]       = useState(null)
  const [existingNames, setExistingNames] = useState(new Set())

  const getExisting = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return new Set()
    const snap = await getDocs(query(collection(db,'problems'), where('userId','==',uid)))
    return new Set(snap.docs.map(d => d.data().name))
  }

  // Quick sync (no cookie - 20 problems)
  const fetchQuick = async () => {
    if (!username.trim()) return
    localStorage.setItem('lc_username', username.trim())
    setFetching(true); setStatus(null); setLcData(null); setProblems([])
    try {
      setStatus({ type:'info', msg:'Fetching from LeetCode...' })
      const res = await fetch(`${PROXY_URL}/leetcode/${username.trim()}`)
      if (!res.ok) throw new Error('User not found')
      const data = await res.json()

      setLcData({ username:data.username, name:data.name, ...data.stats })
      const probs = (data.problems||[]).map(p => ({
        id: p.id||p.slug, name:p.name, slug:p.slug,
        difficulty: DIFF_MAP[p.difficulty]||'Medium',
      }))

      const existing = await getExisting()
      setExistingNames(existing)
      setSelected(new Set(probs.filter(p=>!existing.has(p.name)).map(p=>String(p.id))))
      setProblems(probs)
      setStatus({ type:'info', msg:`“ Found ${probs.length} recent problems for @${data.username} (last 20 only)` })
    } catch(e) {
      setStatus({ type:'error', msg: e.message||'Failed to fetch' })
    } finally { setFetching(false) }
  }

  // Full sync with cookie
  const fetchFull = async () => {
    if (!session.trim() || !csrf.trim()) {
      setStatus({ type:'error', msg:'Please enter both LEETCODE_SESSION and csrftoken' })
      return
    }
    // Save to localStorage
    localStorage.setItem('lc_session', session.trim())
    localStorage.setItem('lc_csrf', csrf.trim())
    localStorage.setItem('lc_username', username.trim())
    setCookieSaved(true)
    setFetching(true); setStatus(null); setProblems([])
    try {
      setStatus({ type:'info', msg:'Fetching ALL solved problems via cookie...' })
      const res = await fetch(`${PROXY_URL}/leetcode/all-problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: session.trim(), csrf: csrf.trim() })
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      const probs = (data.problems||[]).map(p => ({
        id: p.id||p.slug, name:p.name, slug:p.slug,
        difficulty: DIFF_MAP[p.difficulty]||'Medium',
      }))

      const existing = await getExisting()
      setExistingNames(existing)
      setSelected(new Set(probs.filter(p=>!existing.has(p.name)).map(p=>String(p.id))))
      setProblems(probs)
      setStatus({ type:'info', msg:`“ Found ${probs.length} total solved problems!` })
    } catch(e) {
      setStatus({ type:'error', msg: e.message||'Failed. Check cookies and try again.' })
    } finally { setFetching(false) }
  }

  const toggleSelect = (id) => {
    setSelected(s => { const n=new Set(s); n.has(String(id))?n.delete(String(id)):n.add(String(id)); return n })
  }
  const toggleAll = () => {
    const ids = filteredProblems.map(p=>String(p.id))
    const allSel = ids.every(id=>selected.has(id))
    setSelected(s => { const n=new Set(s); if(allSel)ids.forEach(id=>n.delete(id)); else ids.forEach(id=>n.add(id)); return n })
  }

  const importSelected = async () => {
    const toImport = problems.filter(p=>selected.has(String(p.id))&&!existingNames.has(p.name))
    if (!toImport.length) { setStatus({type:'error',msg:'No new problems to import!'}); return }
    setImporting(true); setStatus(null); setProgress({current:0,total:toImport.length})
    try {
      const uid = auth.currentUser?.uid
      for (let i=0;i<toImport.length;i++) {
        const p = toImport[i]
        await addDoc(collection(db,'problems'), {
          name:p.name, difficulty:p.difficulty, topic:'LeetCode',
          status:'Solved', timeTaken:0, source:'leetcode',
          userId:uid||null, createdAt:serverTimestamp(),
        })
        setProgress({current:i+1,total:toImport.length})
      }
      setStatus({type:'success',msg:`“ Imported ${toImport.length} problems!`})
      setExistingNames(e=>new Set([...e,...toImport.map(p=>p.name)]))
      setSelected(new Set())
    } catch(e) {
      setStatus({type:'error',msg:'Import failed.'})
    } finally { setImporting(false) }
  }

  const filteredProblems = filter==='All'?problems:problems.filter(p=>p.difficulty===filter)
  const newCount = problems.filter(p=>selected.has(String(p.id))&&!existingNames.has(p.name)).length

  return (
    <>
      <style>{css}</style>
      <div className="lc-page">
        <div className="lc-header">
          <h1>LeetCode Sync</h1>
          <p>Import your solved problems from LeetCode</p>
        </div>

        <motion.div className="lc-glass" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>
          <div className="lc-glass-line"/>

          {/* Tabs */}
          <div className="lc-tabs">
            <button className={`lc-tab${tab==='quick'?' active':''}`} onClick={()=>{setTab('quick');setProblems([]);setStatus(null)}}>
               Quick Sync (Last 20)
            </button>
            <button className={`lc-tab${tab==='full'?' active':''}`} onClick={()=>{setTab('full');setProblems([]);setStatus(null)}}>
              ‘ Full Sync (All problems)
            </button>
          </div>

          {/* Quick Sync Tab */}
          {tab==='quick' && (
            <div>
              <div className="lc-input-row">
                <div className="lc-input-wrap">
                  <span className="lc-input-prefix">leetcode.com/u/</span>
                  <input className="lc-input" placeholder="your_username"
                    value={username} onChange={e=>setUsername(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&fetchQuick()}/>
                </div>
                <button className="lc-sync-btn" onClick={fetchQuick} disabled={fetching||!username.trim()}>
                  {fetching?<><span className="lc-spinner"/>Fetching...</>:'âŸ³ Sync'}
                </button>
              </div>
              <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'12px'}}>
                ¹ Quick sync fetches your last 20 solved problems. For all problems, use Full Sync tab.
              </div>
            </div>
          )}

          {/* Full Sync Tab */}
          {tab==='full' && (
            <div>
              <div className="lc-steps">
                <div className="lc-step">
                  <div className="lc-step-num">1</div>
                  <div className="lc-step-text">Log in to LeetCode.com -{'>'} Press F12 -{'>'} Go to the Application tab -{'>'} Click on Cookies - {'>'} Select leetcode.com.</div>
                </div>
                <div className="lc-step">
                  <div className="lc-step-num">2</div>
                  <div className="lc-step-text">Copy the value of the<code>LEETCODE_SESSION</code> cookie (it will be a very long string).</div>
                </div>
                <div className="lc-step">
                  <div className="lc-step-num">3</div>
                  <div className="lc-step-text">Copy the value of the<code>csrftoken</code> cookie.</div>
                </div>
                <div className="lc-step">
                  <div className="lc-step-num">4</div>
                  <div className="lc-step-text">Paste both values in the section below -{'>'}Click Fetch All.</div>
                </div>
              </div>

              <div style={{fontSize:'11px',fontWeight:600,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'6px'}}>
                LEETCODE_SESSION
              </div>
              <input className="lc-input-full" placeholder="eyJ0eXAiOiJKV1QiLCJhbGci..." 
                value={session} onChange={e=>setSession(e.target.value)} type="password"/>

              <div style={{fontSize:'11px',fontWeight:600,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'6px'}}>
                csrftoken
              </div>
              <input className="lc-input-full" placeholder="abc123xyz..." 
                value={csrf} onChange={e=>setCsrf(e.target.value)}/>

              <button className="lc-sync-btn-full" onClick={fetchFull} disabled={fetching||!session.trim()||!csrf.trim()}>
                {fetching?<><span className="lc-spinner"/>Fetching all problems...</>:'‘ Fetch All Solved Problems'}
              </button>

              {cookieSaved && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'8px',marginBottom:'10px'}}>
                  <div style={{fontSize:'12px',color:'#4ade80',display:'flex',alignItems:'center',gap:'6px'}}>
                    <span>“</span> Cookies saved ” auto-filled next time!
                  </div>
                  <button onClick={()=>{
                    localStorage.removeItem('lc_session')
                    localStorage.removeItem('lc_csrf')
                    setSession(''); setCsrf(''); setCookieSaved(false)
                    setStatus({type:'info',msg:'Cookies cleared!'})
                  }} style={{padding:'4px 10px',background:'transparent',border:'1px solid rgba(244,63,94,0.3)',borderRadius:'6px',color:'#fb7185',fontSize:'11px',cursor:'pointer'}}>
                    Clear
                  </button>
                </div>
              )}
              <div style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.6,padding:'10px',background:'rgba(8,8,14,0.4)',borderRadius:'8px',border:'1px solid rgba(30,30,48,0.6)'}}>
                 <strong style={{color:'var(--text)'}}>Safe:</strong> Cookies are saved locally in the browser – they do not go to any server. The session remains valid for ~30 days.
              </div>
            </div>
          )}

          {/* Status */}
          <AnimatePresence>
            {status&&(
              <motion.div className={`lc-status lc-status-${status.type}`}
                initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{marginTop:'12px'}}>
                {status.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Import progress */}
          {importing&&(
            <div className="lc-progress-wrap" style={{marginTop:'12px'}}>
              <div className="lc-progress-info">
                <span>Importing to Firebase...</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace"}}>{progress.current}/{progress.total}</span>
              </div>
              <div className="lc-progress-bar">
                <div className="lc-progress-fill" style={{width:`${Math.round((progress.current/progress.total)*100)}%`}}/>
              </div>
            </div>
          )}

          {/* User card */}
          {lcData&&(
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{marginTop:'12px'}}>
              <div className="lc-user-card">
                <div className="lc-user-avatar">{(lcData.username||'?')[0].toUpperCase()}</div>
                <div>
                  <div className="lc-user-name">{lcData.name||lcData.username}</div>
                  <div className="lc-user-sub">@{lcData.username} Â· {lcData.total} solved on LeetCode</div>
                </div>
              </div>
              <div className="lc-stats-row">
                {[['Total',lcData.total,'var(--accent2)'],['Easy',lcData.easy,'#4ade80'],['Medium',lcData.medium,'#fbbf24'],['Hard',lcData.hard,'#fb7185']].map(([l,v,c])=>(
                  <div key={l} className="lc-stat">
                    <div className="lc-stat-val" style={{color:c}}>{v}</div>
                    <div className="lc-stat-label">{l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Problems list */}
          {problems.length>0&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}>
              <div className="lc-filter-row">
                {['All','Easy','Medium','Hard'].map(f=>(
                  <button key={f} className={`lc-filter-btn${filter===f?' active':''}`} onClick={()=>setFilter(f)}>{f}</button>
                ))}
                <span className="lc-select-all" onClick={toggleAll}>
                  {filteredProblems.every(p=>selected.has(String(p.id)))?'Deselect All':'Select All'}
                </span>
                <span style={{fontSize:'11px',color:'var(--muted)'}}>{newCount} new</span>
              </div>
              <div className="lc-problems">
                {filteredProblems.map(p=>{
                  const isEx=existingNames.has(p.name), isSel=selected.has(String(p.id))
                  return (
                    <div key={p.id} className={`lc-problem-row${isSel?' selected':''}`}
                      style={isEx?{opacity:0.4,cursor:'default'}:{}}
                      onClick={()=>!isEx&&toggleSelect(p.id)}>
                      <div className={`lc-check${isSel?' checked':''}`}>
                        {isSel&&<span style={{color:'white',fontSize:'10px',fontWeight:700}}>âœ“</span>}
                      </div>
                      <span className="lc-problem-name">{p.name}</span>
                      <span className={`lc-diff lc-diff-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                      {isEx&&<span className="lc-already">“ imported</span>}
                    </div>
                  )
                })}
              </div>
              <button className="lc-import-btn" onClick={importSelected} disabled={importing||newCount===0}>
                {importing?<><span className="lc-spinner"/>Importing {progress.current}/{progress.total}...</>
                  :`â†“ Import ${newCount} Problem${newCount!==1?'s':''} to Tracker`}
              </button>
            </motion.div>
          )}

          {!fetching&&!problems.length&&!status&&(
            <div className="lc-empty">
              <div className="lc-empty-icon">—</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'14px',fontWeight:600,color:'var(--text)',marginBottom:'6px'}}>
                {tab==='quick'?'Enter your LeetCode username':'Paste your cookies to sync all problems'}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}