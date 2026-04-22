import { useState, useEffect } from 'react'
import { getDiasBloqueados, bloquearDia, desbloquearDia } from '../services/supabase'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatarData(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'long',
  }).replace(/^./, s => s.toUpperCase())
}

export default function Bloqueio() {
  const [dias,    setDias]    = useState([])
  const [data,    setData]    = useState('')
  const [motivo,  setMotivo]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function fetchDias() {
    const lista = await getDiasBloqueados()
    setDias(lista)
  }

  useEffect(() => { fetchDias() }, [])

  async function handleBloquear(e) {
    e.preventDefault()
    if (!data) { setError('Escolha uma data.'); return }
    if (data < hojeISO()) { setError('Não pode bloquear data passada.'); return }
    setError('')
    setLoading(true)
    try {
      await bloquearDia(data, motivo.trim())
      setData('')
      setMotivo('')
      await fetchDias()
    } catch (err) {
      setError(err.message.includes('duplicate') ? 'Essa data já está bloqueada.' : 'Erro ao bloquear.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDesbloquear(d) {
    try {
      await desbloquearDia(d)
      await fetchDias()
    } catch {
      setError('Erro ao desbloquear.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl text-white tracking-wide mb-1">Bloquear dias</h2>
        <p className="text-ink-400 text-sm">Clientes não conseguem agendar em datas bloqueadas</p>
      </div>

      <form onSubmit={handleBloquear} className="card flex flex-col gap-4">
        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Data</label>
          <input
            type="date"
            className="input"
            min={hojeISO()}
            value={data}
            onChange={e => setData(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
            Motivo <span className="normal-case font-normal text-ink-500">(opcional)</span>
          </label>
          <input
            className="input"
            placeholder="Ex: Feriado, Férias..."
            value={motivo}
            maxLength={100}
            onChange={e => setMotivo(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Bloqueando...' : '🔒 Bloquear data'}
        </button>
      </form>

      <div>
        <h3 className="text-white font-semibold mb-3">Datas bloqueadas ({dias.length})</h3>
        {dias.length === 0 ? (
          <p className="text-ink-500 text-sm">Nenhuma data bloqueada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dias.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-ink-800 border border-ink-700 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{formatarData(d.data)}</p>
                  {d.motivo && <p className="text-ink-400 text-xs mt-0.5">{d.motivo}</p>}
                </div>
                <button
                  onClick={() => handleDesbloquear(d.data)}
                  className="text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
