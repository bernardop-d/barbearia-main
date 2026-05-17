// src/pages/Home.jsx
import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Dashboard from '../components/Dashboard'
import Agenda from '../components/Agenda'
import AgendamentoForm from '../components/AgendamentoForm'
import Bloqueio from '../components/Bloqueio'
import Estoque from '../components/Estoque'
import Financeiro from '../components/Financeiro'
import { getAgendamentos, getNomeBarbearia, supabase } from '../services/supabase'

export default function Home() {
  const [activeTab,      setActiveTab]      = useState('dashboard')
  const [agendamentos,   setAgendamentos]   = useState([])
  const [nomeBarbearia,  setNomeBarbearia]  = useState('Your Barber')
  const [loading,        setLoading]        = useState(true)
  const [toast,          setToast]          = useState(null)

  useEffect(() => {
    getNomeBarbearia().then(nome => { if (nome) setNomeBarbearia(nome) })
  }, [])

  const fetchAgendamentos = useCallback(async () => {
    try {
      const data = await getAgendamentos()
      setAgendamentos(data || [])
    } catch (err) {
      showToast('Erro ao carregar agendamentos.', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgendamentos() }, [fetchAgendamentos])

  useEffect(() => {
    const channel = supabase
      .channel('novos-agendamentos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, (payload) => {
        fetchAgendamentos()
        showToast(`Novo agendamento: ${payload.new.nome} — ${payload.new.servico} ✅`)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchAgendamentos])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleNovoSuccess() {
    await fetchAgendamentos()
    showToast('Agendamento salvo com sucesso! ✅')
    setActiveTab('agenda')
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-md mx-auto px-5 py-6">

          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  agendamentos={agendamentos}
                  onNovoAgendamento={() => setActiveTab('novo')}
                />
              )}
              {activeTab === 'agenda' && (
                <Agenda
                  agendamentos={agendamentos}
                  onRefresh={fetchAgendamentos}
                  nomeBarbearia={nomeBarbearia}
                />
              )}
              {activeTab === 'novo' && (
                <AgendamentoForm
                  onSuccess={handleNovoSuccess}
                  onCancel={() => setActiveTab('dashboard')}
                />
              )}
              {activeTab === 'estoque' && (
                <Estoque showToast={showToast} />
              )}
              {activeTab === 'financeiro' && (
                <Financeiro agendamentos={agendamentos} />
              )}
              {activeTab === 'bloqueio' && (
                <Bloqueio />
              )}
            </>
          )}
        </div>
      </main>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-down
          px-5 py-3 rounded-2xl text-sm font-medium shadow-xl whitespace-nowrap
          ${toast.type === 'error'
            ? 'bg-red-500/90 text-white'
            : 'bg-blade-500/90 text-ink-900'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="h-8 w-48 bg-ink-800 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 bg-ink-800 rounded-3xl" />
        <div className="h-28 bg-ink-800 rounded-3xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 bg-ink-800 rounded-3xl" />
        <div className="h-20 bg-ink-800 rounded-3xl" />
        <div className="h-20 bg-ink-800 rounded-3xl" />
      </div>
      <div className="h-6 w-32 bg-ink-800 rounded-xl" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-ink-800 rounded-3xl" />
      ))}
    </div>
  )
}
