import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { askGemini } from '../geminiService.js'

const css = `
  .aa-page { display:flex; flex-direction:column; gap:24px; width:100%; }

  /* HEADER */
  .aa-header { display:flex; align-items:flex-start; justify-content:space-between; }
  .aa-header h1 { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:-0.03em; color:var(--text); }
  .aa-header p  { font-size:12px; color:var(--muted); margin-top:3px; }

  /* MAIN LAYOUT */
  .aa-layout { display:grid; grid-template-columns:1fr 360px; gap:20px; align-items:start; }

  /* GLASS CARD */
  .aa-glass {
    background: rgba(19,19,31,0.7);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .aa-glass::before {
    content:'';
    position:absolute; inset:0;
    background: radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.12) 0%, transparent 60%);
    pointer-events:none;
  }
  .aa-glass-line {
    position:absolute; top:0; left:0; right:0; height:1px;
    background: linear-gradient(90deg, rgba(99,102,241,0.8), rgba(129,140,248,0.3), transparent);
  }

  /* SIDEBAR GLASS */
  .aa-sidebar-glass {
    background: rgba(15,15,26,0.8);
    border: 1px solid rgba(30,30,48,0.8);
    border-radius: 16px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    position: sticky;
    top: 20px;
  }
  .aa-sidebar-glass::before {
    content:'';
    position:absolute; inset:0;
    background: radial-gradient(ellipse at 100% 0%, rgba(99,102,241,0.07) 0%, transparent 60%);
    pointer-events:none;
  }

  /* TEXTAREA */
  .aa-textarea-wrap { position:relative; }
  .aa-textarea {
    width:100%; min-height:200px;
    padding:16px; padding-top:40px;
    background: rgba(8,8,14,0.6);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius:12px;
    color:var(--text);
    font-family:'JetBrains Mono',monospace;
    font-size:13px; line-height:1.7;
    outline:none; resize:vertical;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .aa-textarea:focus {
    border-color: rgba(99,102,241,0.6);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1), 0 0 20px rgba(99,102,241,0.05);
  }
  .aa-textarea::placeholder { color:#475569; font-family:'Inter',sans-serif; }
  .aa-textarea-label {
    position:absolute; top:12px; left:14px;
    font-size:10px; font-weight:600; letter-spacing:0.08em;
    text-transform:uppercase; color:rgba(99,102,241,0.7);
    pointer-events:none;
  }
  .aa-char-count {
    position:absolute; bottom:10px; right:12px;
    font-size:10px; color:var(--muted);
    font-family:'JetBrains Mono',monospace;
  }

  /* ANALYZE BUTTON */
  .aa-btn {
    width:100%; padding:13px;
    background: linear-gradient(135deg, #6366F1, #818CF8);
    border:none; border-radius:10px;
    color:white; font-family:'Inter',sans-serif;
    font-size:14px; font-weight:600;
    cursor:pointer; margin-top:14px;
    position:relative; overflow:hidden;
    transition:all 0.2s;
    box-shadow: 0 0 24px rgba(99,102,241,0.3);
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .aa-btn::before {
    content:'';
    position:absolute; inset:0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
    opacity:0; transition:opacity 0.2s;
  }
  .aa-btn:hover::before { opacity:1; }
  .aa-btn:hover { transform:translateY(-2px); box-shadow:0 0 32px rgba(99,102,241,0.5); }
  .aa-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .aa-btn-shimmer {
    position:absolute; inset:0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transform:translateX(-100%);
    animation: shimmer-btn 1.5s infinite;
  }
  @keyframes shimmer-btn { to { transform:translateX(100%); } }

  /* RESULT */
  .aa-result {
    margin-top:18px;
    background: rgba(8,8,14,0.5);
    border: 1px solid rgba(99,102,241,0.15);
    border-radius:12px;
    padding:20px;
    position:relative;
    overflow:hidden;
  }
  .aa-result::before {
    content:'';
    position:absolute; top:0; left:0; right:0; height:1px;
    background: linear-gradient(90deg, rgba(99,102,241,0.5), transparent);
  }
  .aa-result-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 10px; margin-bottom:14px;
    background:rgba(99,102,241,0.12);
    border:1px solid rgba(99,102,241,0.25);
    border-radius:20px; font-size:10px; font-weight:600;
    letter-spacing:0.05em; color:var(--accent3);
  }
  .aa-result-text {
    font-size:13px; line-height:1.8; color:#CBD5E1;
    font-family:'Inter',sans-serif;
    white-space:pre-wrap;
  }
  .aa-cursor {
    display:inline-block; width:2px; height:14px;
    background:var(--accent2); margin-left:1px;
    vertical-align:middle;
    animation:blink 0.8s step-end infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* SIDEBAR SECTIONS */
  .aa-sidebar-title {
    font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600;
    color:var(--text); margin-bottom:14px;
    display:flex; align-items:center; gap:8px;
  }
  .aa-sidebar-divider { height:1px; background:rgba(30,30,48,0.8); margin:16px 0; }

  /* COMPLEXITY BADGES */
  .aa-complexity-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .aa-complexity-card {
    background:rgba(8,8,14,0.5); border:1px solid rgba(30,30,48,0.8);
    border-radius:10px; padding:12px; text-align:center;
    transition:border-color 0.2s;
  }
  .aa-complexity-card:hover { border-color:rgba(99,102,241,0.3); }
  .aa-complexity-label { font-size:10px; color:var(--muted); margin-bottom:4px; letter-spacing:0.05em; text-transform:uppercase; }
  .aa-complexity-value { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:600; color:var(--accent2); }

  /* TIPS */
  .aa-tip {
    display:flex; gap:10px; padding:10px 12px;
    background:rgba(8,8,14,0.4); border:1px solid rgba(30,30,48,0.6);
    border-radius:9px; margin-bottom:8px; cursor:pointer;
    transition:all 0.15s;
  }
  .aa-tip:hover { border-color:rgba(99,102,241,0.3); background:rgba(99,102,241,0.05); }
  .aa-tip:last-child { margin-bottom:0; }
  .aa-tip-icon { font-size:14px; flex-shrink:0; margin-top:1px; }
  .aa-tip-text { font-size:11px; color:#94A3B8; line-height:1.5; }

  /* HISTORY */
  .aa-history-item {
    padding:8px 10px; border-radius:8px;
    background:rgba(8,8,14,0.4); border:1px solid rgba(30,30,48,0.5);
    margin-bottom:6px; cursor:pointer; transition:all 0.15s;
  }
  .aa-history-item:hover { border-color:rgba(99,102,241,0.3); }
  .aa-history-item:last-child { margin-bottom:0; }
  .aa-history-code { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .aa-history-time { font-size:10px; color:#475569; margin-top:2px; }

  /* SPINNER */
  .aa-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.25); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }

  /* EMPTY */
  .aa-empty { text-align:center; padding:32px 20px; color:var(--muted); }
  .aa-empty-icon { font-size:36px; margin-bottom:10px; opacity:0.4; }
  .aa-empty-text { font-size:13px; line-height:1.6; }

  @media(max-width:900px) {
    .aa-layout { grid-template-columns:1fr; }
    .aa-sidebar-glass { position:static; }
  }
`

// Typing effect hook
function useTypingEffect(text, speed = 8) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone]           = useState(false)

  useEffect(() => {
    if (!text) { setDisplayed(''); setDone(false); return }
    setDisplayed(''); setDone(false)
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        setDone(true)
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return { displayed, done }
}

// Extract complexity from AI response
function extractComplexity(text) {
  if (!text) return { time: null, space: null }
  const timeMatch  = text.match(/time[^:]*:\s*O\([^)]+\)/i)
  const spaceMatch = text.match(/space[^:]*:\s*O\([^)]+\)/i)
  const time  = timeMatch  ? timeMatch[0].match(/O\([^)]+\)/)[0]  : null
  const space = spaceMatch ? spaceMatch[0].match(/O\([^)]+\)/)[0] : null
  return { time, space }
}

const TIPS = [
  { icon: '💡', text: 'Try Two Pointers for sorted array problems — often reduces O(n²) to O(n)' },
  { icon: '🗺️', text: 'HashMap for O(1) lookup — great for "find pair" type problems' },
  { icon: '🔁', text: 'Sliding Window for subarray/substring problems with a constraint' },
  { icon: '🌳', text: 'Recursion + Memoization = Dynamic Programming. Think top-down first' },
  { icon: '⚡', text: 'Binary Search works on any monotonic function, not just sorted arrays' },
]

const EXAMPLES = [
  'for i in range(n):\n  for j in range(n):\n    if arr[i] + arr[j] == target:\n      return [i, j]',
  'def dfs(node, visited):\n  visited.add(node)\n  for neighbor in graph[node]:\n    if neighbor not in visited:\n      dfs(neighbor, visited)',
  'while low <= high:\n  mid = (low + high) // 2\n  if arr[mid] == target: return mid\n  elif arr[mid] < target: low = mid + 1\n  else: high = mid - 1',
]

export default function ApproachAnalyzer() {
  const [code, setCode]           = useState('')
  const [rawResult, setRawResult] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [history, setHistory]     = useState([])
  const textareaRef               = useRef(null)

  const { displayed, done } = useTypingEffect(rawResult, 6)
  const complexity = extractComplexity(rawResult)

  const analyze = async () => {
    if (!code.trim() || analyzing) return
    setAnalyzing(true); setRawResult('')
    try {
      const result = await askGemini(
        `You are a DSA expert. Analyze this code/pseudocode concisely:

1. Time Complexity: state Big-O with brief reason
2. Space Complexity: state Big-O with brief reason  
3. Is it optimal? If not, suggest the better approach in 1-2 lines
4. Verdict: one of — ✅ Optimal | ⚠️ Can Improve | ❌ Needs Rethink

Keep it under 150 words. Be direct, no fluff. Plain text only.

Code:
${code}`
      )
      setRawResult(result)
      setHistory(h => [{ code: code.split('\n')[0], time: new Date().toLocaleTimeString(), result }, ...h.slice(0,4)])
    } catch(e) {
      setRawResult('Error connecting to AI. Check your API key and try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const loadExample = (ex) => { setCode(ex); setRawResult(''); textareaRef.current?.focus() }
  const loadHistory = (item) => { setCode(item.code); setRawResult(item.result) }

  return (
    <>
      <style>{css}</style>
      <div className="aa-page">

        {/* Header */}
        <div className="aa-header">
          <div>
            <h1>Approach Analyzer</h1>
            <p>Paste your code or pseudocode — AI will analyze time & space complexity</p>
          </div>
        </div>

        <div className="aa-layout">

          {/* Left — Main analyzer */}
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <motion.div className="aa-glass" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>
              <div className="aa-glass-line"/>

              {/* Textarea */}
              <div className="aa-textarea-wrap">
                <div className="aa-textarea-label">✦ Your Code / Pseudocode</div>
                <textarea
                  ref={textareaRef}
                  className="aa-textarea"
                  placeholder={`Paste your approach here...\n\nExample:\nfor i in range(n):\n  for j in range(n):\n    check arr[i] + arr[j]`}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
                <div className="aa-char-count">{code.length} chars</div>
              </div>

              {/* Example buttons */}
              <div style={{display:'flex',gap:'6px',marginTop:'10px',flexWrap:'wrap'}}>
                <span style={{fontSize:'11px',color:'var(--muted)',alignSelf:'center'}}>Try example:</span>
                {['Brute Force O(n²)', 'Graph DFS', 'Binary Search'].map((label,i) => (
                  <button key={i} onClick={() => loadExample(EXAMPLES[i])} style={{
                    padding:'4px 10px', background:'rgba(99,102,241,0.08)',
                    border:'1px solid rgba(99,102,241,0.2)', borderRadius:'6px',
                    fontSize:'11px', color:'var(--accent3)', cursor:'pointer',
                    transition:'all 0.15s',
                  }}
                  onMouseEnter={e=>e.target.style.background='rgba(99,102,241,0.15)'}
                  onMouseLeave={e=>e.target.style.background='rgba(99,102,241,0.08)'}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Analyze button */}
              <button className="aa-btn" onClick={analyze} disabled={analyzing || !code.trim()}>
                {analyzing && <span className="aa-btn-shimmer"/>}
                {analyzing
                  ? <><span className="aa-spinner"/> Analyzing your approach...</>
                  : '✦ Analyze Complexity'
                }
              </button>

              {/* Result with typing effect */}
              <AnimatePresence>
                {(rawResult || analyzing) && (
                  <motion.div className="aa-result"
                    initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                    transition={{duration:0.3}}>
                    <div className="aa-result-badge">✦ AI Analysis</div>
                    <div className="aa-result-text">
                      {analyzing && !rawResult
                        ? <span style={{color:'var(--muted)'}}>Thinking<span className="aa-cursor"/></span>
                        : <>{displayed}{!done && <span className="aa-cursor"/>}</>
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right — Sidebar */}
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

            {/* Complexity Display */}
            <motion.div className="aa-sidebar-glass" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{duration:0.3,delay:0.1}}>
              <div className="aa-sidebar-title">
                <span>⚡</span> Complexity
              </div>
              <div className="aa-complexity-grid">
                <div className="aa-complexity-card">
                  <div className="aa-complexity-label">Time</div>
                  <div className="aa-complexity-value">
                    {complexity.time || <span style={{color:'var(--muted)',fontSize:'12px'}}>—</span>}
                  </div>
                </div>
                <div className="aa-complexity-card">
                  <div className="aa-complexity-label">Space</div>
                  <div className="aa-complexity-value">
                    {complexity.space || <span style={{color:'var(--muted)',fontSize:'12px'}}>—</span>}
                  </div>
                </div>
              </div>

              <div className="aa-sidebar-divider"/>

              {/* DSA Tips */}
              <div className="aa-sidebar-title">
                <span>💡</span> Quick Tips
              </div>
              {TIPS.map((tip,i) => (
                <div key={i} className="aa-tip">
                  <span className="aa-tip-icon">{tip.icon}</span>
                  <span className="aa-tip-text">{tip.text}</span>
                </div>
              ))}
            </motion.div>

            {/* History */}
            {history.length > 0 && (
              <motion.div className="aa-sidebar-glass" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{duration:0.3,delay:0.2}}>
                <div className="aa-sidebar-title">
                  <span>◷</span> Recent Analyses
                </div>
                {history.map((item,i) => (
                  <div key={i} className="aa-history-item" onClick={() => loadHistory(item)}>
                    <div className="aa-history-code">{item.code}</div>
                    <div className="aa-history-time">{item.time}</div>
                  </div>
                ))}
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}