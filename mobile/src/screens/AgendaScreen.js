import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator, Alert, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD, INPUT } from '../theme'
import { getAgendamentos, atualizarStatus, atualizarAgendamento, removerAgendamento } from '../services/supabase'
import { STATUS_LABEL } from '../constants'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDataCurta(date) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function formatHora(date) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function formatDataLonga(date) {
  return new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, s => s.toUpperCase())
}

const FILTROS = [
  { id: 'todos',      label: 'Todos' },
  { id: 'confirmado', label: 'Confirmados' },
  { id: 'finalizado', label: 'Finalizados' },
  { id: 'cancelado',  label: 'Cancelados' },
]

export default function AgendaScreen({ navigation }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [filtro, setFiltro]             = useState('todos')
  const [busca, setBusca]               = useState('')
  const [expanded, setExpanded]         = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const data = await getAgendamentos()
      setAgendamentos(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData)
    return unsubscribe
  }, [navigation, fetchData])

  const lista = useMemo(() => {
    let r = [...agendamentos]
    if (filtro !== 'todos') r = r.filter(a => a.status === filtro)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      r = r.filter(a => a.nome.toLowerCase().includes(q) || a.servico.toLowerCase().includes(q))
    }
    return r.sort((a, b) => new Date(b.data) - new Date(a.data))
  }, [agendamentos, filtro, busca])

  async function handleStatus(id, status) {
    try { await atualizarStatus(id, status); await fetchData() }
    catch (e) { Alert.alert('Erro', 'Não foi possível atualizar o status. Tente novamente.') }
  }

  async function handlePago(id, pago) {
    try { await atualizarAgendamento(id, { pago }); await fetchData() }
    catch (e) { Alert.alert('Erro', 'Não foi possível atualizar o pagamento. Tente novamente.') }
  }

  function handleRemover(agendamento) {
    Alert.alert(
      'Remover agendamento',
      `Remover o agendamento de ${agendamento.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: async () => {
            try { await removerAgendamento(agendamento.id); await fetchData() }
            catch (e) { console.error(e) }
          },
        },
      ]
    )
  }

  function handleWhatsApp(agendamento) {
    const dataFmt = formatDataLonga(agendamento.data)
    const horaFmt = formatHora(agendamento.data)
    const msg = encodeURIComponent(
      `Olá, ${agendamento.nome}!\n\nSeu agendamento na *DUNGABARBER* está confirmado.\n\n` +
      `*Serviço:* ${agendamento.servico}\n*Data:* ${dataFmt}\n*Horário:* ${horaFmt}\n` +
      `*Valor:* ${formatMoeda(agendamento.preco)}\n\nTe esperamos!`
    )
    const numero = agendamento.whatsapp?.replace(/\D/g, '')
    const url = numero ? `https://wa.me/55${numero}?text=${msg}` : `https://wa.me/?text=${msg}`
    Linking.openURL(url)
  }

  if (loading) {
    return (
      <View style={[s.bg, s.center]}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    )
  }

  return (
    <View style={s.bg}>
      <ScrollView
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.green} />}
      >
        <View style={s.header}>
          <Text style={s.title}>Agenda</Text>
          <Text style={s.subtitle}>{agendamentos.length} agendamento(s) no total</Text>
        </View>

        <TextInput
          style={[INPUT, s.searchInput]}
          placeholder="Buscar por nome ou serviço..."
          placeholderTextColor={COLORS.textDim}
          value={busca}
          onChangeText={setBusca}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtros} contentContainerStyle={s.filtrosContent}>
          {FILTROS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[s.filtroBtn, filtro === f.id && s.filtroBtnActive]}
              onPress={() => setFiltro(f.id)}
            >
              <Text style={[s.filtroText, filtro === f.id && s.filtroTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {lista.length === 0 ? (
          <View style={[CARD, s.emptyCard]}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.textDim} style={{ marginBottom: 12 }} />
            <Text style={s.emptyText}>Nenhum agendamento encontrado</Text>
          </View>
        ) : (
          lista.map(a => (
            <AgendamentoCard
              key={a.id}
              agendamento={a}
              expanded={expanded === a.id}
              onToggle={() => setExpanded(prev => prev === a.id ? null : a.id)}
              onStatus={handleStatus}
              onPago={handlePago}
              onEditar={() => navigation.navigate('EditarAgendamento', { agendamento: a })}
              onRemover={handleRemover}
              onWhatsApp={handleWhatsApp}
            />
          ))
        )}
      </ScrollView>
    </View>
  )
}

function AgendamentoCard({ agendamento, expanded, onToggle, onStatus, onPago, onEditar, onRemover, onWhatsApp }) {
  const statusInfo = STATUS_LABEL[agendamento.status] || STATUS_LABEL.pendente
  const agora = new Date()
  const data  = new Date(agendamento.data)
  const diff  = data - agora
  const alertar = agendamento.status === 'confirmado' && diff > 0 && diff <= 60 * 60 * 1000

  return (
    <View style={[CARD, s.card, alertar && s.cardAlert]}>
      {alertar && (
        <TouchableOpacity
          style={s.alertBar}
          onPress={() => {
            const horaFmt = formatHora(agendamento.data)
            const numero  = agendamento.whatsapp?.replace(/\D/g, '')
            const msg = encodeURIComponent(`Olá, ${agendamento.nome}! Passando para lembrar que seu horário na *DUNGABARBER* é hoje às *${horaFmt}*. Até logo!`)
            const url = numero ? `https://wa.me/55${numero}?text=${msg}` : `https://wa.me/?text=${msg}`
            Linking.openURL(url)
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={14} color={COLORS.orange} />
              <Text style={s.alertText}>Falta menos de 1h — avisar cliente</Text>
            </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.cardRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{agendamento.nome[0].toUpperCase()}</Text>
        </View>
        <View style={s.cardInfo}>
          <Text style={s.cardNome} numberOfLines={1}>{agendamento.nome}</Text>
          <Text style={s.cardSub}>{agendamento.servico} · {formatDataCurta(agendamento.data)} às {formatHora(agendamento.data)}</Text>
        </View>
        <View style={s.cardRight}>
          <Text style={s.cardPreco}>{formatMoeda(agendamento.preco)}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
            <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>
        <Text style={[s.chevron, expanded && s.chevronOpen]}>›</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={s.expanded}>
          <View style={s.actionRow}>
            {agendamento.status === 'confirmado' && (<>
              <TouchableOpacity style={[s.actionBtn, s.actionGold]} onPress={() => onStatus(agendamento.id, 'finalizado')}>
                <Text style={[s.actionBtnText, { color: COLORS.goldLight }]}>Finalizar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.actionGhost]} onPress={() => onStatus(agendamento.id, 'cancelado')}>
                <Text style={[s.actionBtnText, { color: COLORS.textMuted }]}>Cancelar</Text>
              </TouchableOpacity>
            </>)}
            {agendamento.status === 'cancelado' && (
              <TouchableOpacity style={[s.actionBtn, s.actionGreen]} onPress={() => onStatus(agendamento.id, 'confirmado')}>
                <Text style={[s.actionBtnText, { color: COLORS.green }]}>Reativar</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[s.pagoBtn, agendamento.pago && s.pagoBtnAtivo]}
            onPress={() => onPago(agendamento.id, !agendamento.pago)}
          >
            <Text style={[s.pagoBtnText, agendamento.pago && s.pagoBtnTextAtivo]}>
              {agendamento.pago ? 'Pago — desfazer' : 'Marcar como pago'}
            </Text>
          </TouchableOpacity>

          <View style={s.actionRow}>
            <TouchableOpacity style={[s.actionBtn, s.actionWa]} onPress={() => onWhatsApp(agendamento)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="logo-whatsapp" size={14} color="#4ade80" />
                <Text style={[s.actionBtnText, { color: '#4ade80' }]}>WhatsApp</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionGhost]} onPress={onEditar}>
              <Text style={[s.actionBtnText, { color: COLORS.white }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionGhost]} onPress={() => onRemover(agendamento)}>
              <Text style={[s.actionBtnText, { color: COLORS.error }]}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  center:    { alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  header:    { marginBottom: 16 },
  title:     { color: COLORS.white, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  subtitle:  { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  searchInput: { marginBottom: 12 },
  filtros:   { marginBottom: 16 },
  filtrosContent: { gap: 8, paddingRight: 20 },
  filtroBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  filtroBtnActive: {
    backgroundColor: COLORS.greenBg,
    borderColor: COLORS.greenBorder,
  },
  filtroText:       { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  filtroTextActive: { color: COLORS.green },
  emptyCard:  { alignItems: 'center', paddingVertical: 48 },
  emptyText:  { color: COLORS.textMuted, fontSize: 13 },
  card:       { marginBottom: 8 },
  cardAlert:  { borderColor: 'rgba(249,115,22,0.4)' },
  alertBar: {
    backgroundColor: COLORS.orangeBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.orangeBorder,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  alertText:  { color: COLORS.orange, fontSize: 12, fontWeight: '600' },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44, height: 44,
    backgroundColor: COLORS.cardAlt,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText:  { color: COLORS.greenLight, fontSize: 18, fontWeight: '800' },
  cardInfo:    { flex: 1 },
  cardNome:    { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  cardSub:     { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  cardRight:   { alignItems: 'flex-end' },
  cardPreco:   { color: COLORS.greenLight, fontSize: 13, fontWeight: '700' },
  statusBadge: {
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  chevron:    { color: COLORS.textDim, fontSize: 22, fontWeight: '300', transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  expanded: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 8,
  },
  actionRow:  { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, alignItems: 'center',
    borderColor: COLORS.border, backgroundColor: COLORS.cardAlt,
  },
  actionGreen: { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  actionGold:  { backgroundColor: COLORS.goldBg,  borderColor: COLORS.goldBorder },
  actionWa:    { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' },
  actionGhost: { backgroundColor: COLORS.cardAlt, borderColor: COLORS.border },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  pagoBtn: {
    paddingVertical: 11, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', borderColor: COLORS.border, backgroundColor: COLORS.cardAlt,
  },
  pagoBtnAtivo: { backgroundColor: COLORS.emeraldBg, borderColor: COLORS.emeraldBorder },
  pagoBtnText:  { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  pagoBtnTextAtivo: { color: COLORS.emerald },
})
