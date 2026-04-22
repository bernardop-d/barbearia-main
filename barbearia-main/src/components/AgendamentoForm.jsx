// src/components/AgendamentoForm.jsx
import { useState, useEffect, useMemo } from 'react'
import { criarAgendamento, atualizarAgendamento } from '../services/supabase'
import { CloseIcon, Spinner } from './Icons'
import ErrorMessage from './ErrorMessage'
import { SERVICOS, STATUS_OPTS } from '../constants'
import { useAsyncAction } from '../hooks/useAsyncAction'

function toInputDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function calcMinDateTime() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 30)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function validarFormulario(form) {
  const nome = form.nome.trim()
  if (!nome) return 'Informe o nome do cliente.'
  if (nome.length < 2) return 'Nome deve ter pelo menos 2 caracteres.'
  if (!form.data) return 'Informe a data e horário.'
  if (Number(form.preco) <= 0) return 'Informe um preço válido.'
  const whatsapp = form.whatsapp.replace(/\D/g, '')
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 11)) {
    return 'WhatsApp deve ter 10 ou 11 dígitos.'
  }
  return null
}

function sanitizarNome(nome) {
  return nome.replace(/[<>]/g, '').slice(0, 100)
}

export default function AgendamentoForm({ onSuccess, onCancel, editando }) {
  const [form, setForm] = useState({
    nome: '', servico: 'Corte', preco: 35, data: '', whatsapp: '', status: 'confirmado',
  })
  const { loading, error, setError, run } = useAsyncAction()

  const minDateTime = useMemo(calcMinDateTime, [])

  useEffect(() => {
    if (editando) {
      setForm({
        nome:     editando.nome     || '',
        servico:  editando.servico  || 'Corte',
        preco:    editando.preco    || 35,
        data:     toInputDate(editando.data),
        whatsapp: editando.whatsapp || '',
        status:   editando.status   || 'confirmado',
      })
    }
  }, [editando])

  function handleServico(id) {
    const servico = SERVICOS.find(s => s.id === id)
    setForm(prev => ({
      ...prev,
      servico: servico.label,
      preco: servico.preco > 0 ? servico.preco : prev.preco,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const erroValidacao = validarFormulario(form)
    if (erroValidacao) { setError(erroValidacao); return }

    await run(async () => {
      const payload = {
        nome:     sanitizarNome(form.nome.trim()),
        servico:  form.servico,
        preco:    Number(form.preco),
        data:     new Date(form.data).toISOString(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        status:   form.status,
      }
      if (editando) {
        await atualizarAgendamento(editando.id, payload)
      } else {
        await criarAgendamento(payload)
      }
      onSuccess()
    })
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl text-white tracking-wide">
            {editando ? 'Editar' : 'Novo'} Agendamento
          </h2>
          <p className="text-ink-400 text-sm mt-1">
            {editando ? 'Atualize as informações' : 'Preencha os dados do cliente'}
          </p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-ink-400 hover:text-white p-2 rounded-xl hover:bg-ink-800 transition-colors">
            <CloseIcon />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
            Nome do cliente *
          </label>
          <input
            className="input"
            placeholder="João Silva"
            value={form.nome}
            maxLength={100}
            onChange={e => setForm(prev => ({ ...prev, nome: sanitizarNome(e.target.value) }))}
          />
        </div>

        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
            Serviço *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {SERVICOS.map(servico => (
              <button
                key={servico.id}
                type="button"
                onClick={() => handleServico(servico.id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all duration-200 active:scale-95
                  ${form.servico === servico.label
                    ? 'bg-blade-500/15 border-blade-500/50 text-blade-400'
                    : 'bg-ink-700/40 border-ink-600 text-ink-300 hover:border-ink-500'
                  }`}
              >
                <span className="text-xl">{servico.emoji}</span>
                <span className="text-xs font-medium">{servico.label}</span>
                {servico.preco > 0 && (
                  <span className="text-[10px] text-ink-500">R${servico.preco}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
            Preço (R$) *
          </label>
          <input
            type="number"
            min="0.5"
            step="0.5"
            className="input font-mono"
            placeholder="0.00"
            value={form.preco}
            onChange={e => setForm(prev => ({ ...prev, preco: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
            Data e horário *
          </label>
          <input
            type="datetime-local"
            className="input"
            min={minDateTime}
            value={form.data}
            onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
            WhatsApp do cliente
          </label>
          <input
            type="tel"
            className="input"
            placeholder="(11) 99999-9999"
            value={form.whatsapp}
            maxLength={20}
            onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
          />
        </div>

        {editando && (
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
              Status
            </label>
            <div className="flex gap-2">
              {STATUS_OPTS.map(opcao => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, status: opcao }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 active:scale-95 capitalize
                    ${form.status === opcao
                      ? opcao === 'confirmado' ? 'bg-blade-500/20 border-blade-500/50 text-blade-400'
                        : opcao === 'finalizado' ? 'bg-gold-600/20 border-gold-600/50 text-gold-400'
                        : 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-ink-700/40 border-ink-600 text-ink-400'
                    }`}
                >
                  {opcao}
                </button>
              ))}
            </div>
          </div>
        )}

        <ErrorMessage message={error} />

        <div className="flex gap-3 mt-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-ghost flex-1">
              Cancelar
            </button>
          )}
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Salvando...
              </span>
            ) : editando ? 'Salvar alterações' : 'Criar agendamento'}
          </button>
        </div>
      </form>
    </div>
  )
}
