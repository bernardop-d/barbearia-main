// src/components/Navbar.jsx
import { useAuth } from '../hooks/useAuth'
import { HomeIcon, CalendarIcon, PlusIcon, LogoutIcon, PackageIcon, ChartIcon, SettingsIcon, UsersIcon } from './Icons'

export default function Navbar({ activeTab, setActiveTab }) {
  const { logout } = useAuth()

  const tabs = [
    { id: 'dashboard', label: 'Início',   icon: HomeIcon },
    { id: 'agenda',    label: 'Agenda',   icon: CalendarIcon },
    { id: 'novo',      label: 'Agendar',  icon: PlusIcon, highlight: true },
    { id: 'estoque',   label: 'Estoque',  icon: PackageIcon },
    { id: 'financeiro',label: 'Finanças', icon: ChartIcon },
    { id: 'clientes',  label: 'Clientes', icon: UsersIcon },
    { id: 'config',    label: 'Config',   icon: SettingsIcon },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-ink-900/95 backdrop-blur-md border-b border-ink-800">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <span className="font-display text-2xl text-gradient tracking-widest">Your Barber</span>
          <button
            onClick={logout}
            className="text-ink-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-ink-800 active:scale-95"
            title="Sair"
          >
            <LogoutIcon />
          </button>
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
