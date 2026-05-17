// src/components/Navbar.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { HomeIcon, CalendarIcon, PlusIcon, LogoutIcon, PackageIcon, ChartIcon, SettingsIcon, UsersIcon, BellIcon } from './Icons'
import { getBarbeariaAtual, salvarBarbeiroPush, removerBarbeiroPush } from '../services/supabase'

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function Navbar({ activeTab, setActiveTab }) {
  const { logout } = useAuth()
  const [bellState, setBellState] = useState('idle') // idle | loading | ok | denied
  const [bid, setBid] = useState(null)

  useEffect(() => {
    if (!VAPID_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    getBarbeariaAtual().then(b => setBid(b?.id ?? null))
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(sw =>
        sw.pushManager.getSubscription().then(sub => {
          if (sub) setBellState('ok')
        })
      )
    } else if (Notification.permission === 'denied') {
      setBellState('denied')
    }
  }, [])

  async function togglePush() {
    if (!VAPID_KEY || !bid) return
    if (bellState === 'loading') return

    if (bellState === 'ok') {
      const sw = await navigator.serviceWorker.ready
      const sub = await sw.pushManager.getSubscription()
      if (sub) {
        await removerBarbeiroPush(sub.endpoint).catch(() => {})
        await sub.unsubscribe()
      }
      setBellState('idle')
      return
    }

    setBellState('loading')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setBellState('denied'); return }

      const sw = await navigator.serviceWorker.ready
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      })
      await salvarBarbeiroPush(bid, sub.toJSON())
      setBellState('ok')
    } catch {
      setBellState('idle')
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Início',   icon: HomeIcon },
    { id: 'agenda',    label: 'Agenda',   icon: CalendarIcon },
    { id: 'novo',      label: 'Agendar',  icon: PlusIcon, highlight: true },
    { id: 'estoque',   label: 'Estoque',  icon: PackageIcon },
    { id: 'financeiro',label: 'Finanças', icon: ChartIcon },
    { id: 'clientes',  label: 'Clientes', icon: UsersIcon },
    { id: 'config',    label: 'Config',   icon: SettingsIcon },
  ]

  const showBell = VAPID_KEY && 'PushManager' in window

  return (
    <>
      <header className="sticky top-0 z-40 bg-ink-900/95 backdrop-blur-md border-b border-ink-800">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <span className="font-display text-2xl text-gradient tracking-widest">Your Barber</span>
          <div className="flex items-center gap-1">
            {showBell && (
              <button
                onClick={togglePush}
                title={bellState === 'ok' ? 'Desativar notificações' : 'Ativar notificações de novos agendamentos'}
                className={`p-2 rounded-xl transition-colors active:scale-95
                  ${bellState === 'ok'
                    ? 'text-blade-400 hover:text-blade-300 hover:bg-ink-800'
                    : bellState === 'denied'
                      ? 'text-ink-600 cursor-not-allowed'
                      : 'text-ink-400 hover:text-white hover:bg-ink-800'
                  }`}
              >
                <BellIcon size={18} filled={bellState === 'ok'} />
              </button>
            )}
            <button
              onClick={logout}
              className="text-ink-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-ink-800 active:scale-95"
              title="Sair"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-ink-900/95 backdrop-blur-md border-t border-ink-800 safe-bottom">
        <div className="max-w-md mx-auto px-1 h-16 flex items-center overflow-x-auto no-scrollbar gap-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 active:scale-90
                  ${tab.highlight
                    ? 'bg-blade-500 text-ink-900 shadow-lg shadow-blade-500/30 -mt-4 px-4 py-3 mx-1'
                    : active
                      ? 'text-blade-400'
                      : 'text-ink-500 hover:text-ink-300'
                  }`}
              >
                <Icon size={tab.highlight ? 22 : 18} />
                <span className={`text-[10px] font-medium ${tab.highlight ? 'text-ink-900' : ''}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
