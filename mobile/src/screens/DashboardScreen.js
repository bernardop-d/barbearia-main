import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native'
import * as Notifications from 'expo-notifications'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD } from '../theme'
import { getAgendamentos, getProdutos, logout, supabase } from '../services/supabase'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDataLonga(date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^./, s => s.toUpperCase())
}
function formatHora(date) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function inicioDiaAmanha() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d
}

export default function DashboardScreen({ navigation }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [estoqueBaixo, setEstoqueBaixo] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [agendLemb,    setAgendLemb]    = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [ag, prods] = await Promise.all([getAgendamentos(), getProdutos()])
      setAgendamentos(ag || [])
      setEstoqueBaixo(prods.filter(p => p.estoque_atual <= p.estoque_minimo))
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData)
    return unsub
  }, [navigation, fetchData])

  useEffect(() => {
    const ch = supabase
      .channel('dashboard-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchData])

  const amDate = inicioDiaAmanha()
  const amFim  = new Date(amDate); amFim.setHours(23, 59, 59, 999)

  const stats = useMemo(() => {
    const agora = new Date()
    const iniDia = new Date(agora); iniDia.setHours(0, 0, 0, 0)
    const fimDia = new Date(agora); fimDia.setHours(23, 59, 59, 999)
    const iniMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    let fatTotal = 0, fatMes = 0, confirmados = 0, finalizados = 0, hoje = 0
    for (const a of agendamentos) {
      const d = new Date(a.data); const p = Number(a.preco)
      if (a.status === 'finalizado') { fatTotal += p; if (d >= iniMes) fatMes += p; finalizados++ }
      else if (a.status === 'confirmado') confirmados++
      if (d >= iniDia && d <= fimDia) hoje++
    }
    return { fatTotal, fatMes, confirmados, finalizados, hoje }
  }, [agendamentos])

  const proximos = useMemo(() =>
    agendamentos.filter(a => a.status === 'confirmado' && new Date(a.data) >= new Date()).slice(0, 3),
    [agendamentos])

  const amanha = useMemo(() =>
    agendamentos.filter(a => {
      const d = new Date(a.data)
      return a.status === 'confirmado' && d >= amDate && d <= amFim
    }).sort((a, b) => new Date(a.data) - new Date(b.data)),
    [agendamentos])

  async function agendarLembretes() {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Ative as notificações nas configurações do dispositivo.'); return }
    await Notifications.cancelAllScheduledNotificationsAsync()
    for (const a of amanha) {
      const trigger = new Date(a.data)
      trigger.setHours(trigger.getHours() - 1)
      if (trigger > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Próximo cliente — DUNGABARBER',
            body:  `${a.nome} · ${a.servico} às ${formatHora(a.data)}`,
            sound: true,
          },
          trigger,
        })
      }
    }
    setAgendLemb(true)
    Alert.alert('Lembretes agendados', `${amanha.length} notificação(ões) configurada(s) para amanhã.`)
  }

  if (loading) return <View style={[s.bg, s.center]}><ActivityIndicator color={COLORS.green} size="large" /></View>

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.green} />}
    >
      {/* Topbar */}
      <View style={s.topbar}>
        <Text style={s.topbarLabel}>Dashboard</Text>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={s.greeting}>
        <Text style={s.greetingTitle}>Olá, Barbeiro</Text>
        <Text style={s.greetingDate}>{formatDataLonga(new Date())}</Text>
      </View>

      {/* Alerta estoque baixo */}
      {estoqueBaixo.length > 0 && (
        <TouchableOpacity style={s.alertCard} onPress={() => navigation.navigate('Estoque')} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="warning-outline" size={16} color={COLORS.error} />
            <Text style={s.alertText}>
              {estoqueBaixo.length} produto(s) com estoque baixo — toque para ver
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={COLORS.error} />
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={s.statsRow}>
        <StatCard label="Faturamento total" value={formatMoeda(stats.fatTotal)} iconName="cash-outline" accent="green" />
        <StatCard label="Este mês"          value={formatMoeda(stats.fatMes)}   iconName="stats-chart-outline" accent="gold" />
      </View>
      <View style={s.miniRow}>
        <MiniStat label="Hoje"        value={stats.hoje} />
        <MiniStat label="Confirmados" value={stats.confirmados} />
        <MiniStat label="Finalizados" value={stats.finalizados} />
      </View>

      {/* Banner link */}
      <TouchableOpacity
        style={s.banner}
        onPress={() => Linking.openURL('https://bernardop-d.github.io/barbearia-main/booking/')}
        activeOpacity={0.8}
      >
        <View style={s.bannerIcon}><Ionicons name="link-outline" size={18} color={COLORS.green} /></View>
        <View style={s.bannerBody}>
          <Text style={s.bannerTitle}>Compartilhe o link com seus clientes</Text>
          <Text style={s.bannerSub}>Site de agendamento online</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(0,232,122,0.35)" />
      </TouchableOpacity>

      {/* Agendamentos de amanhã + lembretes */}
      {amanha.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Amanhã ({amanha.length})</Text>
            <TouchableOpacity
              style={[s.lembBtn, agendLemb && s.lembBtnOk]}
              onPress={agendarLembretes}
            >
              <Ionicons name={agendLemb ? 'notifications' : 'notifications-outline'} size={13} color={agendLemb ? COLORS.green : COLORS.textMuted} />
              <Text style={[s.lembText, agendLemb && { color: COLORS.green }]}>
                {agendLemb ? 'Lembretes ok' : 'Lembrar'}
              </Text>
            </TouchableOpacity>
          </View>
          {amanha.map(a => <ProximoCard key={a.id} agendamento={a} />)}
        </>
      )}

      {/* Próximos */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Próximos</Text>
        <Text style={s.sectionCount}>{proximos.length} agendamento(s)</Text>
      </View>
      {proximos.length === 0 ? (
        <View style={[CARD, s.emptyCard]}>
          <Ionicons name="calendar-off-outline" size={32} color="#2a2a2a" style={{ marginBottom: 12 }} />
          <Text style={s.emptyText}>Nenhum agendamento futuro</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('EditarAgendamento', {})}>
            <Text style={s.emptyBtnText}>Criar agendamento</Text>
          </TouchableOpacity>
        </View>
      ) : proximos.map(a => <ProximoCard key={a.id} agendamento={a} />)}
    </ScrollView>
  )
}

function StatCard({ label, value, iconName, accent }) {
  const c = accent === 'green' ? COLORS.green : COLORS.gold
  return (
    <View style={[CARD, s.statCard]}>
      <Ionicons name={iconName} size={18} color={c} style={{ marginBottom: 10 }} />
      <Text style={[s.statValue, { color: c }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function MiniStat({ label, value }) {
  return (
    <View style={[CARD, s.miniCard]}>
      <Text style={s.miniValue}>{value}</Text>
      <Text style={s.miniLabel}>{label}</Text>
    </View>
  )
}

function ProximoCard({ agendamento }) {
  return (
    <View style={[CARD, s.apptCard]}>
      <View style={s.apptAvatar}>
        <Text style={s.apptAvatarText}>{agendamento.nome[0].toUpperCase()}</Text>
      </View>
      <View style={s.apptInfo}>
        <Text style={s.apptNome} numberOfLines={1}>{agendamento.nome}</Text>
        <Text style={s.apptSub}>{agendamento.servico} · {formatHora(new Date(agendamento.data))}</Text>
      </View>
      <Text style={s.apptPreco}>{formatMoeda(agendamento.preco)}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  center:    { alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 80 },

  topbar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  topbarLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase' },
  logoutBtn:   { backgroundColor: COLORS.card, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 7 },
  logoutText:  { color: '#888', fontSize: 12, fontWeight: '500' },

  greeting:      { marginBottom: 20 },
  greetingTitle: { color: COLORS.white, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  greetingDate:  { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,77,77,0.08)', borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.25)', padding: 12, marginBottom: 16,
  },
  alertText: { color: COLORS.error, fontSize: 13, fontWeight: '500', flex: 1 },

  statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard:  { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, lineHeight: 24 },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 5, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.7 },

  miniRow:   { flexDirection: 'row', gap: 10, marginBottom: 20 },
  miniCard:  { flex: 1, alignItems: 'center', paddingVertical: 14 },
  miniValue: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  miniLabel: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 4, fontWeight: '500' },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.greenBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.greenBorder,
    padding: 14, marginBottom: 20, gap: 12,
  },
  bannerIcon:  { backgroundColor: 'rgba(0,232,122,0.12)', borderRadius: 8, padding: 8 },
  bannerBody:  { flex: 1 },
  bannerTitle: { color: COLORS.green, fontSize: 13, fontWeight: '600' },
  bannerSub:   { color: 'rgba(0,232,122,0.5)', fontSize: 11, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  sectionCount:  { color: COLORS.textMuted, fontSize: 12 },

  lembBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 6 },
  lembBtnOk: { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  lembText:  { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },

  emptyCard:    { alignItems: 'center', paddingVertical: 32, marginBottom: 16 },
  emptyText:    { color: COLORS.textMuted, fontSize: 13, marginBottom: 16 },
  emptyBtn:     { backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 11 },
  emptyBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  apptCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  apptAvatar:     { width: 38, height: 38, borderRadius: 8, backgroundColor: 'rgba(0,232,122,0.12)', alignItems: 'center', justifyContent: 'center' },
  apptAvatarText: { color: COLORS.green, fontSize: 15, fontWeight: '700' },
  apptInfo:       { flex: 1 },
  apptNome:       { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  apptSub:        { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  apptPreco:      { color: COLORS.green, fontSize: 14, fontWeight: '700' },
})
