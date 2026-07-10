import React, { useState, useMemo, useEffect,Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { auth } from '../firebase'
const AnalyticsPage    = React.lazy(() => import('./Analytics'))
const CommandPalette   = React.lazy(() => import('./CommandPalette'))
const ProfilePage      = React.lazy(() => import('./ProfilePage'))
const ApproachAnalyzer = React.lazy(() => import('./ApproachAnalyzer'))
const LeetCodeSync     = React.lazy(() => import('./LeetCodeSync'))
import { signOut } from 'firebase/auth'
import { askGemini } from '../geminiService.js'

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#08080E; --surface:#0F0F1A; --card:#13131F; --border:#1E1E30;
    --accent:#6366F1; --accent2:#818CF8; --accent3:#A5B4FC;
    --ember:#F97316; --green:#22C55E; --red:#F43F5E;
    --text:#F1F5F9; --muted:#64748B; --subtle:#1E293B;
  }
  html,body,#root { background:var(--bg); color:var(--text); font-family:'Inter',sans-serif; min-height:100vh; font-size:14px; line-height:1.5; }
  ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
  @keyframes pulse-ember { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.8)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(-10px)} to{opacity:1;transform:scale(1) translateY(0)} }

  .dsa-shell { display:grid; grid-template-columns:220px 1fr; grid-template-rows:56px 1fr; min-height:100vh; }
  .dsa-topbar { grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--border); background:var(--bg); position:sticky; top:0; z-index:10; }
  .dsa-logo { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:16px; letter-spacing:-0.02em; color:var(--text); display:flex; align-items:center; gap:8px; }
  .dsa-logo-dot { width:7px; height:7px; border-radius:50%; background:var(--accent); box-shadow:0 0 10px var(--accent); }
  .dsa-tagline { font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); }
  .dsa-avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--accent2)); display:flex; align-items:center; justify-content:center; font-family:'Space Grotesk',sans-serif; font-size:12px; font-weight:700; color:white; cursor:pointer; }
  .dsa-sidebar { border-right:1px solid var(--border); padding:24px 0; display:flex; flex-direction:column; gap:2px; background:var(--bg); overflow-y:auto; }
  .dsa-nav-label { font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); padding:8px 20px 6px; margin-top:8px; }
  .dsa-nav-item { display:flex; align-items:center; gap:10px; padding:9px 20px; cursor:pointer; font-size:13px; transition:all 0.15s; border-left:2px solid transparent; }
  .dsa-nav-item:hover { color:var(--text); background:var(--surface); }
  .dsa-nav-item.active { color:var(--text); background:var(--surface); border-left:2px solid var(--accent); font-weight:500; box-shadow:inset 4px 0 8px rgba(99,102,241,0.08); }
  .dsa-sidebar-bottom { margin-top:auto; padding:16px 20px; border-top:1px solid var(--border); }
  .dsa-level-badge { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; }
  .dsa-level-bar { height:3px; background:var(--border); border-radius:2px; margin-top:5px; overflow:hidden; }
  .dsa-level-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:2px; }
  .dsa-main { padding:28px; overflow-y:auto; display:flex; flex-direction:column; gap:24px; width:100%; box-sizing:border-box; will-change:transform; }
  .dsa-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px 22px; position:relative; overflow:hidden; transition:border-color 0.2s; }
  .dsa-card-title { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; color:var(--text); }
  .dsa-card-meta { font-size:11px; color:var(--muted); font-family:'Inter',sans-serif; font-weight:400; }
  .dsa-stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .dsa-stat-label { font-size:11px; font-weight:500; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
  .dsa-stat-value { font-family:'Space Grotesk',sans-serif; font-size:28px; font-weight:700; letter-spacing:-0.04em; line-height:1; }
  .dsa-stat-sub { font-size:11px; color:var(--muted); margin-top:5px; }
  .dsa-streak-card { background:var(--card); border:1px solid rgba(249,115,22,0.25); border-radius:12px; padding:18px 20px; position:relative; overflow:hidden; }
  .dsa-streak-glow { position:absolute; inset:0; background:radial-gradient(ellipse at 20% 50%,rgba(249,115,22,0.08) 0%,transparent 65%); pointer-events:none; }
  .dsa-streak-line { position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,rgba(249,115,22,0.6),rgba(249,115,22,0.1),transparent); }
  .dsa-ember-dots { display:flex; gap:3px; margin-top:8px; }
  .dsa-ember-dot { width:6px; height:6px; border-radius:50%; background:var(--ember); opacity:0.2; }
  .dsa-ember-dot.lit { opacity:1; box-shadow:0 0 6px rgba(249,115,22,0.8); animation:pulse-ember 1.5s ease-in-out infinite; }
  .dsa-add-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; background:var(--accent); color:white; border:none; border-radius:7px; font-family:'Inter',sans-serif; font-size:13px; font-weight:500; cursor:pointer; box-shadow:0 0 20px rgba(99,102,241,0.3); transition:all 0.15s; }
  .dsa-add-btn:hover { background:var(--accent2); box-shadow:0 0 28px rgba(99,102,241,0.5); transform:translateY(-1px); }
  .dsa-heatmap-months { display:flex; padding-left:22px; margin-bottom:4px; }
  .dsa-heatmap-grid { display:flex; gap:3px; align-items:flex-start; }
  .dsa-heatmap-days { display:flex; flex-direction:column; gap:3px; margin-right:4px; }
  .dsa-day-label { font-size:9px; color:var(--muted); height:11px; line-height:11px; width:14px; text-align:right; }
  .dsa-heatmap-weeks { display:flex; gap:3px; flex:1; overflow:hidden; }
  .dsa-heatmap-week { display:flex; flex-direction:column; gap:3px; flex-shrink:0; }
  .dsa-heatmap-cell { width:11px; height:11px; border-radius:2px; background:var(--subtle); cursor:pointer; transition:transform 0.1s; }
  .dsa-heatmap-cell:hover { transform:scale(1.5); }
  .dsa-heatmap-cell.l1{background:#1e1b4b} .dsa-heatmap-cell.l2{background:#3730a3}
  .dsa-heatmap-cell.l3{background:var(--accent)} .dsa-heatmap-cell.l4{background:var(--accent2);box-shadow:0 0 4px rgba(99,102,241,0.5)}
  .dsa-mid { display:grid; grid-template-columns:1fr 360px; gap:14px; }
  .dsa-bottom { display:grid; grid-template-columns:1fr 320px; gap:14px; }
  .dsa-topic-bar { height:4px; background:var(--border); border-radius:3px; overflow:hidden; margin-top:5px; }
  .dsa-topic-fill { height:100%; border-radius:3px; transition:width 0.8s ease; }
  .dsa-table { width:100%; border-collapse:collapse; margin-top:4px; }
  .dsa-table th { text-align:left; font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); padding:0 12px 10px; border-bottom:1px solid var(--border); }
  .dsa-table td { padding:11px 12px; font-size:12px; color:var(--text); vertical-align:middle; }
  .dsa-table tr:not(:last-child) td { border-bottom:1px solid rgba(30,30,48,0.6); }
  .dsa-table tr:hover td { background:rgba(99,102,241,0.04); }
  .dsa-diff-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:600; letter-spacing:0.04em; }
  .dsa-pattern-tag { display:inline-flex; padding:2px 7px; border-radius:4px; font-size:10px; background:rgba(99,102,241,0.1); color:var(--accent3); border:1px solid rgba(99,102,241,0.2); }
  .dsa-status-dot { display:inline-flex; align-items:center; gap:5px; font-size:11px; }
  .dsa-dot { width:5px; height:5px; border-radius:50%; }
  .dsa-ai-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); border-radius:20px; font-size:10px; font-weight:600; letter-spacing:0.05em; color:var(--accent3); margin-bottom:12px; }
  .dsa-insight-text { font-size:13px; line-height:1.65; color:#C4CCDC; }
  .dsa-insight-divider { height:1px; background:var(--border); margin:14px 0; }
  .dsa-action-item { display:flex; align-items:center; gap:8px; padding:9px 12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; cursor:pointer; transition:border-color 0.15s; margin-bottom:8px; }
  .dsa-action-item:last-child{margin-bottom:0} .dsa-action-item:hover{border-color:rgba(99,102,241,0.4)}
  .dsa-loader { width:20px; height:20px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin 0.7s linear infinite; margin:40px auto; }
  .dsa-skeleton { background:linear-gradient(90deg,var(--surface) 25%,var(--card) 50%,var(--surface) 75%); background-size:200% 100%; animation:shimmer 1.2s infinite; border-radius:8px; }
  .dsa-skeleton-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .dsa-skeleton-card { height:100px; border-radius:12px; }
  .dsa-skeleton-wide { height:200px; border-radius:12px; margin-bottom:24px; }
  .dsa-empty { text-align:center; color:var(--muted); font-size:13px; padding:32px 0; }
  .dsa-empty-icon { font-size:32px; margin-bottom:10px; opacity:0.6; }
  .dsa-empty-title { font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:600; color:var(--text); margin-bottom:6px; }
  .dsa-empty-sub { font-size:12px; color:var(--muted); line-height:1.6; }
  .dsa-empty-btn { display:inline-flex; align-items:center; gap:6px; margin-top:14px; padding:7px 14px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); border-radius:7px; font-size:12px; font-weight:500; color:var(--accent3); cursor:pointer; transition:all 0.15s; }
  .dsa-empty-btn:hover { background:rgba(99,102,241,0.2); border-color:rgba(99,102,241,0.4); }

  /* PAGE TRANSITION WRAPPER */
  .dsa-page-wrap { display:flex; flex-direction:column; gap:24px; }

  /* BETTER TOAST */
  .dsa-toast-wrap { position:fixed; bottom:24px; right:24px; z-index:200; display:flex; flex-direction:column; gap:8px; }
  .dsa-toast { padding:12px 16px; border-radius:10px; font-size:13px; font-weight:500; display:flex; align-items:center; gap:10px; min-width:220px; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
  .dsa-toast-success { background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); color:#4ade80; }
  .dsa-toast-error   { background:rgba(244,63,94,0.15);  border:1px solid rgba(244,63,94,0.3);  color:#fb7185; }
  .dsa-toast-icon { font-size:16px; }
  .dsa-toast-close { margin-left:auto; cursor:pointer; opacity:0.6; font-size:14px; }
  .dsa-toast-close:hover { opacity:1; }

  /* BETTER LOADING STATES */
  .dsa-btn-loading { position:relative; pointer-events:none; }
  .dsa-btn-loading::after { content:''; position:absolute; right:12px; top:50%; transform:translateY(-50%); width:12px; height:12px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }

  /* TRANSITION STATES */
  .dsa-saving-overlay { position:absolute; inset:0; background:rgba(8,8,14,0.6); backdrop-filter:blur(2px); display:flex; align-items:center; justify-content:center; border-radius:12px; z-index:5; }
  .dsa-saving-text { font-size:12px; color:var(--accent3); display:flex; align-items:center; gap:8px; }
  .dsa-overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; }
  .dsa-modal { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:28px; width:100%; max-width:460px; animation:modalIn 0.2s ease; position:relative; max-height:90vh; overflow-y:auto; }
  .dsa-modal-title { font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:700; letter-spacing:-0.02em; color:var(--text); margin-bottom:4px; }
  .dsa-modal-sub { font-size:12px; color:var(--muted); margin-bottom:24px; }
  .dsa-field { margin-bottom:16px; }
  .dsa-field label { display:block; font-size:11px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
  .dsa-input { width:100%; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--text); font-family:'Inter',sans-serif; font-size:13px; outline:none; transition:border-color 0.15s; }
  .dsa-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
  .dsa-input::placeholder { color:var(--muted); }
  .dsa-select { width:100%; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--text); font-family:'Inter',sans-serif; font-size:13px; outline:none; cursor:pointer; transition:border-color 0.15s; appearance:none; }
  .dsa-select:focus { border-color:var(--accent); }
  .dsa-field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .dsa-timer-display { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:8px; margin-bottom:6px; }
  .dsa-timer-value { font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:500; color:var(--accent2); letter-spacing:0.05em; }
  .dsa-timer-btns { display:flex; gap:8px; }
  .dsa-timer-btn { padding:5px 12px; border-radius:6px; border:none; font-size:11px; font-weight:600; cursor:pointer; transition:all 0.15s; }
  .dsa-timer-btn.start{background:rgba(34,197,94,0.15);color:#4ade80} .dsa-timer-btn.start:hover{background:rgba(34,197,94,0.25)}
  .dsa-timer-btn.stop{background:rgba(244,63,94,0.15);color:#fb7185} .dsa-timer-btn.stop:hover{background:rgba(244,63,94,0.25)}
  .dsa-timer-btn.reset{background:var(--border);color:var(--muted)}
  .dsa-timer-running { font-size:10px; color:#4ade80; display:flex; align-items:center; gap:4px; }
  .dsa-timer-running::before { content:''; width:6px; height:6px; border-radius:50%; background:#4ade80; box-shadow:0 0 5px #4ade80; animation:pulse-ember 1s infinite; }
  .dsa-modal-footer { display:flex; gap:10px; margin-top:24px; }
  .dsa-cancel-btn { flex:1; padding:10px; background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--muted); font-family:'Inter',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.15s; }
  .dsa-cancel-btn:hover { color:var(--text); border-color:#2E2E45; }
  .dsa-submit-btn { flex:2; padding:10px; background:var(--accent); border:none; border-radius:8px; color:white; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; box-shadow:0 0 16px rgba(99,102,241,0.3); }
  .dsa-submit-btn:hover { background:var(--accent2); transform:translateY(-1px); }
  .dsa-submit-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .dsa-close-btn { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:6px; background:var(--surface); border:1px solid var(--border); color:var(--muted); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .dsa-close-btn:hover { color:var(--text); }
  .dsa-success-toast { position:fixed; bottom:24px; right:24px; z-index:200; padding:12px 18px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); border-radius:10px; font-size:13px; font-weight:500; color:#4ade80; display:flex; align-items:center; gap:8px; animation:fadeIn 0.3s ease; }
  .dsa-tabs { display:flex; gap:4px; margin-bottom:20px; background:var(--surface); padding:4px; border-radius:10px; }
  .dsa-tab { flex:1; padding:8px 12px; border:none; border-radius:7px; font-family:'Inter',sans-serif; font-size:12px; font-weight:500; cursor:pointer; transition:all 0.15s; background:transparent; color:var(--muted); }
  .dsa-tab.active { background:var(--card); color:var(--text); box-shadow:0 1px 3px rgba(0,0,0,0.3); }
  .dsa-textarea { width:100%; padding:12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--text); font-family:'JetBrains Mono',monospace; font-size:12px; outline:none; resize:vertical; min-height:120px; transition:border-color 0.15s; line-height:1.6; }
  .dsa-textarea:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
  .dsa-textarea::placeholder { color:var(--muted); font-family:'Inter',sans-serif; }
  .dsa-ai-result { margin-top:16px; padding:16px; background:var(--surface); border:1px solid var(--border); border-radius:10px; font-size:13px; line-height:1.7; color:#C4CCDC; white-space:pre-wrap; }
  .dsa-run-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:11px; background:linear-gradient(135deg,var(--accent),var(--accent2)); border:none; border-radius:8px; color:white; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; margin-top:12px; transition:all 0.15s; box-shadow:0 0 20px rgba(99,102,241,0.25); }
  .dsa-run-btn:hover { opacity:0.9; transform:translateY(-1px); }
  .dsa-run-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .dsa-ai-spinner { width:14px; height:14px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin 0.7s linear infinite; }
  .dsa-insight-card { background:linear-gradient(135deg,rgba(99,102,241,0.05),rgba(129,140,248,0.03)); border:1px solid rgba(99,102,241,0.2); border-radius:10px; padding:16px; margin-top:12px; }
  .dsa-insight-header { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
  .dsa-insight-body { font-size:13px; line-height:1.75; color:#C4CCDC; white-space:pre-wrap; }
  .dsa-week-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
  .dsa-week-stat { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:10px 12px; text-align:center; }
  .dsa-week-stat-val { font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; color:var(--accent2); }
  .dsa-week-stat-label { font-size:10px; color:var(--muted); margin-top:2px; }
  .dsa-reminders { display:flex; flex-direction:column; gap:8px; }
  .dsa-reminder-item { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:8px; transition:border-color 0.15s; }
  .dsa-reminder-item:hover { border-color:rgba(249,115,22,0.4); }
  .dsa-reminder-left { display:flex; align-items:center; gap:10px; }
  .dsa-reminder-topic { font-size:12px; font-weight:600; color:var(--text); }
  .dsa-reminder-msg { font-size:11px; color:var(--muted); margin-top:1px; }
  .dsa-reminder-badge { padding:3px 8px; border-radius:20px; font-size:10px; font-weight:600; }
  .dsa-reminder-urgent { background:rgba(244,63,94,0.12); color:#fb7185; border:1px solid rgba(244,63,94,0.2); }
  .dsa-reminder-warn { background:rgba(249,115,22,0.12); color:#fb923c; border:1px solid rgba(249,115,22,0.2); }
  .dsa-reminder-info { background:rgba(99,102,241,0.12); color:var(--accent3); border:1px solid rgba(99,102,241,0.2); }
  .dsa-no-reminders { text-align:center; padding:20px; color:var(--green); font-size:13px; }
  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .dsa-shell {
      grid-template-columns: 1fr;
      grid-template-rows: 56px auto 1fr;
    }
    .dsa-topbar { padding: 0 16px; }
    .dsa-tagline { display: none; }
    .dsa-sidebar {
      grid-row: 2;
      flex-direction: row;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 8px 12px;
      border-right: none;
      border-bottom: 1px solid var(--border);
      gap: 4px;
      min-height: unset;
    }
    .dsa-nav-label { display: none; }
    .dsa-nav-item {
      padding: 7px 12px;
      border-left: none !important;
      border-bottom: 2px solid transparent;
      border-radius: 8px;
      white-space: nowrap;
      flex-shrink: 0;
      font-size: 12px;
      box-shadow: none !important;
    }
    .dsa-nav-item.active {
      border-left: none !important;
      border-bottom: 2px solid var(--accent) !important;
      background: var(--surface);
    }
    .dsa-sidebar-bottom { display: none; }
    .dsa-main { padding: 16px; gap: 16px; }
    .dsa-stats-row { grid-template-columns: 1fr 1fr; gap: 10px; }
    .dsa-streak-card { padding: 14px 16px; }
    .dsa-mid { grid-template-columns: 1fr; }
    .dsa-bottom { grid-template-columns: 1fr; }
    .dsa-card { padding: 16px; }
    .dsa-heatmap-weeks { overflow-x: auto; }
    .dsa-table th, .dsa-table td { padding: 8px; font-size: 11px; }
    .dsa-modal { padding: 20px 16px; margin: 16px; max-width: calc(100vw - 32px); }
    .dsa-field-row { grid-template-columns: 1fr; }
    .dsa-week-stats { grid-template-columns: 1fr; gap: 8px; }
    .dsa-tabs { flex-wrap: wrap; }
  }

  @media (max-width: 480px) {
    .dsa-stats-row { grid-template-columns: 1fr; }
    .dsa-stat-value { font-size: 24px; }
    .dsa-logo { font-size: 14px; }
    .dsa-table-hide { display: none; }
    .dsa-card-title { font-size: 12px; }
  }

`

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// ✅ REAL HEATMAP — Firebase createdAt dates se
function generateHeatmap(problems) {
  const dateMap = {}
  problems.forEach(p => {
    if (!p.createdAt?.toDate) return
    const d = p.createdAt.toDate()
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
    dateMap[key] = (dateMap[key] || 0) + 1
  })
  const weeks = []
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (26 * 7) + (7 - now.getDay()))
  for (let w = 0; w < 26; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + (w * 7) + d)
      const key = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0')
      const count = dateMap[key] || 0
      week.push(count >= 6 ? 4 : count >= 4 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0)
    }
    weeks.push(week)
  }
  return weeks
}

const TOPIC_COLORS = {
  'Arrays':'#6366F1','Two Pointers':'#818CF8','Sliding Window':'#A5B4FC',
  'Binary Search':'#A5B4FC','Trees':'#22C55E','Graphs':'#F97316',
  'DP':'#F43F5E','Dynamic Programming':'#F43F5E','Backtracking':'#F59E0B',
  'Stack':'#06B6D4','Heap':'#8B5CF6','Linked List':'#EC4899',
}
function getTopicColor(t='') {
  for(const [k,v] of Object.entries(TOPIC_COLORS)) if(t.toLowerCase().includes(k.toLowerCase())) return v
  return '#6366F1'
}
function getDiffStyle(diff='') {
  const d=diff.toLowerCase()
  if(d==='easy') return {background:'rgba(34,197,94,0.12)',color:'#4ade80'}
  if(d==='hard') return {background:'rgba(244,63,94,0.12)',color:'#fb7185'}
  return {background:'rgba(251,191,36,0.12)',color:'#fbbf24'}
}

function computeStats(problems) {
  const total=problems.length
  const solved=problems.filter(p=>(p.status||'').toLowerCase()==='solved').length
  const easy=problems.filter(p=>(p.difficulty||'').toLowerCase()==='easy').length
  const medium=problems.filter(p=>(p.difficulty||'').toLowerCase()==='medium').length
  const hard=problems.filter(p=>(p.difficulty||'').toLowerCase()==='hard').length
  const accuracy=total>0?Math.round((solved/total)*100):0
  const timed=problems.filter(p=>p.timeTaken&&p.timeTaken>0)
  const avgTime=timed.length>0?Math.round(timed.reduce((s,p)=>s+p.timeTaken,0)/timed.length):0
  const topicMap={}
  problems.forEach(p=>{ const t=p.topic||'Other'; topicMap[t]=(topicMap[t]||0)+1 })
  const maxCount=Math.max(...Object.values(topicMap),1)
  const topics=Object.entries(topicMap).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([name,count])=>({name,count,pct:Math.round((count/maxCount)*100),color:getTopicColor(name)}))
  const weakTopic=topics.length>0?topics[topics.length-1].name:'DP'

  const now=Date.now()
  const thisWeek=problems.filter(p=>{
    if(!p.createdAt?.toDate) return false
    return (now - p.createdAt.toDate().getTime()) < 7*24*60*60*1000
  })
  const weekSolved=thisWeek.filter(p=>(p.status||'').toLowerCase()==='solved').length
  const topicsThisWeek=[...new Set(thisWeek.map(p=>p.topic||'Other'))]

  // ✅ Dynamic Streak
  const solvedDates=problems
    .filter(p=>(p.status||'').toLowerCase()==='solved'&&p.createdAt?.toDate)
    .map(p=>{ const d=p.createdAt.toDate(); return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate() })
  const uniqueDates=[...new Set(solvedDates)]
  let streak=0
  const today=new Date()
  for(let i=0;i<60;i++){
    const exp=new Date(today); exp.setDate(today.getDate()-i)
    const key=exp.getFullYear()+'-'+exp.getMonth()+'-'+exp.getDate()
    if(uniqueDates.includes(key)) streak++
    else break
  }

  // ✅ Spaced Repetition
  const DAY=24*60*60*1000
  const topicLastSolved={}
  problems.forEach(p=>{
    if((p.status||'').toLowerCase()!=='solved'||!p.createdAt?.toDate) return
    const t=p.topic||'Other'
    const time=p.createdAt.toDate().getTime()
    if(!topicLastSolved[t]||time>topicLastSolved[t]) topicLastSolved[t]=time
  })
  const spacedReminders=Object.entries(topicLastSolved)
    .map(([topic,lastTime])=>({topic,daysSince:Math.floor((now-lastTime)/DAY)}))
    .filter(r=>r.daysSince>=3)
    .sort((a,b)=>b.daysSince-a.daysSince)
    .slice(0,4)

  return {total,solved,easy,medium,hard,accuracy,avgTime,topics,weakTopic,
    weekSolved,weekTotal:thisWeek.length,topicsThisWeek,streak,spacedReminders}
}

function formatTime(s) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
}

// ─── GEMINI API ──────────────────────────────────────────────────────────────
// Uses geminiService.js — make sure API key is in .env, not hardcoded!
async function callAI(prompt) {
  return await askGemini(prompt)
}

// ─── SPACED REMINDERS ────────────────────────────────────────────────────────
const SpacedReminders = React.memo(function SpacedReminders({ reminders }) {
  if(reminders.length===0) return (
    <div className="dsa-empty" style={{padding:'28px 0'}}>
      <div className="dsa-empty-icon">✅</div>
      <div className="dsa-empty-title">All caught up!</div>
      <div className="dsa-empty-sub">All topics reviewed recently.<br/>Great consistency — keep it up!</div>
    </div>
  )
  return (
    <div className="dsa-reminders">
      {reminders.map((r,i)=>{
        const urgent=r.daysSince>=7, warn=r.daysSince>=5
        return (
          <div key={i} className="dsa-reminder-item">
            <div className="dsa-reminder-left">
              <span style={{fontSize:'16px'}}>{urgent?'🚨':warn?'⚠️':'💡'}</span>
              <div>
                <div className="dsa-reminder-topic">{r.topic}</div>
                <div className="dsa-reminder-msg">Haven't solved in <strong>{r.daysSince}</strong> day{r.daysSince!==1?'s':''} — time to revisit!</div>
              </div>
            </div>
            <span className={`dsa-reminder-badge ${urgent?'dsa-reminder-urgent':warn?'dsa-reminder-warn':'dsa-reminder-info'}`}>
              {r.daysSince}d ago
            </span>
          </div>
        )
      })}
    </div>
  )
})

// ─── AI TOOLS PAGE ───────────────────────────────────────────────────────────
const AIToolsPage = React.memo(function AIToolsPage({ computed }) {
  const [tab,setTab]=useState('analyzer')
  const [code,setCode]=useState('')
  const [analyzeResult,setAnalyzeResult]=useState('')
  const [analyzing,setAnalyzing]=useState(false)
  const [insight,setInsight]=useState('')
  const [generating,setGenerating]=useState(false)

  const runAnalyzer=async()=>{
    if(!code.trim()) return
    setAnalyzing(true); setAnalyzeResult('')
    try {
      const result=await callAI(`You are a DSA expert. Analyze this pseudocode/approach and give:
1. Time Complexity (with explanation)
2. Space Complexity (with explanation)
3. Is the approach optimal? If not, suggest a better one.
4. One-line verdict (Good/Can improve/Needs rethink)
Keep it concise. Use plain text, no markdown symbols.
Code/Approach:\n${code}`)
      setAnalyzeResult(result)
    } catch(e){ setAnalyzeResult('Error connecting to AI.') }
    finally{ setAnalyzing(false) }
  }

  const runWeeklyInsight=async()=>{
    setGenerating(true); setInsight('')
    try {
      const result=await callAI(`You are a brutally honest but funny DSA coach. Generate a weekly roast + insight.
Stats this week:
- Problems attempted: ${computed.weekTotal}
- Problems solved: ${computed.weekSolved}
- Topics covered: ${computed.topicsThisWeek.join(', ')||'nothing'}
- Overall accuracy: ${computed.accuracy}%
- Weakest topic: ${computed.weakTopic}
- Avg solve time: ${computed.avgTime>0?computed.avgTime+' minutes':'not tracked'}
Write 3-4 sentences. Start with a roast, give one actionable tip, end with motivation. No bullet points.`)
      setInsight(result)
    } catch(e){ setInsight('Error connecting to AI.') }
    finally{ setGenerating(false) }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
      <div>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'22px',fontWeight:700,letterSpacing:'-0.03em',color:'var(--text)'}}>AI Tools</h1>
        <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'3px'}}>Powered by Claude — your personal DSA coach</p>
      </div>
      <div className="dsa-card" style={{maxWidth:'720px'}}>
        <div className="dsa-tabs">
          <button className={`dsa-tab${tab==='analyzer'?' active':''}`} onClick={()=>setTab('analyzer')}>◈ Approach Analyzer</button>
          <button className={`dsa-tab${tab==='weekly'?' active':''}`} onClick={()=>setTab('weekly')}>✦ Weekly Insight</button>
        </div>

        {tab==='analyzer'&&(
          <div>
            <div style={{fontSize:'13px',color:'var(--muted)',marginBottom:'12px'}}>Paste your pseudocode — AI will analyze time & space complexity.</div>
            <textarea className="dsa-textarea"
              placeholder={`Example:\nfor each element in array:\n  check if target - element exists in hashmap\n  if yes, return indices\n  else add to hashmap`}
              value={code} onChange={e=>setCode(e.target.value)}/>
            <button className="dsa-run-btn" onClick={runAnalyzer} disabled={analyzing||!code.trim()}>
              {analyzing?<><span className="dsa-ai-spinner"/> Analyzing...</>:'✦ Analyze Complexity'}
            </button>
            {analyzeResult&&(
              <motion.div className="dsa-ai-result"
                initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>
                <div className="dsa-ai-badge" style={{margin:'0 0 10px'}}>✦ AI Analysis</div>
                {analyzeResult}
              </motion.div>
            )}
          </div>
        )}

        {tab==='weekly'&&(
          <div>
            <div style={{fontSize:'13px',color:'var(--muted)',marginBottom:'16px'}}>Get an AI roast + actionable summary of your week.</div>
            <div className="dsa-week-stats">
              <div className="dsa-week-stat">
                <div className="dsa-week-stat-val">{computed.weekTotal}</div>
                <div className="dsa-week-stat-label">This week</div>
              </div>
              <div className="dsa-week-stat">
                <div className="dsa-week-stat-val" style={{color:'#4ade80'}}>{computed.weekSolved}</div>
                <div className="dsa-week-stat-label">Solved</div>
              </div>
              <div className="dsa-week-stat">
                <div className="dsa-week-stat-val" style={{color:'var(--ember)',fontSize:'14px',paddingTop:'3px'}}>{computed.weakTopic}</div>
                <div className="dsa-week-stat-label">Weak topic</div>
              </div>
            </div>
            <button className="dsa-run-btn" onClick={runWeeklyInsight} disabled={generating}>
              {generating?<><span className="dsa-ai-spinner"/> Generating roast...</>:'🔥 Generate Weekly Insight'}
            </button>
            {insight&&(
              <motion.div className="dsa-insight-card" style={{marginTop:'16px'}}
                initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>
                <div className="dsa-insight-header">
                  <span style={{fontSize:'20px'}}>🤖</span>
                  <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'13px',fontWeight:600,color:'var(--text)'}}>AI Weekly Roast</span>
                </div>
                <div className="dsa-insight-body">{insight}</div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// ─── LOG PROBLEM MODAL ───────────────────────────────────────────────────────
function LogProblemModal({ onClose, onSave }) {
  const [form,setForm]=useState({name:'',difficulty:'Easy',topic:'',status:'Solved',timeTaken:''})
  const [saving,setSaving]=useState(false)
  const [timerSec,setTimerSec]=useState(0)
  const [running,setRunning]=useState(false)
  const intervalRef=useRef(null)

  useEffect(()=>{
    if(running) intervalRef.current=setInterval(()=>setTimerSec(s=>s+1),1000)
    else clearInterval(intervalRef.current)
    return()=>clearInterval(intervalRef.current)
  },[running])

  const stopTimer=()=>{ setRunning(false); setForm(f=>({...f,timeTaken:Math.round(timerSec/60)||1})) }
  const resetTimer=()=>{ setRunning(false); setTimerSec(0); setForm(f=>({...f,timeTaken:''})) }
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  const handleSave=async()=>{
    if(!form.name.trim()) return
    setSaving(true)
    try {
      const currentUser = auth.currentUser
      await addDoc(collection(db,'problems'),{
        name:form.name.trim(), difficulty:form.difficulty,
        topic:form.topic.trim()||'Other', status:form.status,
        timeTaken:Number(form.timeTaken)||0,
        createdAt:serverTimestamp(),
        userId: currentUser?.uid || null,
      })
      onSave(); onClose()
    } catch(e){ console.error(e) }
    finally{ setSaving(false) }
  }

  return (
    <div className="dsa-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="dsa-modal">
        <motion.button className="dsa-close-btn" onClick={onClose} whileHover={{scale:1.1}} whileTap={{scale:0.9}}>✕</motion.button>
        <div className="dsa-modal-title">Log Problem</div>
        <div className="dsa-modal-sub">Add a new problem to your tracker</div>
        <div className="dsa-field">
          <label>Problem Name</label>
          <input className="dsa-input" placeholder="e.g. Two Sum" value={form.name} onChange={e=>set('name',e.target.value)}/>
        </div>
        <div className="dsa-field-row">
          <div className="dsa-field" style={{marginBottom:0}}>
            <label>Difficulty</label>
            <select className="dsa-select" value={form.difficulty} onChange={e=>set('difficulty',e.target.value)}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </div>
          <div className="dsa-field" style={{marginBottom:0}}>
            <label>Status</label>
            <select className="dsa-select" value={form.status} onChange={e=>set('status',e.target.value)}>
              <option>Solved</option><option>Pending</option><option>Revisit</option>
            </select>
          </div>
        </div>
        <div className="dsa-field" style={{marginTop:16}}>
          <label>Topic / Pattern</label>
          <input className="dsa-input" placeholder="e.g. Arrays, DP, Trees..." value={form.topic} onChange={e=>set('topic',e.target.value)}/>
        </div>
        <div className="dsa-field">
          <label>Time Taken</label>
          <div className="dsa-timer-display">
            <div>
              <div className="dsa-timer-value">{formatTime(timerSec)}</div>
              {running&&<div className="dsa-timer-running">Timer running</div>}
            </div>
            <div className="dsa-timer-btns">
              {!running
                ?<button className="dsa-timer-btn start" onClick={()=>setRunning(true)}>▶ Start</button>
                :<button className="dsa-timer-btn stop" onClick={stopTimer}>■ Stop</button>
              }
              <button className="dsa-timer-btn reset" onClick={resetTimer}>↺</button>
            </div>
          </div>
          <input className="dsa-input" type="number" placeholder="Or enter minutes manually"
            value={form.timeTaken} onChange={e=>set('timeTaken',e.target.value)} style={{marginTop:6}}/>
        </div>
        <div className="dsa-modal-footer">
          <button className="dsa-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="dsa-submit-btn" onClick={handleSave} disabled={saving||!form.name.trim()}>
            {saving
              ?<><span className="dsa-ai-spinner"/> Saving...</>
              :'+ Save Problem'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD PAGE ──────────────────────────────────────────────────────────
const DashboardPage = React.memo(function DashboardPage({ problems,user, computed, setShowModal, setActiveNav }) {
  // ✅ Real heatmap from Firebase data
  const weeks=useMemo(()=>generateHeatmap(problems),[problems])
  const months=['Jan','Feb','Mar','Apr','May','Jun']
  const dayLabels=['','M','','W','','F','']
  const levelColors=['var(--subtle)','#1e1b4b','#3730a3','var(--accent)','var(--accent2)']
  const topLine=(color='rgba(99,102,241,0.4)')=>({position:'absolute',top:0,left:0,right:0,height:'1px',background:`linear-gradient(90deg,transparent,${color},transparent)`})
  const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}

  return (
    <>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'22px',fontWeight:700,letterSpacing:'-0.03em',color:'var(--text)'}}>
            {greeting()}, {user?.displayName?.split(' ')[0] || 'Coder'}.
          </h1>
          <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'3px'}}>
            {computed.solved} solved · {computed.total} tracked · {computed.avgTime>0?`Avg ${computed.avgTime}m`:'Start logging time!'}
          </p>
        </div>
        <motion.button className="dsa-add-btn" onClick={()=>setShowModal(true)} whileHover={{scale:1.03,y:-1}} whileTap={{scale:0.97}}>+ Log Problem</motion.button>
      </div>

      {/* Spaced Repetition Banner */}
      {computed.spacedReminders?.length>0&&(
        <div style={{padding:'12px 16px',background:'rgba(249,115,22,0.07)',border:'1px solid rgba(249,115,22,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:'18px'}}>⏰</span>
            <div>
              <div style={{fontSize:'13px',fontWeight:600,color:'var(--text)'}}>
                {computed.spacedReminders[0].topic} needs revisiting — {computed.spacedReminders[0].daysSince} days since last solve!
              </div>
              <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>
                {computed.spacedReminders.length} topic{computed.spacedReminders.length!==1?'s':''} pending in your revision queue
              </div>
            </div>
          </div>
          <button onClick={()=>setActiveNav('Revision Queue')} style={{padding:'6px 12px',background:'rgba(249,115,22,0.15)',border:'1px solid rgba(249,115,22,0.3)',borderRadius:'6px',color:'#fb923c',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>
            View Queue →
          </button>
        </div>
      )}

      {/* Stats */}
      <motion.div className="dsa-stats-row" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div className="dsa-card" variants={cardVariants} custom={0} style={{padding:'18px 20px'}}
          whileHover={{borderColor:'#2E2E45',y:-2,transition:{duration:0.15}}}>
          <div style={topLine()}/>
          <div className="dsa-stat-label">Total Solved</div>
          <div className="dsa-stat-value">{computed.solved}<span style={{fontSize:'16px',color:'var(--muted)',fontWeight:400}}>/{computed.total}</span></div>
          <div className="dsa-stat-sub">E:{computed.easy} M:{computed.medium} H:{computed.hard}</div>
        </motion.div>
        <motion.div className="dsa-streak-card" variants={cardVariants} custom={1}
          whileHover={{y:-2,transition:{duration:0.15}}}>
          <div className="dsa-streak-glow"/><div className="dsa-streak-line"/>
          <div className="dsa-stat-label" style={{color:'rgba(249,115,22,0.6)'}}>Current Streak</div>
          <div className="dsa-stat-value" style={{color:'var(--ember)',textShadow:'0 0 20px rgba(249,115,22,0.5)'}}>{computed.streak} 🔥</div>
          <div className="dsa-ember-dots">
            {Array.from({length:7}).map((_,i)=>(
              <div key={i} className={`dsa-ember-dot${i<computed.streak?' lit':''}`}
                style={i<computed.streak?{animationDelay:`${i*0.2}s`}:{}}/>
            ))}
          </div>
        </motion.div>
        <div className="dsa-card" style={{padding:'18px 20px'}}>
          <div style={topLine('rgba(34,197,94,0.4)')}/>
          <div className="dsa-stat-label">Accuracy</div>
          <div className="dsa-stat-value" style={{color:'#4ade80'}}>{computed.accuracy}%</div>
          <div className="dsa-stat-sub">Solved / Total</div>
        </div>
        <div className="dsa-card" style={{padding:'18px 20px'}}>
          <div style={topLine('rgba(249,115,22,0.3)')}/>
          <div className="dsa-stat-label">Avg. Time</div>
          <div className="dsa-stat-value" style={{fontSize:'22px',paddingTop:'4px',color:computed.avgTime>0?'var(--text)':'var(--muted)'}}>
            {computed.avgTime>0?<>{computed.avgTime} <span style={{fontSize:'13px',color:'var(--muted)',fontWeight:400}}>min</span></>:'—'}
          </div>
          <div className="dsa-stat-sub">per problem</div>
        </div>
      </motion.div>

      {/* Heatmap + Topics */}
      <div className="dsa-mid">
        <div className="dsa-card">
          <div className="dsa-card-title">Activity Heatmap <span className="dsa-card-meta">Last 6 months</span></div>
          <div className="dsa-heatmap-months">
            {months.map(m=><span key={m} style={{fontSize:'10px',color:'var(--muted)',width:`${100/months.length}%`}}>{m}</span>)}
          </div>
          <div className="dsa-heatmap-grid">
            <div className="dsa-heatmap-days">{dayLabels.map((d,i)=><div key={i} className="dsa-day-label">{d}</div>)}</div>
            <div className="dsa-heatmap-weeks">
              {weeks.map((week,wi)=>(
                <div key={wi} className="dsa-heatmap-week">
                  {week.map((level,di)=><div key={di} className={`dsa-heatmap-cell${level>0?` l${level}`:''}`}/>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'4px',marginTop:'10px',justifyContent:'flex-end'}}>
            <span style={{fontSize:'9px',color:'var(--muted)',marginRight:'4px'}}>Less</span>
            {levelColors.map((c,i)=><div key={i} style={{width:'9px',height:'9px',borderRadius:'2px',background:c}}/>)}
            <span style={{fontSize:'9px',color:'var(--muted)',marginLeft:'4px'}}>More</span>
          </div>
        </div>
        <div className="dsa-card">
          <div className="dsa-card-title">Topic Breakdown <span className="dsa-card-meta">by problems</span></div>
          {computed.topics.length===0
            ?<div className="dsa-empty">
              <div className="dsa-empty-icon">🏷️</div>
              <div className="dsa-empty-title">No topics yet</div>
              <div className="dsa-empty-sub">Add topic when logging problems</div>
            </div>
            :<div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {computed.topics.map(t=>(
                <div key={t.name}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                    <span style={{fontSize:'12px',color:'var(--text)',fontWeight:500}}>{t.name}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'var(--muted)'}}>{t.count}</span>
                  </div>
                  <div className="dsa-topic-bar">
                    <div className="dsa-topic-fill" style={{width:`${t.pct}%`,background:t.color,boxShadow:`0 0 6px ${t.color}60`}}/>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Problems + AI Insight */}
      <div className="dsa-bottom">
        <div className="dsa-card">
          <div className="dsa-card-title">Recent Problems <span className="dsa-card-meta">{problems.length} total</span></div>
          {problems.length===0
            ?<div className="dsa-empty">
              <div className="dsa-empty-icon">📋</div>
              <div className="dsa-empty-title">No problems logged yet</div>
              <div className="dsa-empty-sub">Start tracking your DSA journey.<br/>Every problem counts!</div>
              <div className="dsa-empty-btn" onClick={()=>setShowModal(true)}>+ Log your first problem</div>
            </div>
            :<table className="dsa-table">
              <thead><tr>{['Problem','Difficulty','Topic','Time','Status'].map(h=><th key={h} className={['Topic','Time'].includes(h)?'dsa-table-hide':''}>{h}</th>)}</tr></thead>
              <tbody>
                {problems.slice(0,8).map((p,i)=>{
                  const isSolved=(p.status||'').toLowerCase()==='solved'
                  const diff=(p.difficulty||'medium').toLowerCase()
                  return (
                    <tr key={p.id||i}>
                      <td style={{fontWeight:500,maxWidth:'180px'}}>{p.name||'—'}</td>
                      <td><span className="dsa-diff-badge" style={getDiffStyle(diff)}>{diff.charAt(0).toUpperCase()+diff.slice(1)}</span></td>
                      <td><span className="dsa-pattern-tag">{p.topic||'—'}</span></td>
                      <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'var(--muted)'}}>{p.timeTaken>0?`${p.timeTaken}m`:'—'}</td>
                      <td>
                        <div className="dsa-status-dot">
                          <div className="dsa-dot" style={{background:isSolved?'var(--green)':'var(--ember)',boxShadow:isSolved?'0 0 5px rgba(34,197,94,0.6)':'0 0 5px rgba(249,115,22,0.5)'}}/>
                          {p.status||'Pending'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          }
        </div>
        <div className="dsa-card">
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 100% 0%,rgba(99,102,241,0.07) 0%,transparent 60%)',pointerEvents:'none'}}/>
          <div className="dsa-ai-badge">✦ AI Insight</div>
          <p className="dsa-insight-text">
            You've solved <strong style={{color:'var(--text)'}}>{computed.solved}</strong> of{' '}
            <strong style={{color:'var(--text)'}}>{computed.total}</strong> problems.{' '}
            {computed.avgTime>0&&<>Avg time: <strong style={{color:'var(--accent3)'}}>{computed.avgTime} min</strong>. </>}
            {computed.total-computed.solved>0
              ?<><strong style={{color:'var(--ember)'}}>{computed.weakTopic}</strong> needs the most attention.</>
              :<>All solved — keep adding challenges!</>
            }
          </p>
          <div className="dsa-insight-divider"/>
          {[
            {icon:'⬡',label:`Practice ${computed.weakTopic}`,sub:'Your weakest topic'},
            {icon:'◎',label:'View full breakdown',sub:'All topics & accuracy'},
            {icon:'✦',label:'Ask AI Advisor',sub:'Go to AI Tools tab'},
          ].map((a,i)=>(
            <div key={i} className="dsa-action-item">
              <span style={{fontSize:'14px'}}>{a.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)'}}>{a.label}</div>
                <div style={{fontSize:'10px',color:'var(--muted)'}}>{a.sub}</div>
              </div>
              <span style={{color:'var(--muted)',fontSize:'14px'}}>›</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
})

// ─── REVISION QUEUE PAGE ─────────────────────────────────────────────────────
function RevisionQueuePage({ reminders }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
      <div>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'22px',fontWeight:700,letterSpacing:'-0.03em',color:'var(--text)'}}>Revision Queue</h1>
        <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'3px'}}>Topics you haven't touched in a while — revisit before they fade!</p>
      </div>
      <div className="dsa-card" style={{maxWidth:'640px'}}>
        <div className="dsa-card-title">
          Spaced Repetition Reminders
          <span className="dsa-card-meta">{reminders.length} pending</span>
        </div>
        <SpacedReminders reminders={reminders}/>
      </div>
    </div>
  )
}



// ─── CSS INJECTION — inject once into document head
let cssInjected = false
function injectCSS(css) {
  if (cssInjected) return
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  cssInjected = true
}

// ─── ANIMATION VARIANTS ──────────────────────────────────────────────────────
const pageVariants = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:     { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const cardVariants = {
  initial:  { opacity: 0, y: 20 },
  animate:  (i) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.07, ease: 'easeOut' } }),
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } }
}

// ─── SKELETON LOADER ─────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'24px',padding:'4px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div className="dsa-skeleton" style={{width:'220px',height:'28px',marginBottom:'8px'}}/>
          <div className="dsa-skeleton" style={{width:'160px',height:'14px'}}/>
        </div>
        <div className="dsa-skeleton" style={{width:'120px',height:'36px',borderRadius:'7px'}}/>
      </div>
      <div className="dsa-skeleton-row">
        {[1,2,3,4].map(i=><div key={i} className="dsa-skeleton dsa-skeleton-card"/>)}
      </div>
      <div className="dsa-skeleton dsa-skeleton-wide"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'14px'}}>
        <div className="dsa-skeleton" style={{height:'280px',borderRadius:'12px'}}/>
        <div className="dsa-skeleton" style={{height:'280px',borderRadius:'12px'}}/>
      </div>
    </div>
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const Dashboard = ({ user }) => {
  // Load cached data instantly — show UI while Firebase loads
  const cachedProblems = React.useMemo(() => {
    try {
      const cached = localStorage.getItem('dsa_problems_cache')
      if (!cached) return []
      const { data, ts } = JSON.parse(cached)
      // Cache valid for 5 minutes
      if (Date.now() - ts < 5 * 60 * 1000) return data || []
      return data || [] // still use stale cache, Firebase will update
    } catch { return [] }
  }, [])

  const [problems,setProblems]=useState(cachedProblems)
  const [loading,setLoading]=useState(cachedProblems.length === 0)
  const [showModal,setShowModal]=useState(false)
  const [showToast,setShowToast]=useState(false)
  const [activeNav,setActiveNav]=useState('Dashboard')
  const [showPalette,setShowPalette]=useState(false)

  const handleLogout = async () => {
    try { await signOut(auth) } catch(e) { console.error(e) }
  }

  const navItems=[
    {icon:'⬡',label:'Dashboard',group:'Workspace'},
    {icon:'◈',label:'Problems', group:'Workspace'},
    {icon:'◎',label:'Analytics',group:'Workspace'},
    {icon:'⬟',label:'Topics',   group:'Workspace'},
    {icon:'✦',label:'AI Advisor',    group:'Tools'},
    {icon:'◈',label:'Analyzer',       group:'Tools'},
    {icon:'⟳',label:'LC Sync',        group:'Tools'},
    {icon:'◷',label:'Revision Queue',group:'Tools'},
    {icon:'↗',label:'Contests',      group:'Tools'},
    {icon:'◉',label:'Profile',       group:'Tools'},
  ]

  // Ctrl+K Command Palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ✅ Real-time Firebase listener
  useEffect(() => {
  if (!auth.currentUser?.uid) {
    setLoading(false);
    return;
  }

  const q = query(
    collection(db, 'problems'),
    where('userId', '==', auth.currentUser.uid)
  );

  const unsub = onSnapshot(q, 
    (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProblems(data);
      setLoading(false);

      // Update cache
      try {
        localStorage.setItem('dsa_problems_cache', JSON.stringify({ 
          data, 
          ts: Date.now() 
        }));
      } catch (e) {
        console.error("Cache error:", e);
      }
    },
    (err) => {
      console.error("Firebase listener error:", err);
      setLoading(false);
    }
  );

  return () => unsub();
}, [auth.currentUser?.uid]);

  const handleSaved = React.useCallback(() => {
    setShowToast(true)
    setTimeout(()=>setShowToast(false),3000)
  }, [])

  const computed=useMemo(()=>computeStats(problems),[problems])

  // Inject CSS once
  React.useEffect(()=>{ injectCSS(css) }, [])

  return (
    <>
      <div className="dsa-shell">
        <header className="dsa-topbar">
          <div className="dsa-logo"><div className="dsa-logo-dot"/>DSA Tracker</div>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <span className="dsa-tagline">DV — Crafted in Code, Driven by Vision</span>
            <div onClick={()=>setShowPalette(true)} style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'5px 12px', background:'var(--surface)',
              border:'1px solid var(--border)', borderRadius:'7px',
              color:'var(--muted)', fontSize:'12px', cursor:'pointer',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#2E2E45'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <span style={{fontSize:'13px'}}>⌕</span>
              <span>Search</span>
              <span style={{padding:'1px 5px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:'4px',fontSize:'10px',fontFamily:"'JetBrains Mono',monospace"}}>Ctrl K</span>
            </div>
            <button onClick={handleLogout} style={{
              padding:'5px 10px', background:'transparent',
              border:'1px solid #1E1E30', borderRadius:'6px',
              color:'#64748B', fontSize:'11px', fontWeight:500,
              cursor:'pointer', transition:'all 0.15s', fontFamily:'Inter,sans-serif',
            }}
            onMouseEnter={e=>{e.target.style.borderColor='#F43F5E';e.target.style.color='#fb7185'}}
            onMouseLeave={e=>{e.target.style.borderColor='#1E1E30';e.target.style.color='#64748B'}}
            >↪ Logout</button>
            <div className="dsa-avatar" title={user?.email||''}>
              {(user?.displayName||user?.email||'D')[0].toUpperCase()}
            </div>
          </div>
        </header>

        <aside className="dsa-sidebar">
          <div className="dsa-nav-label">Workspace</div>
          {navItems.filter(i=>i.group==='Workspace').map(item=>(
            <motion.div key={item.label} className={`dsa-nav-item${activeNav===item.label?' active':''}`}
              style={{color:activeNav===item.label?'var(--text)':'var(--muted)'}}
              onClick={()=>setActiveNav(item.label)}
              whileHover={{x:3,transition:{duration:0.15}}}
              whileTap={{scale:0.97}}>
              <span style={{width:'16px',textAlign:'center'}}>{item.icon}</span>{item.label}
            </motion.div>
          ))}
          <div className="dsa-nav-label">Tools</div>
          {navItems.filter(i=>i.group==='Tools').map(item=>(
            <motion.div key={item.label} className={`dsa-nav-item${activeNav===item.label?' active':''}`}
              style={{color:activeNav===item.label?'var(--text)':'var(--muted)'}}
              onClick={()=>setActiveNav(item.label)}
              whileHover={{x:3,transition:{duration:0.15}}}
              whileTap={{scale:0.97}}>
              <span style={{width:'16px',textAlign:'center'}}>{item.icon}</span>{item.label}
            </motion.div>
          ))}
          <div className="dsa-sidebar-bottom">
            <div className="dsa-level-badge">
              <span style={{fontSize:'18px'}}>⬡</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'12px',fontWeight:600,color:'var(--text)'}}>Intermediate</div>
                <div style={{fontSize:'11px',color:'var(--muted)'}}>420 / 1000 XP</div>
                <div className="dsa-level-bar"><div className="dsa-level-fill" style={{width:'42%'}}/></div>
              </div>
            </div>
          </div>
        </aside>

        <main className="dsa-main">
          {loading
            ?<SkeletonLoader/>
            :<React.Suspense fallback={<SkeletonLoader/>}>
            <AnimatePresence mode="wait">
              <motion.div key={activeNav} variants={pageVariants} initial="initial" animate="animate" exit="exit"
                style={{display:'flex',flexDirection:'column',gap:'24px'}}>
                {activeNav==='Analytics'
                  ?<AnalyticsPage problems={problems}/>
                  :activeNav==='AI Advisor'
                  ?<AIToolsPage computed={computed}/>
                  :activeNav==='Revision Queue'
                  ?<RevisionQueuePage reminders={computed.spacedReminders||[]}/>
                  :activeNav==='Analytics'
                  ?<AnalyticsPage problems={problems}/>
                  :activeNav==='Analyzer'
                  ?<ApproachAnalyzer/>
                  :activeNav==='LC Sync'
                  ?<LeetCodeSync/>
                  :activeNav==='Profile'
                  ?<ProfilePage user={user} computed={computed}/>
                  :<DashboardPage problems={problems} computed={computed} setShowModal={setShowModal} setActiveNav={setActiveNav}/>
                }
              </motion.div>
            </AnimatePresence>
            </React.Suspense>
          }
        </main>
      </div>
      

      {showModal&&<LogProblemModal onClose={()=>setShowModal(false)} onSave={handleSaved}/>}
      <AnimatePresence>{showToast&&<motion.div className="dsa-success-toast" initial={{opacity:0,y:20,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20,scale:0.95}} transition={{duration:0.2}}>✓ Problem saved!</motion.div>}</AnimatePresence>
      <CommandPalette
        isOpen={showPalette}
        onClose={()=>setShowPalette(false)}
        setActiveNav={setActiveNav}
        setShowModal={setShowModal}
        problems={problems}
      />
    </>
  )
}

export default Dashboard;