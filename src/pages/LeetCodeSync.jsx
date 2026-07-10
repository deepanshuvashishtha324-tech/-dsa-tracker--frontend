import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db, auth } from '../firebase'
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore'

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'

const css = `
  .lc-page { display:flex; flex-direction:column; gap:24px; width:100%; }
  .lc-header h1 { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:-0.03em; color:var(--text); }
  .lc-header p  { font-size:12px; color:var(--muted); margin-top:3px; }
  .lc-glass {
    background:rgba(19,19,31,0.7); border:1px solid rgba(99,102,241,0.2);
    border-radius:16px; padding:28px; position:relative; overflow:hidden;
    backdrop-filter:blur(12px);
  }
  .lc-glass::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 0% 0%,rgba(99,102,241,0.1) 0%,transparent 60%); pointer-events:none; }
  .lc-glass-line { position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,rgba(99,102,241,0.8),rgba(129,140,248,0.2),transparent); }

  .lc-input-row { display:flex; gap:10px; margin-bottom:16px; }
  .lc-input-wrap { flex:1; position:relative; }
  .lc-input-prefix { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:12px; color:var(--muted); pointer-events:none; font-family:'JetBrains Mono',monospace; white-space:nowrap; }
  .lc-input { width:100%; padding:11px 12px 11px 148px; background:rgba(8,8,14,0.6); border:1px solid rgba(99,102,241,0.2); border-radius:10px; color:var(--text); font-family:'Inter',sans-serif; font-size:13px; outline:none; transition:all 0.2s; }
  .lc-input:focus { border-color:rgba(99,102,241,0.6); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
  .lc-input::placeholder { color:#475569; }
  .lc-sync-btn { padding:11px 20px; background:linear-gradient(135deg,#6366F1,#818CF8); border:none; border-radius:10px; color:white; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; white-space:nowrap; display:flex; align-items:center; gap:8px; box-shadow:0 0 20px rgba(99,102,241,0.3); }
  .lc-sync-btn:hover { transform:translateY(-1px); box-shadow:0 0 28px rgba(99,102,241,0.5); }
  .lc-sync-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

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
  .lc-import-btn:hover { transform:translateY(-1px); box-shadow:0 0 28px rgba(34,197,94,0.35); }
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

  .lc-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.25); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }

  .lc-empty { text-align:center; padding:40px 20px; color:var(--muted); }
  .lc-empty-icon { font-size:40px; margin-bottom:12px; opacity:0.4; }

  @media(max-width:600px) {
    .lc-stats-row { grid-template-columns:1fr 1fr; }
    .lc-input-row { flex-direction:column; }
    .lc-sync-btn { width:100%; justify-content:center; }
  }
`

const DIFF_MAP = { Easy:'Easy', Medium:'Medium', Hard:'Hard' }

export default function LeetCodeSync() {
  const [username, setUsername]   = useState('')
  const [fetching, setFetching]   = useState(false)
  const [lcData, setLcData]       = useState(null)
  const [problems, setProblems]   = useState([])
  const [selected, setSelected]   = useState(new Set())
  const [filter, setFilter]       = useState('All')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState({ current:0, total:0 })
  const [status, setStatus]       = useState(null)
  const [existingNames, setExistingNames] = useState(new Set())

  const fetchData = async () => {
    if (!username.trim()) return
    setFetching(true); setStatus(null); setLcData(null); setProblems([])
    try {
      setStatus({ type:'info', msg:'Connecting to LeetCode via proxy...' })
      const res = await fetch(`${PROXY_URL}/leetcode/${username.trim()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'User not found')
      }
      const data = await res.json()

      setLcData({
        username: data.username,
        name: data.name,
        easy: data.stats.easy,
        medium: data.stats.medium,
        hard: data.stats.hard,
        total: data.stats.total,
      })

      const probs = data.problems.map(p => ({
        id: p.id || p.slug,
        name: p.name,
        slug: p.slug,
        difficulty: DIFF_MAP[p.difficulty] || 'Medium',
      }))

      // Check existing in Firebase
      const uid = auth.currentUser?.uid
      if (uid) {
        const snap = await getDocs(query(collection(db,'problems'), where('userId','==',uid)))
        const existing = new Set(snap.docs.map(d => d.data().name))
        setExistingNames(existing)
        setSelected(new Set(probs.filter(p => !existing.has(p.name)).map(p => String(p.id))))
      } else {
        setSelected(new Set(probs.map(p => String(p.id))))
      }

      setProblems(probs)
      setStatus({ type:'info', msg:`✓ Found ${probs.length} solved problems for @${data.username}` })
    } catch(e) {
      setStatus({ type:'error', msg: e.message || 'Failed to fetch. Check username.' })
    } finally { setFetching(false) }
  }

  const toggleSelect = (id) => {
    setSelected(s => {
      const next = new Set(s)
      next.has(String(id)) ? next.delete(String(id)) : next.add(String(id))
      return next
    })
  }

  const toggleAll = () => {
    const filtered = filteredProblems.map(p => String(p.id))
    const allSel = filtered.every(id => selected.has(id))
    setSelected(s => {
      const next = new Set(s)
      if (allSel) filtered.forEach(id => next.delete(id))
      else filtered.forEach(id => next.add(id))
      return next
    })
  }

  const importSelected = async () => {
    const toImport = problems.filter(p => selected.has(String(p.id)) && !existingNames.has(p.name))
    if (!toImport.length) { setStatus({type:'error', msg:'No new problems to import!'}); return }

    setImporting(true); setStatus(null)
    setProgress({ current:0, total:toImport.length })

    

    try {
      const uid = auth.currentUser?.uid
      for (let i = 0; i < toImport.length; i++) {
        const p = toImport[i]
        await addDoc(collection(db,'problems'), {
          name: p.name,
          difficulty: p.difficulty,
          topic: 'LeetCode',
          status: 'Solved',
          timeTaken: 0,
          source: 'leetcode',
          leetcodeSlug: p.slug,
          userId: uid || null,
          createdAt: serverTimestamp(),
        })
        setProgress({ current:i+1, total:toImport.length })
      }
      setStatus({ type:'success', msg:`✓ Imported ${toImport.length} problems successfully!` })
      setExistingNames(e => new Set([...e, ...toImport.map(p => p.name)]))
      setSelected(new Set())
    } catch(e) {
      setStatus({ type:'error', msg:'Import failed. Try again.' })
    } finally { setImporting(false) }
  }

  const filteredProblems = filter === 'All' ? problems : problems.filter(p => p.difficulty === filter)
  const newCount = problems.filter(p => selected.has(String(p.id)) && !existingNames.has(p.name)).length

  return (
    <>
      <style>{css}</style>
      <div className="lc-page">
        <div className="lc-header">
          <h1>LeetCode Sync</h1>
          <p>Auto-import all your solved problems from LeetCode</p>
        </div>

        <motion.div className="lc-glass" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>
          <div className="lc-glass-line"/>

          {/* Username Input */}
          <div className="lc-input-row">
            <div className="lc-input-wrap">
              <span className="lc-input-prefix">leetcode.com/u/</span>
              <input className="lc-input" placeholder="your_username"
                value={username} onChange={e=>setUsername(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&fetchData()}/>
            </div>
            <button className="lc-sync-btn" onClick={fetchData} disabled={fetching||!username.trim()}>
              {fetching ? <><span className="lc-spinner"/>Fetching...</> : '⟳ Sync Problems'}
            </button>
          </div>

          {/* Status */}
          <AnimatePresence>
            {status && (
              <motion.div className={`lc-status lc-status-${status.type}`}
                initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                {status.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Import progress */}
          {importing && (
            <div className="lc-progress-wrap">
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
          {lcData && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
              <div className="lc-user-card">
                <div className="lc-user-avatar">{lcData.username[0].toUpperCase()}</div>
                <div>
                  <div className="lc-user-name">{lcData.name || lcData.username}</div>
                  <div className="lc-user-sub">@{lcData.username} · {lcData.total} solved on LeetCode</div>
                </div>
              </div>

              {/* Stats */}
              <div className="lc-stats-row">
                <div className="lc-stat">
                  <div className="lc-stat-val" style={{color:'var(--accent2)'}}>{lcData.total}</div>
                  <div className="lc-stat-label">Total Solved</div>
                </div>
                <div className="lc-stat">
                  <div className="lc-stat-val" style={{color:'#4ade80'}}>{lcData.easy}</div>
                  <div className="lc-stat-label">Easy</div>
                </div>
                <div className="lc-stat">
                  <div className="lc-stat-val" style={{color:'#fbbf24'}}>{lcData.medium}</div>
                  <div className="lc-stat-label">Medium</div>
                </div>
                <div className="lc-stat">
                  <div className="lc-stat-val" style={{color:'#fb7185'}}>{lcData.hard}</div>
                  <div className="lc-stat-label">Hard</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Problems list */}
          {problems.length > 0 && (
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
                {filteredProblems.map(p => {
                  const isExisting = existingNames.has(p.name)
                  const isSel = selected.has(String(p.id))
                  return (
                    <div key={p.id} className={`lc-problem-row${isSel?' selected':''}`}
                      style={isExisting?{opacity:0.4,cursor:'default'}:{}}
                      onClick={()=>!isExisting&&toggleSelect(p.id)}>
                      <div className={`lc-check${isSel?' checked':''}`}>
                        {isSel&&<span style={{color:'white',fontSize:'10px',fontWeight:700}}>✓</span>}
                      </div>
                      <span className="lc-problem-name">{p.name}</span>
                      <span className={`lc-diff lc-diff-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                      {isExisting&&<span className="lc-already">✓ imported</span>}
                    </div>
                  )
                })}
              </div>

              <button className="lc-import-btn" onClick={importSelected} disabled={importing||newCount===0}>
                {importing
                  ? <><span className="lc-spinner"/>Importing {progress.current}/{progress.total}...</>
                  : `↓ Import ${newCount} Problem${newCount!==1?'s':''} to Tracker`
                }
              </button>
            </motion.div>
          )}

          {/* Empty state */}
          {!fetching && !lcData && (
            <div className="lc-empty">
              <div className="lc-empty-icon">🔗</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'14px',fontWeight:600,color:'var(--text)',marginBottom:'6px'}}>
                Connect your LeetCode
              </div>
              <div style={{fontSize:'12px',color:'var(--muted)',lineHeight:1.6}}>
                Enter your LeetCode username and click Sync.<br/>
                Your LeetCode profile must be <strong style={{color:'var(--text)'}}>public</strong>.
              </div>
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div style={{background:'rgba(15,15,26,0.7)',border:'1px solid rgba(30,30,48,0.8)',borderRadius:'12px',padding:'14px 18px'}}
          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
          <div style={{fontSize:'11px',color:'var(--muted)',lineHeight:1.8}}>
            <span style={{color:'var(--accent3)',fontWeight:600}}>⚡ Powered by proxy server</span> — fetches all your solved problems, not just last 50. Already imported problems are automatically detected and skipped.
          </div>
        </motion.div>
      </div>
    </>
  )
}