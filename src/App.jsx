import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PublicProfile from './pages/PublicProfile';

function ProtectedRoute({ user, loading, children }) {
  if (loading) return (
    <div style={{
      minHeight:'100vh', background:'#08080E',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        width:'20px', height:'20px',
        border:'2px solid #1E1E30', borderTopColor:'#6366F1',
        borderRadius:'50%', animation:'spin 0.7s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

        {/* Public profile — no auth needed */}
        <Route path="/u/:username" element={<PublicProfile />} />

        {/* Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute user={user} loading={loading}>
            <Dashboard user={user} />
          </ProtectedRoute>
        }/>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App;