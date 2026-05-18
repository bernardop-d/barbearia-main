// src/App.jsx
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { getBarbeariaAtual, supabase } from './services/supabase'
import Login       from './pages/Login'
import Home        from './pages/Home'
import Landing     from './pages/Landing'
import Cadastro    from './pages/Cadastro'
import Upgrade     from './pages/Upgrade'
import Termos      from './pages/Termos'
import Privacidade from './pages/Privacidade'
import GodPanel    from './pages/GodPanel'

function assinaturaAtiva(barb) {
  if (!barb) return false
  if (!barb.ativo) return false
  if (barb.vencimento && new Date(barb.vencimento) < new Date()) return false
  return true
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const [check, setCheck] = useState('loading')
  const [isGod, setIsGod] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.rpc('is_god').then(({ data: god }) => {
      if (god) { setIsGod(true); setCheck('ok'); return }
      if (params.get('assinatura') === 'ok') { setCheck('ok'); return }
      getBarbeariaAtual().then(barb => {
        if (!barb) { setCheck('cadastro'); return }
        setCheck(assinaturaAtiva(barb) ? 'ok' : 'upgrade')
      }).catch(() => setCheck('ok'))
    })
  }, [user, params])

  if (loading || (user && check === 'loading')) return <Splash />
  if (!user) return <Landing />
  if (check === 'cadastro') return <Navigate to="/cadastro" replace />
  if (check === 'upgrade')  return <Navigate to="/upgrade" replace />
  if (isGod) return <GodPanel />
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
