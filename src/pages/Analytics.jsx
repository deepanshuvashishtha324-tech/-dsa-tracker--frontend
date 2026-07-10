import React, { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts'

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  .an-page { display:flex; flex-direction:column; gap:24px; }
  .an-header h1 { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:-0.03em; color:var(--text); }
  .an-header p { font-size:12px; color:var(--muted); margin-top:3px; }
  .an-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .an-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
  .an-chart-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px 22px; }
  .an-chart-title { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; color:var(--text); margin-bottom:4px; }
  .an-chart-sub { font-size:11px; color:var(--muted); margin-bottom:16px; }
  .an-stat-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .an-stat { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px 18px; }
  .an-stat-label { font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
  .an-stat-val { font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700; letter-spacing:-0.03em; color:var(--text); line-height:1; }
  .an-stat-sub { font-size:11px; color:var(--muted); margin-top:4px; }
  .an-empty { text-align:center; color:var(--muted); font-size:13px; padding:40px 0; }
  .an-tooltip { background:var(--surface) !important; border:1px solid var(--border) !important; border-radius:8px !important; font-family:'Inter',sans-serif !important; font-size:12px !important; }
  .an-legend { font-size:11px; color:var(--muted); }

  @media(max-width:768px) {
    .an-grid-2 { grid-template-columns:1fr; }
    .an-grid-3 { grid-template-columns:1fr; }
    .an-stat-row { grid-template-columns:1fr 1fr; }
  }
  @media(max-width:480px) {
    .an-stat-row { grid-template-columns:1fr; }
  }
`

// ─── COLORS ──────────────────────────────────────────────────────────────────
const COLORS = {
  accent:  '#6366F1',
  accent2: '#818CF8',
  accent3: '#A5B4FC',
  green:   '#22C55E',
  ember:   '#F97316',
  red:     '#F43F5E',
  yellow:  '#FBBF24',
  cyan:    '#06B6D4',
  purple:  '#8B5CF6',
}

const DIFF_COLORS = {
  Easy:   '#22C55E',
  Medium: '#FBBF24',
  Hard:   '#F43F5E',
}

const TOPIC_COLORS = [
  '#6366F1','#818CF8','#22C55E','#F97316','#F43F5E','#FBBF24','#06B6D4','#8B5CF6','#EC4899',
]

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'#0F0F1A', border:'1px solid #1E1E30',
      borderRadius:'8px', padding:'10px 14px',
      fontFamily:'Inter,sans-serif', fontSize:'12px',
    }}>
      {label && <div style={{color:'#64748B',marginBottom:'4px',fontSize:'11px'}}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color||'#F1F5F9',display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:p.color}}/>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ─── DATA PROCESSORS ─────────────────────────────────────────────────────────
function processAnalytics(problems) {
  const now = Date.now()
  const DAY = 24*60*60*1000

  // ── Daily activity last 30 days ──
  const last30 = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * DAY)
    const label = date.toLocaleDateString('en', { month:'short', day:'numeric' })
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const dayProblems = problems.filter(p => {
      if (!p.createdAt?.toDate) return false
      const d = p.createdAt.toDate()
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key
    })
    last30.push({
      date: label,
      solved: dayProblems.filter(p => (p.status||'').toLowerCase()==='solved').length,
      attempted: dayProblems.length,
    })
  }

  // ── Weekly progress last 8 weeks ──
  const weekly = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now - (i+1)*7*DAY)
    const weekEnd   = new Date(now - i*7*DAY)
    const label = weekStart.toLocaleDateString('en', { month:'short', day:'numeric' })
    const weekProblems = problems.filter(p => {
      if (!p.createdAt?.toDate) return false
      const t = p.createdAt.toDate().getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    })
    weekly.push({
      week: label,
      solved: weekProblems.filter(p=>(p.status||'').toLowerCase()==='solved').length,
      easy:   weekProblems.filter(p=>(p.difficulty||'').toLowerCase()==='easy').length,
      medium: weekProblems.filter(p=>(p.difficulty||'').toLowerCase()==='medium').length,
      hard:   weekProblems.filter(p=>(p.difficulty||'').toLowerCase()==='hard').length,
    })
  }

  // ── Difficulty distribution ──
  const easy   = problems.filter(p=>(p.difficulty||'').toLowerCase()==='easy').length
  const medium = problems.filter(p=>(p.difficulty||'').toLowerCase()==='medium').length
  const hard   = problems.filter(p=>(p.difficulty||'').toLowerCase()==='hard').length
  const diffDist = [
    { name:'Easy',   value:easy,   color:DIFF_COLORS.Easy },
    { name:'Medium', value:medium, color:DIFF_COLORS.Medium },
    { name:'Hard',   value:hard,   color:DIFF_COLORS.Hard },
  ].filter(d => d.value > 0)

  // ── Topic distribution ──
  const topicMap = {}
  problems.forEach(p => {
    const t = p.topic || 'Other'
    topicMap[t] = (topicMap[t] || 0) + 1
  })
  const topicDist = Object.entries(topicMap)
    .sort((a,b) => b[1]-a[1]).slice(0,8)
    .map(([name,value],i) => ({ name, value, color: TOPIC_COLORS[i % TOPIC_COLORS.length] }))

  // ── Solve time distribution ──
  const timeBuckets = {'<10m':0,'10-20m':0,'20-30m':0,'30-45m':0,'>45m':0}
  problems.forEach(p => {
    if (!p.timeTaken || p.timeTaken <= 0) return
    const t = p.timeTaken
    if (t < 10)      timeBuckets['<10m']++
    else if (t < 20) timeBuckets['10-20m']++
    else if (t < 30) timeBuckets['20-30m']++
    else if (t < 45) timeBuckets['30-45m']++
    else             timeBuckets['>45m']++
  })
  const timeDist = Object.entries(timeBuckets).map(([range,count]) => ({ range, count }))

  // ── Cumulative progress ──
  const sorted = [...problems]
    .filter(p => p.createdAt?.toDate && (p.status||'').toLowerCase()==='solved')
    .sort((a,b) => a.createdAt.toDate() - b.createdAt.toDate())
  const cumulative = sorted.map((p,i) => ({
    date: p.createdAt.toDate().toLocaleDateString('en',{month:'short',day:'numeric'}),
    total: i + 1,
    name: p.name,
  }))

  // ── Summary stats ──
  const totalSolved = problems.filter(p=>(p.status||'').toLowerCase()==='solved').length
  const timed = problems.filter(p=>p.timeTaken>0)
  const avgTime = timed.length > 0 ? Math.round(timed.reduce((s,p)=>s+p.timeTaken,0)/timed.length) : 0
  const accuracy = problems.length > 0 ? Math.round((totalSolved/problems.length)*100) : 0
  const thisWeek = problems.filter(p => {
    if (!p.createdAt?.toDate) return false
    return (now - p.createdAt.toDate().getTime()) < 7*DAY
  }).length
  const bestDay = Math.max(...last30.map(d => d.solved), 0)

  return { last30, weekly, diffDist, topicDist, timeDist, cumulative,
    stats: { totalSolved, avgTime, accuracy, thisWeek, bestDay, total: problems.length } }
}

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────────────
export default function AnalyticsPage({ problems }) {
  const data = useMemo(() => processAnalytics(problems), [problems])

  if (problems.length === 0) return (
    <>
      <style>{css}</style>
      <div className="an-page">
        <div className="an-header">
          <h1>Analytics</h1>
          <p>Track your progress with detailed insights</p>
        </div>
        <div className="an-chart-card" style={{padding:'48px 32px',textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'16px'}}>🚀</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'18px',fontWeight:700,color:'var(--text)',marginBottom:'8px'}}>
            Your analytics will appear here
          </div>
          <div style={{fontSize:'13px',color:'var(--muted)',lineHeight:1.6,maxWidth:'320px',margin:'0 auto'}}>
            Start logging DSA problems to see detailed charts, progress graphs, and insights about your journey.
          </div>
        </div>
      </div>
    </>
  )

  const { last30, weekly, diffDist, topicDist, timeDist, cumulative, stats } = data

  return (
    <>
      <style>{css}</style>
      <div className="an-page">

        {/* Header */}
        <div className="an-header">
          <h1>Analytics</h1>
          <p>Deep dive into your DSA progress</p>
        </div>

        {/* Summary Stats */}
        <div className="an-stat-row">
          <div className="an-stat">
            <div className="an-stat-label">Total Solved</div>
            <div className="an-stat-val" style={{color:'var(--accent2)'}}>{stats.totalSolved}</div>
            <div className="an-stat-sub">of {stats.total} tracked</div>
          </div>
          <div className="an-stat">
            <div className="an-stat-label">Accuracy</div>
            <div className="an-stat-val" style={{color:'#4ade80'}}>{stats.accuracy}%</div>
            <div className="an-stat-sub">solve rate</div>
          </div>
          <div className="an-stat">
            <div className="an-stat-label">This Week</div>
            <div className="an-stat-val" style={{color:'var(--ember)'}}>{stats.thisWeek}</div>
            <div className="an-stat-sub">problems</div>
          </div>
          <div className="an-stat">
            <div className="an-stat-label">Avg Time</div>
            <div className="an-stat-val">{stats.avgTime > 0 ? stats.avgTime : '—'}</div>
            <div className="an-stat-sub">{stats.avgTime > 0 ? 'minutes' : 'not tracked'}</div>
          </div>
        </div>

        {/* Cumulative Progress */}
        <div className="an-chart-card">
          <div className="an-chart-title">Cumulative Progress</div>
          <div className="an-chart-sub">Total problems solved over time</div>
          {cumulative.length < 2
            ? <div className="an-empty" style={{padding:'40px 0'}}>
          <div style={{fontSize:'28px',marginBottom:'8px'}}>📈</div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'14px',fontWeight:600,color:'var(--text)',marginBottom:'4px'}}>Not enough data yet</div>
          <div style={{fontSize:'12px',color:'var(--muted)'}}>Solve at least 2 problems to see your growth curve</div>
        </div>
            : <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={cumulative}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E30" vertical={false}/>
                  <XAxis dataKey="date" tick={{fill:'#64748B',fontSize:10}} tickLine={false} axisLine={false}
                    interval={Math.floor(cumulative.length/6)}/>
                  <YAxis tick={{fill:'#64748B',fontSize:10}} tickLine={false} axisLine={false} width={30}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="total" name="Solved" stroke="#6366F1"
                    strokeWidth={2} fill="url(#gradTotal)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Daily Activity + Weekly Breakdown */}
        <div className="an-grid-2">
          {/* Daily Activity */}
          <div className="an-chart-card">
            <div className="an-chart-title">Daily Activity</div>
            <div className="an-chart-sub">Problems solved per day (last 30 days)</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last30} barSize={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E30" vertical={false}/>
                <XAxis dataKey="date" tick={{fill:'#64748B',fontSize:9}} tickLine={false} axisLine={false}
                  interval={6}/>
                <YAxis tick={{fill:'#64748B',fontSize:10}} tickLine={false} axisLine={false} width={20} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="solved" name="Solved" fill="#6366F1" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Stacked */}
          <div className="an-chart-card">
            <div className="an-chart-title">Weekly Breakdown</div>
            <div className="an-chart-sub">Easy / Medium / Hard per week</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weekly} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E30" vertical={false}/>
                <XAxis dataKey="week" tick={{fill:'#64748B',fontSize:9}} tickLine={false} axisLine={false} interval={1}/>
                <YAxis tick={{fill:'#64748B',fontSize:10}} tickLine={false} axisLine={false} width={20} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{fontSize:'10px',color:'#64748B'}}/>
                <Bar dataKey="easy"   name="Easy"   stackId="a" fill={DIFF_COLORS.Easy}   radius={[0,0,0,0]}/>
                <Bar dataKey="medium" name="Medium" stackId="a" fill={DIFF_COLORS.Medium} radius={[0,0,0,0]}/>
                <Bar dataKey="hard"   name="Hard"   stackId="a" fill={DIFF_COLORS.Hard}   radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Pie + Topic Bar */}
        <div className="an-grid-2">
          {/* Difficulty Pie */}
          <div className="an-chart-card">
            <div className="an-chart-title">Difficulty Distribution</div>
            <div className="an-chart-sub">Easy vs Medium vs Hard breakdown</div>
            {diffDist.length === 0
              ? <div className="an-empty">
                  <div style={{fontSize:'24px',marginBottom:'6px'}}>🎯</div>
                  <div style={{fontSize:'12px',color:'var(--muted)'}}>Log problems with difficulty to see this</div>
                </div>
              : <div style={{display:'flex',alignItems:'center',gap:'24px'}}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={diffDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        paddingAngle={3} dataKey="value">
                        {diffDist.map((d,i) => <Cell key={i} fill={d.color}/>)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {diffDist.map(d => (
                      <div key={d.name} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:d.color,flexShrink:0}}/>
                        <span style={{fontSize:'12px',color:'var(--text)',fontWeight:500}}>{d.name}</span>
                        <span style={{fontSize:'11px',color:'var(--muted)',marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace"}}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
            }
          </div>

          {/* Topic Distribution */}
          <div className="an-chart-card">
            <div className="an-chart-title">Topic Distribution</div>
            <div className="an-chart-sub">Problems per topic</div>
            {topicDist.length === 0
              ? <div className="an-empty">
                  <div style={{fontSize:'24px',marginBottom:'6px'}}>🏷️</div>
                  <div style={{fontSize:'12px',color:'var(--muted)'}}>Add topics when logging problems</div>
                </div>
              : <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topicDist} layout="vertical" barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E30" horizontal={false}/>
                    <XAxis type="number" tick={{fill:'#64748B',fontSize:10}} tickLine={false} axisLine={false} allowDecimals={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:'#94A3B8',fontSize:10}} tickLine={false} axisLine={false} width={80}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="value" name="Problems" radius={[0,4,4,0]}>
                      {topicDist.map((d,i) => <Cell key={i} fill={d.color}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Solve Time Distribution */}
        {stats.avgTime > 0 && (
          <div className="an-chart-card">
            <div className="an-chart-title">Solve Time Distribution</div>
            <div className="an-chart-sub">How long you typically spend per problem</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={timeDist} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E30" vertical={false}/>
                <XAxis dataKey="range" tick={{fill:'#64748B',fontSize:11}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fill:'#64748B',fontSize:10}} tickLine={false} axisLine={false} width={24} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="count" name="Problems" fill="#818CF8" radius={[6,6,0,0]}>
                  {timeDist.map((_,i) => (
                    <Cell key={i} fill={['#A5B4FC','#818CF8','#6366F1','#4F46E5','#3730A3'][i]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </>
  )
}