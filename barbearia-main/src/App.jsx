// src/App.jsx
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { getBarbeariaAtual } from './services/supabase'
import Login       from './pages/Login'
import Home        from './pages/Home'
import Landing     from './pages/Landing'
import Cadastro    from './pages/Cadastro'
import Upgrade     from './pages/Upgrade'
import Termos      from './pages/Termos'
import Privacidade from './pages/Privacidade'

function assinaturaAtiva(barb) {
  if (!barb) return false
  if (barb.subscription_status === 'active') return true
  if (barb.subscription_status === 'trial') {
    if (!barb.trial_ends_at) return true // legado sem data = libera
    return new Date(barb.trial_ends_at) > new Date()
  }
  return false
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const [check, setCheck] = useState('loading')

  useEffect(() => {
    if (!user) return
    if (params.get('assinatura') === 'ok') { setCheck('ok'); return }
    getBarbeariaAtual().then(barb => {
      setCheck(assinaturaAtiva(barb) ? 'ok' : 'upgrade')
    }).catch(() => setCheck('ok'))
  }, [user, params])

  if (loading || (user && check === 'loading')) return <Splash />
  if (!user) return <Landing />
  if (check === 'upgrade') return <Navigate to="/upgrade" replace />
  return children
}

function Splash() {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4">
      <div className="font-display text-5xl text-gradient tracking-wider">Your Barber</div>
      <div className="w-8 h-1 bg-blade-500 rounded-full animate-pulse-slow" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"       element={<Login />} />
      <Route path="/cadastro"    element={<Cadastro />} />
      <Route path="/upgrade"     element={<Upgrade />} />
      <Route path="/termos"      element={<Termos />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Home />
        </PrivateRoute>
      } />
    </Routes>
  )
}
