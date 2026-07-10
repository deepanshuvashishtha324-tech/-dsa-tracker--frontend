import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#08080E; --surface:#0F0F1A; --card:#13131F; --border:#1E1E30;
    --accent:#6366F1; --accent2:#818CF8; --accent3:#A5B4FC;
    --ember:#F97316; --green:#22C55E; --text:#F1F5F9; --muted:#64748B;
  }
  html,body,#root { background:var(--bg); color:var(--text); font-family:'Inter',sans-serif; min-height:100vh; }
  ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

  .pp-wrap { min-height:100vh; background:var(--bg); padding:40px 20px; }
  .pp-container { max-width:720px; margin:0 auto; display:flex; flex-direction:column; gap:24px; }

  /* HERO */
  .pp-hero {
    background:var(--card); border:1px solid var(--border); border-radius:20px;
    padding:32px; position:relative; overflow:hidden;
  }
  .pp-hero-glow {
    position:absolute; inset:0;
    background:radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.12) 0%, transparent 60%);
    pointer-events:none;
  }
  .pp-hero-line {
    position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg, var(--accent), rgba(99,102,241,0.2), transparent);
  }
  .pp-avatar {
    width:72px; height:72px; border-radius:50%;
    background:linear-gradient(135deg, var(--accent), var(--accent2));
    display:flex; align-items:center; justify-content:center;
    font-family:'Space Grotesk',sans-serif; font-size:28px; font-weight:700;
    color:white; margin-bottom:16px;
    box-shadow: 0 0 32px rgba(99,102,241,0.3);
  }
  .pp-name {
    font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700;
    letter-spacing:-0.03em; color:var(--text); margin-bottom:4px;
  }
  .pp-handle { font-size:13px; color:var(--muted); margin-bottom:16px; }
  .pp-tagline {
    font-size:12px; font-weight:500; letter-spacing:0.06em;
    text-transform:uppercase; color:var(--accent3);
    font-family:'Space Grotesk',sans-serif;
  }
  .pp-badges { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }
  .pp-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600;
  }
  .pp-badge-level { background:rgba(99,102,241,0.12); color:var(--accent3); border:1px solid rgba(99,102,241,0.2); }
  .pp-badge-streak { background:rgba(249,115,22,0.12); color:#fb923c; border:1px solid rgba(249,115,22,0.2); }
  .pp-badge-acc { background:rgba(34,197,94,0.12); color:#4ade80; border:1px solid rgba(34,197,94,0.2); }

  /* STATS */
  .pp-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .pp-stat {
    background:var(--card); border:1px solid var(--border); border-radius:12px;
    padding:16px; text-align:center;
  }
  .pp-stat-val {
    font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700;
    letter-spacing:-0.03em; color:var(--text); line-height:1;
  }
  .pp-stat-label { font-size:11px; color:var(--muted); margin-top:4px; }

  /* TOPICS */
  .pp-card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:22px; }
  .pp-card-title {
    font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600;
    color:var(--text); margin-bottom:16px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .pp-topic-row { margin-bottom:12px; }
  .pp-topic-info { display:flex; justify-content:space-between; margin-bottom:5px; }
  .pp-topic-name { font-size:12px; color:var(--text); font-weight:500; }
  .pp-topic-count { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); }
  .pp-topic-bar { height:4px; background:var(--border); border-radius:3px; overflow:hidden; }
  .pp-topic-fill { height:100%; border-radius:3px; }

  /* RECENT */
  .pp-problem-row {
    display:flex; align-items:center; gap:12px;
    padding:10px 0; border-bottom:1px solid rgba(30,30,48,0.6);
  }
  .pp-problem-row:last-child { border-bottom:none; }
  .pp-problem-name { flex:1; font-size:12px; font-weight:500; color:var(--text); }
  .pp-diff { display:inline-flex; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:600; }
  .pp-diff-easy   { background:rgba(34,197,94,0.12); color:#4ade80; }
  .pp-diff-medium { background:rgba(251,191,36,0.12); color:#fbbf24; }
  .pp-diff-hard   { background:rgba(244,63,94,0.12);  color:#fb7185; }

  /* HEATMAP */
  .pp-heatmap-grid { display:flex; gap:3px; }
  .pp-heatmap-week { display:flex; flex-direction:column; gap:3px; }
  .pp-heatmap-cell { width:10px; height:10px; border-radius:2px; }

  /* SHARE */
  .pp-share {
    display:flex; align-items:center; gap:10px;
    padding:14px 18px; background:var(--surface);
    border:1px solid var(--border); border-radius:10px;
    font-size:12px; color:var(--muted);
  }
  .pp-share-url { flex:1; font-family:'JetBrains Mono',monospace; color:var(--accent3); font-size:12px; }
  .pp-copy-btn {
    padding:6px 14px; background:rgba(99,102,241,0.12);
    border:1px solid rgba(99,102,241,0.25); border-radius:7px;
    font-size:11px; font-weight:600; color:var(--accent3);
    cursor:pointer; transition:all 0.15s; white-space:nowrap;
  }
  .pp-copy-btn:hover { background:rgba(99,102,241,0.2); }

  /* FOOTER */
  .pp-footer { text-align:center; font-size:12px; color:var(--muted); padding:8px 0; }
  .pp-footer span { color:var(--accent3); font-weight:500; }

  /* LOADER / ERROR */
  .pp-loader { display:flex; align-items:center; justify-content:center; min-height:60vh; }
  .pp-spinner { width:24px; height:24px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin 0.7s linear infinite; }
  .pp-error { text-align:center; padding:80px 20px; }
  .pp-error-icon { font-size:48px; margin-bottom:16px; }
  .pp-error-title { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; color:var(--text); margin-bottom:8px; }
  .pp-error-sub { font-size:13px; color:var(--muted); }

  @media(max-width:600px) {
    .pp-wrap { padding:20px 14px; }
    .pp-stats { grid-template-columns:1fr 1fr; }
    .pp-hero { padding:22px; }
    .pp-avatar { width:56px; height:56px; font-size:22px; }
    .pp-name { font-size:20px; }
  }
`

const TOPIC_COLORS = ['#6366F1','#818CF8','#22C55E','#F97316','#F43F5E','#FBBF24','#06B6D4','#8B5CF6']

function buildHeatmap(problems) {
  const dateMap = {}
  problems.forEach(p => {
    if (!p.createdAt?.toDate) return
    const d = p.createdAt.toDate()
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    dateMap[key] = (dateMap[key]||0) + 1
  })
  const weeks = []
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (16*7) + (7 - now.getDay()))
  for (let w = 0; w < 16; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + (w*7) + d)
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
      const count = dateMap[key] || 0
      week.push(count >= 4 ? 4 : count >= 2 ? 3 : count >= 1 ? 2 : 0)
    }
    weeks.push(week)
  }
  return weeks
}

function computePublicStats(problems) {
  const total   = problems.length
  const solved  = problems.filter(p=>(p.status||'').toLowerCase()==='solved').length
  const easy    = problems.filter(p=>(p.difficulty||'').toLowerCase()==='easy').length
  const medium  = problems.filter(p=>(p.difficulty||'').toLowerCase()==='medium').length
  const hard    = problems.filter(p=>(p.difficulty||'').toLowerCase()==='hard').length
  const accuracy = total > 0 ? Math.round((solved/total)*100) : 0

  const solvedDates = problems
    .filter(p=>(p.status||'').toLowerCase()==='solved'&&p.createdAt?.toDate)
    .map(p=>{ const d=p.createdAt.toDate(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` })
  const uniqueDates = [...new Set(solvedDates)]
  let streak = 0
  const today = new Date()
  for(let i=0;i<60;i++){
    const exp=new Date(today); exp.setDate(today.getDate()-i)
    const key=`${exp.getFullYear()}-${exp.getMonth()}-${exp.getDate()}`
    if(uniqueDates.includes(key)) streak++
    else break
  }

  const topicMap = {}
  problems.forEach(p=>{ const t=p.topic||'Other'; topicMap[t]=(topicMap[t]||0)+1 })
  const maxCount = Math.max(...Object.values(topicMap),1)
  const topics = Object.entries(topicMap).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([name,count],i)=>({ name, count, pct:Math.round((count/maxCount)*100), color:TOPIC_COLORS[i%TOPIC_COLORS.length] }))

  const level = solved >= 200 ? 'Expert' : solved >= 100 ? 'Advanced' : solved >= 50 ? 'Intermediate' : 'Beginner'

  return { total, solved, easy, medium, hard, accuracy, streak, topics, level }
}

export default function PublicProfile() {
  const { username } = useParams()
  const [profileData, setProfileData] = useState(null)
  const [problems, setProblems]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Find user by username in Firestore
        const usersQ = query(collection(db,'users'), where('username','==', username))
        const usersSnap = await getDocs(usersQ)

        if (usersSnap.empty) { setNotFound(true); setLoading(false); return }

        const userDoc = usersSnap.docs[0]
        const userData = { id: userDoc.id, ...userDoc.data() }
        setProfileData(userData)

        // Fetch their problems
        const probsQ = query(collection(db,'problems'), where('userId','==', userDoc.id))
        const probsSnap = await getDocs(probsQ)
        setProblems(probsSnap.docs.map(d=>({ id:d.id, ...d.data() })))
      } catch(e) {
        console.error(e)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [username])

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="pp-loader"><div className="pp-spinner"/></div>
    </>
  )

  if (notFound) return (
    <>
      <style>{css}</style>
      <div className="pp-wrap">
        <div className="pp-error">
          <div className="pp-error-icon">👤</div>
          <div className="pp-error-title">Profile not found</div>
          <div className="pp-error-sub">No user found with username "{username}"</div>
        </div>
      </div>
    </>
  )

  const stats   = computePublicStats(problems)
  const heatmap = buildHeatmap(problems)
  const heatColors = ['#1E293B','#1e1b4b','#3730a3','#6366F1','#818CF8']
  const recent  = problems.slice(0,5)

  return (
    <>
      <style>{css}</style>
      <div className="pp-wrap">
        <motion.div className="pp-container" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>

          {/* Hero Card */}
          <div className="pp-hero">
            <div className="pp-hero-glow"/><div className="pp-hero-line"/>
            <div className="pp-avatar">
              {(profileData?.name || profileData?.username || 'D')[0].toUpperCase()}
            </div>
            <div className="pp-name">{profileData?.name || 'DSA Coder'}</div>
            <div className="pp-handle">@{profileData?.username || username}</div>
            <div className="pp-tagline">DV — Crafted in Code, Driven by Vision</div>
            <div className="pp-badges">
              <span className="pp-badge pp-badge-level">⬡ {stats.level}</span>
              {stats.streak > 0 && <span className="pp-badge pp-badge-streak">🔥 {stats.streak} day streak</span>}
              {stats.accuracy > 0 && <span className="pp-badge pp-badge-acc">✓ {stats.accuracy}% accuracy</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="pp-stats">
            {[
              { label:'Problems Solved', val:stats.solved, color:'var(--accent2)' },
              { label:'Easy',            val:stats.easy,   color:'#4ade80' },
              { label:'Medium',          val:stats.medium, color:'#fbbf24' },
              { label:'Hard',            val:stats.hard,   color:'#fb7185' },
            ].map((s,i) => (
              <motion.div key={s.label} className="pp-stat"
                initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
                transition={{delay:i*0.07, duration:0.25}}>
                <div className="pp-stat-val" style={{color:s.color}}>{s.val}</div>
                <div className="pp-stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Activity Heatmap */}
          <div className="pp-card">
            <div className="pp-card-title">
              Activity Heatmap
              <span style={{fontSize:'11px',color:'var(--muted)'}}>Last 16 weeks</span>
            </div>
            <div className="pp-heatmap-grid">
              {heatmap.map((week,wi) => (
                <div key={wi} className="pp-heatmap-week">
                  {week.map((level,di) => (
                    <div key={di} className="pp-heatmap-cell"
                      style={{background:heatColors[level]}}/>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Topic Breakdown */}
          {stats.topics.length > 0 && (
            <div className="pp-card">
              <div className="pp-card-title">
                Topic Breakdown
                <span style={{fontSize:'11px',color:'var(--muted)'}}>{stats.topics.length} topics</span>
              </div>
              {stats.topics.map(t => (
                <div key={t.name} className="pp-topic-row">
                  <div className="pp-topic-info">
                    <span className="pp-topic-name">{t.name}</span>
                    <span className="pp-topic-count">{t.count}</span>
                  </div>
                  <div className="pp-topic-bar">
                    <div className="pp-topic-fill" style={{width:`${t.pct}%`,background:t.color,boxShadow:`0 0 6px ${t.color}60`}}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Problems */}
          {recent.length > 0 && (
            <div className="pp-card">
              <div className="pp-card-title">
                Recent Problems
                <span style={{fontSize:'11px',color:'var(--muted)'}}>{problems.length} total</span>
              </div>
              {recent.map((p,i) => (
                <div key={i} className="pp-problem-row">
                  <span className="pp-problem-name">{p.name||'—'}</span>
                  <span className={`pp-diff pp-diff-${(p.difficulty||'medium').toLowerCase()}`}>
                    {p.difficulty||'Medium'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Share URL */}
          <div className="pp-share">
            <span style={{fontSize:'14px'}}>🔗</span>
            <span className="pp-share-url">{window.location.href}</span>
            <button className="pp-copy-btn" onClick={handleCopy}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Footer */}
          <div className="pp-footer">
            Built with <span>DV DSA Tracker</span> · by Deepanshu 🚀
          </div>

        </motion.div>
      </div>
    </>
  )
}