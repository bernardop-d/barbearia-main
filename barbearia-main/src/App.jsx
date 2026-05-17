// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login      from './pages/Login'
import Home       from './pages/Home'
import Landing    from './pages/Landing'
import Cadastro   from './pages/Cadastro'
import Termos     from './pages/Termos'
import Privacidade from './pages/Privacidade'

// Rota protegida — mostra Landing quando não autenticado
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  return user ? children : <Landing />
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
