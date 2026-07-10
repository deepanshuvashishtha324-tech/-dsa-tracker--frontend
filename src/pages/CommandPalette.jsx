import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const css = `
  .cp-overlay {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(6px);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 18vh;
  }
  .cp-box {
    background: #13131F;
    border: 1px solid #2E2E45;
    border-radius: 14px;
    width: 100%; max-width: 540px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1);
    overflow: hidden;
  }
  .cp-input-wrap {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px;
    border-bottom: 1px solid #1E1E30;
  }
  .cp-search-icon { font-size: 16px; color: #64748B; flex-shrink: 0; }
  .cp-input {
    flex: 1; background: transparent; border: none; outline: none;
    font-family: 'Inter', sans-serif; font-size: 14px; color: #F1F5F9;
    caret-color: #6366F1;
  }
  .cp-input::placeholder { color: #64748B; }
  .cp-kbd {
    padding: 2px 6px; background: #1E1E30; border: 1px solid #2E2E45;
    border-radius: 5px; font-size: 10px; color: #64748B;
    font-family: 'JetBrains Mono', monospace; flex-shrink: 0;
  }
  .cp-results { max-height: 360px; overflow-y: auto; padding: 6px; }
  .cp-results::-webkit-scrollbar { width: 4px; }
  .cp-results::-webkit-scrollbar-thumb { background: #1E1E30; border-radius: 4px; }
  .cp-section-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: #64748B;
    padding: 8px 12px 4px;
  }
  .cp-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 8px;
    cursor: pointer; transition: background 0.1s;
    border: 1px solid transparent;
  }
  .cp-item:hover, .cp-item.selected {
    background: rgba(99,102,241,0.08);
    border-color: rgba(99,102,241,0.15);
  }
  .cp-item-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
    background: rgba(99,102,241,0.1);
  }
  .cp-item-info { flex: 1; min-width: 0; }
  .cp-item-label {
    font-size: 13px; font-weight: 500; color: #F1F5F9;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-item-sub { font-size: 11px; color: #64748B; margin-top: 1px; }
  .cp-item-badge {
    font-size: 10px; padding: 2px 7px; border-radius: 4px;
    background: rgba(99,102,241,0.12); color: #A5B4FC;
    border: 1px solid rgba(99,102,241,0.2); flex-shrink: 0;
  }
  .cp-empty {
    text-align: center; padding: 32px 20px;
    color: #64748B; font-size: 13px;
  }
  .cp-empty-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.5; }
  .cp-footer {
    padding: 8px 16px;
    border-top: 1px solid #1E1E30;
    display: flex; align-items: center; gap: 12px;
  }
  .cp-footer-hint { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748B; }
  .cp-highlight { color: #818CF8; font-weight: 600; }

  @media (max-width: 600px) {
    .cp-overlay { padding-top: 10vh; padding: 10vh 12px 0; }
    .cp-box { max-width: 100%; }
  }
`

export default function CommandPalette({ isOpen, onClose, setActiveNav, setShowModal, problems }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // ── Commands ──────────────────────────────────────────────────────────────
  const commands = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard',  label: 'Dashboard',       sub: 'Go to main dashboard',     icon: '⬡', badge: 'Navigate', color: '#6366F1', action: () => setActiveNav('Dashboard') },
    { id: 'nav-problems',   label: 'Problems',        sub: 'View all problems',         icon: '◈', badge: 'Navigate', color: '#818CF8', action: () => setActiveNav('Problems') },
    { id: 'nav-analytics',  label: 'Analytics',       sub: 'Charts & insights',         icon: '◎', badge: 'Navigate', color: '#22C55E', action: () => setActiveNav('Analytics') },
    { id: 'nav-topics',     label: 'Topics',          sub: 'Topic breakdown',           icon: '⬟', badge: 'Navigate', color: '#A5B4FC', action: () => setActiveNav('Topics') },
    { id: 'nav-ai',         label: 'AI Advisor',      sub: 'Approach analyzer & roast', icon: '✦', badge: 'Navigate', color: '#F97316', action: () => setActiveNav('AI Advisor') },
    { id: 'nav-revision',   label: 'Revision Queue',  sub: 'Spaced repetition',         icon: '◷', badge: 'Navigate', color: '#F43F5E', action: () => setActiveNav('Revision Queue') },
    { id: 'nav-contests',   label: 'Contests',        sub: 'Contest tracker',           icon: '↗', badge: 'Navigate', color: '#FBBF24', action: () => setActiveNav('Contests') },
    // Actions
    { id: 'action-log',     label: 'Log Problem',     sub: 'Add a new problem',         icon: '+', badge: 'Action',   color: '#6366F1', action: () => setShowModal(true) },
  ], [setActiveNav, setShowModal])

  // ── Recent Problems as commands ───────────────────────────────────────────
  const problemCommands = useMemo(() =>
    (problems || []).slice(0, 5).map(p => ({
      id: `prob-${p.id}`,
      label: p.name || 'Unnamed',
      sub: `${p.difficulty || '—'} · ${p.topic || '—'} · ${p.status || 'Pending'}`,
      icon: p.difficulty?.toLowerCase() === 'easy' ? '🟢' :
            p.difficulty?.toLowerCase() === 'hard' ? '🔴' : '🟡',
      badge: 'Problem',
      color: '#64748B',
      action: () => setActiveNav('Problems'),
    }))
  , [problems])

  // ── Filtered results ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return { commands, problems: problemCommands }
    return {
      commands: commands.filter(c =>
        c.label.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q)
      ),
      problems: problemCommands.filter(c =>
        c.label.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q)
      ),
    }
  }, [query, commands, problemCommands])

  const allItems = [...filtered.commands, ...filtered.problems]

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setQuery(''); setSelected(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (allItems[selected]) { allItems[selected].action(); onClose() }
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, selected, allItems, onClose])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector('.selected')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const handleSelect = (item) => { item.action(); onClose() }

  const highlight = (text) => {
    if (!query.trim()) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="cp-highlight">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  let globalIdx = 0

  return (
    <>
      <style>{css}</style>
      <AnimatePresence>
        {isOpen && (
          <motion.div className="cp-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div className="cp-box"
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}>

              {/* Search Input */}
              <div className="cp-input-wrap">
                <span className="cp-search-icon">⌕</span>
                <input
                  ref={inputRef}
                  className="cp-input"
                  placeholder="Search pages, actions, problems..."
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(0) }}
                />
                <span className="cp-kbd">ESC</span>
              </div>

              {/* Results */}
              <div className="cp-results" ref={listRef}>
                {allItems.length === 0 ? (
                  <div className="cp-empty">
                    <div className="cp-empty-icon">🔍</div>
                    No results for "{query}"
                  </div>
                ) : (
                  <>
                    {filtered.commands.length > 0 && (
                      <>
                        <div className="cp-section-label">Pages & Actions</div>
                        {filtered.commands.map(item => {
                          const idx = globalIdx++
                          return (
                            <div key={item.id}
                              className={`cp-item${selected === idx ? ' selected' : ''}`}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelected(idx)}>
                              <div className="cp-item-icon" style={{ background: `${item.color}18` }}>
                                <span style={{ color: item.color }}>{item.icon}</span>
                              </div>
                              <div className="cp-item-info">
                                <div className="cp-item-label">{highlight(item.label)}</div>
                                <div className="cp-item-sub">{item.sub}</div>
                              </div>
                              <span className="cp-item-badge">{item.badge}</span>
                            </div>
                          )
                        })}
                      </>
                    )}

                    {filtered.problems.length > 0 && (
                      <>
                        <div className="cp-section-label">Recent Problems</div>
                        {filtered.problems.map(item => {
                          const idx = globalIdx++
                          return (
                            <div key={item.id}
                              className={`cp-item${selected === idx ? ' selected' : ''}`}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelected(idx)}>
                              <div className="cp-item-icon" style={{ background: 'rgba(100,116,139,0.1)' }}>
                                <span>{item.icon}</span>
                              </div>
                              <div className="cp-item-info">
                                <div className="cp-item-label">{highlight(item.label)}</div>
                                <div className="cp-item-sub">{item.sub}</div>
                              </div>
                              <span className="cp-item-badge" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748B', borderColor: '#1E1E30' }}>{item.badge}</span>
                            </div>
                          )
                        })}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Footer hints */}
              <div className="cp-footer">
                <div className="cp-footer-hint"><span className="cp-kbd">↑↓</span> Navigate</div>
                <div className="cp-footer-hint"><span className="cp-kbd">↵</span> Select</div>
                <div className="cp-footer-hint"><span className="cp-kbd">ESC</span> Close</div>
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748B' }}>
                  {allItems.length} result{allItems.length !== 1 ? 's' : ''}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}