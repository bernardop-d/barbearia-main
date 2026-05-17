// src/components/Estoque.jsx
import { useState, useEffect, useCallback } from 'react'
import { getProdutos, criarProduto, criarVenda, ajustarEstoqueDb } from '../services/supabase'
import { formatarMoeda } from '../utils/formatters'
import { Spinner } from './Icons'

const TIPO_LABEL = { revenda: 'Revenda', insumo: 'Insumo' }

export default function Estoque({ showToast }) {
  const [produtos,   setProdutos]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [formNovo,   setFormNovo]   = useState(false)
  const [vendaId,    setVendaId]    = useState(null)
  const [ajusteId,   setAjusteId]   = useState(null)

  const carregar = useCallback(async () => {
    try {
      const data = await getProdutos()
      setProdutos(data)
    } catch {
      showToast('Erro ao carregar estoque.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { carregar() }, [carregar])

  const alertas = produtos.filter(p => p.estoque_atual <= p.estoque_minimo)

  async function handleVenda(produto, qtd) {
    try {
      await criarVenda({
        produto_id:     produto.id,
        produto_nome:   produto.nome,
        quantidade:     qtd,
        preco_unitario: produto.preco,
        total:          produto.preco * qtd,
      })
      await ajustarEstoqueDb(produto.id, -qtd)
      setVendaId(null)
      await carregar()
      showToast(`Venda de ${produto.nome} registrada!`)
    } catch {
      showToast('Erro ao registrar venda.', 'error')
    }
  }

  async function handleAjuste(produto, delta) {
    try {
      await ajustarEstoqueDb(produto.id, delta)
      setAjusteId(null)
      await carregar()
      showToast(`Estoque de ${produto.nome} ajustado!`)
    } catch {
      showToast('Erro ao ajustar estoque.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl text-white tracking-wide">Estoque</h2>
          <p className="text-ink-400 text-sm mt-1">{produtos.length} produto(s)</p>
        </div>
        <button
          onClick={() => setFormNovo(true)}
          className="btn-primary text-sm px-4 py-2.5 max-w-fit"
        >
          + Produto
        </button>
      </div>

      {alertas.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl px-4 py-3">
          <p className="text-orange-400 font-medium text-sm">
            ⚠️ {alertas.length} produto(s) abaixo do mínimo
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {alertas.map(p => (
              <li key={p.id} className="text-orange-300/80 text-xs">
                {p.nome}: {p.estoque_atual} {p.unidade} (mín: {p.estoque_minimo})
              </li>
            ))}
          </ul>
        </div>
      )}

      {formNovo && (
        <NovoProdutoForm
          onSalvar={async (dados) => {
            try {
              await criarProduto(dados)
              setFormNovo(false)
              await carregar()
              showToast('Produto criado!')
            } catch {
              showToast('Erro ao criar produto.', 'error')
            }
          }}
          onCancelar={() => setFormNovo(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={24} /></div>
      ) : produtos.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-ink-400 text-sm">Nenhum produto cadastrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {produtos.map(p => (
            <ProdutoCard
              key={p.id}
              produto={p}
              vendaAberta={vendaId === p.id}
              ajusteAberto={ajusteId === p.id}
              onToggleVenda={() => {
                setVendaId(prev => prev === p.id ? null : p.id)
                setAjusteId(null)
              }}
              onToggleAjuste={() => {
                setAjusteId(prev => prev === p.id ? null : p.id)
                setVendaId(null)
              }}
              onVenda={(qtd) => handleVenda(p, qtd)}
              onAjuste={(delta) => handleAjuste(p, delta)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProdutoCard({ produto: p, vendaAberta, ajusteAberto, onToggleVenda, onToggleAjuste, onVenda, onAjuste }) {
  const [qtdVenda,  setQtdVenda]  = useState('1')
  const [qtdAjuste, setQtdAjuste] = useState('1')
  const alerta = p.estoque_atual <= p.estoque_minimo

  return (
    <div className={`card ${alerta ? 'border-orange-500/30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alerta ? 'bg-orange-500/10' : 'bg-blade-500/10'}`}>
          <span className={`font-bold text-sm ${alerta ? 'text-orange-400' : 'text-blade-400'}`}>
            {p.nome[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{p.nome}</p>
          <p className="text-ink-400 text-xs mt-0.5">
            {TIPO_LABEL[p.tipo]} · {formatarMoeda(p.preco)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-mono font-bold text-sm ${alerta ? 'text-orange-400' : 'text-white'}`}>
            {p.estoque_atual} {p.unidade}
          </p>
          <p className="text-ink-500 text-xs">mín: {p.estoque_minimo}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {p.tipo === 'revenda' && (
          <button
            onClick={onToggleVenda}
            className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95
              ${vendaAberta
                ? 'bg-blade-500/20 border-blade-500/50 text-blade-400'
                : 'bg-ink-700/40 border-ink-600 text-ink-400'}`}
          >
            Vender
          </button>
        )}
        <button
          onClick={onToggleAjuste}
          className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95
            ${ajusteAberto
              ? 'bg-blade-500/20 border-blade-500/50 text-blade-400'
              : 'bg-ink-700/40 border-ink-600 text-ink-400'}`}
        >
          Ajustar
        </button>
      </div>

      {vendaAberta && (
        <div className="mt-3 pt-3 border-t border-ink-700/60 flex gap-2">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={qtdVenda}
            onChange={e => setQtdVenda(e.target.value)}
            className="input flex-1 text-sm py-2.5"
            placeholder="Quantidade"
          />
          <button
            onClick={() => {
              const q = parseFloat(qtdVenda)
              if (q > 0) onVenda(q)
            }}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-blade-500/20 border border-blade-500/40 text-blade-400 active:scale-95 transition-all"
          >
            Confirmar venda
          </button>
        </div>
      )}

      {ajusteAberto && (
        <div className="mt-3 pt-3 border-t border-ink-700/60">
          <p className="text-ink-500 text-xs mb-2">Positivo para adicionar, negativo para retirar</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              value={qtdAjuste}
              onChange={e => setQtdAjuste(e.target.value)}
              className="input flex-1 text-sm py-2.5"
              placeholder="Ex: 10 ou -5"
            />
            <button
              onClick={() => {
                const q = parseFloat(qtdAjuste)
                if (!isNaN(q)) onAjuste(q)
              }}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-blade-500/20 border border-blade-500/40 text-blade-400 active:scale-95 transition-all"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NovoProdutoForm({ onSalvar, onCancelar }) {
  const [form,    setForm]    = useState({
    nome: '', tipo: 'revenda', preco: '', estoque_atual: '0', estoque_minimo: '1', unidade: 'un',
  })
  const [loading, setLoading] = useState(false)

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setLoading(true)
    try {
      await onSalvar({
        nome:            form.nome.trim(),
        tipo:            form.tipo,
        preco:           parseFloat(form.preco) || 0,
        estoque_atual:   parseFloat(form.estoque_atual) || 0,
        estoque_minimo:  parseFloat(form.estoque_minimo) || 1,
        unidade:         form.unidade.trim() || 'un',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <p className="text-white font-medium text-sm">Novo produto</p>
      <input
        className="input"
        placeholder="Nome do produto *"
        value={form.nome}
        onChange={e => set('nome', e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
          <option value="revenda">Revenda</option>
          <option value="insumo">Insumo</option>
        </select>
        <input
          className="input"
          placeholder="Unidade (un, ml, kg...)"
          value={form.unidade}
          onChange={e => set('unidade', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          className="input"
          type="number"
          placeholder="Preço R$"
          value={form.preco}
          onChange={e => set('preco', e.target.value)}
          min="0"
          step="0.01"
        />
        <input
          className="input"
          type="number"
          placeholder="Qtd atual"
          value={form.estoque_atual}
          onChange={e => set('estoque_atual', e.target.value)}
          min="0"
        />
        <input
          className="input"
          type="number"
          placeholder="Qtd mínima"
          value={form.estoque_minimo}
          onChange={e => set('estoque_minimo', e.target.value)}
          min="0"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-ink-700/40 border border-ink-600 text-ink-400 active:scale-95"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-blade-500/20 border border-blade-500/40 text-blade-400 active:scale-95 disabled:opacity-40"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
