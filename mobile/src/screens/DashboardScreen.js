import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD } from '../theme'
import { getAgendamentos, logout, supabase } from '../services/supabase'

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

export default function DashboardScreen({ navigation }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)

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

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, () => {
        fetchData()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchData])

  const stats = useMemo(() => {
    const agora     = new Date()
    const inicioDia = new Date(agora); inicioDia.setHours(0, 0, 0, 0)
    const fimDia    = new Date(agora); fimDia.setHours(23, 59, 59, 999)
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    let faturamentoTotal = 0, faturamentoMes = 0, confirmados = 0, finalizados = 0, hoje = 0
    for (const a of agendamentos) {
      const data  = new Date(a.data)
      const preco = Number(a.preco)
      if (a.status === 'finalizado') {
        faturamentoTotal += preco
        if (data >= inicioMes) faturamentoMes += preco
        finalizados++
      } else if (a.status === 'confirmado') {
        confirmados++
      }
      if (data >= inicioDia && data <= fimDia) hoje++
    }
    return { faturamentoTotal, faturamentoMes, confirmados, finalizados, hoje }
  }, [agendamentos])

  const proximos = useMemo(() =>
    agendamentos
      .filter(a => a.status === 'confirmado' && new Date(a.data) >= new Date())
      .slice(0, 3),
    [agendamentos]
  )

  if (loading) {
    return (
      <View style={[s.bg, s.center]}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    )
  }

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

      {/* Saudação */}
      <View style={s.greeting}>
        <Text style={s.greetingTitle}>Olá, Barbeiro</Text>
        <Text style={s.greetingDate}>{formatDataLonga(new Date())}</Text>
      </View>

      {/* Stats principais (2 cols) */}
      <View style={s.statsRow}>
        <StatCard label="Faturamento total" value={formatMoeda(stats.faturamentoTotal)} iconName="cash-outline"      accent="green" />
        <StatCard label="Este mês"           value={formatMoeda(stats.faturamentoMes)}   iconName="calendar-stats-outline" accent="gold" />
      </View>

      {/* Mini stats (3 cols) */}
      <View style={s.miniRow}>
        <MiniStat label="Hoje"        value={stats.hoje} />
        <MiniStat label="Confirmados" value={stats.confirmados} />
        <MiniStat label="Finalizados" value={stats.finalizados} />
      </View>

      {/* Banner CTA */}
      <TouchableOpacity
        style={s.banner}
        onPress={() => Linking.openURL('https://bernardop-d.github.io/barbearia-main/booking/')}
        activeOpacity={0.8}
      >
        <View style={s.bannerIcon}>
          <Ionicons name="link-outline" size={18} color={COLORS.green} />
        </View>
        <View style={s.bannerBody}>
          <Text style={s.bannerTitle}>Agendamentos sem dor de cabeça</Text>
          <Text style={s.bannerSub}>Compartilhe o link do site com seus clientes</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(0,232,122,0.35)" />
      </TouchableOpacity>

      {/* Próximos */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Próximos</Text>
        <Text style={s.sectionCount}>{proximos.length} agendamentos</Text>
      </View>

      {proximos.length === 0 ? (
        <View style={[CARD, s.emptyCard]}>
          <Ionicons name="calendar-off-outline" size={32} color="#2a2a2a" style={{ marginBottom: 12 }} />
          <Text style={s.emptyText}>Nenhum agendamento futuro</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Novo')}>
            <Text style={s.emptyBtnText}>Criar agendamento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        proximos.map(a => <ProximoCard key={a.id} agendamento={a} />)
      )}
    </ScrollView>
  )
}

function StatCard({ label, value, iconName, accent }) {
  const valueColor = accent === 'green' ? COLORS.green : COLORS.gold
  const iconColor  = accent === 'green' ? COLORS.green : COLORS.gold
  return (
    <View style={[CARD, s.statCard]}>
      <Ionicons name={iconName} size={18} color={iconColor} style={{ marginBottom: 10 }} />
      <Text style={[s.statValue, { color: valueColor }]}>{value}</Text>
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
  const inicial = agendamento.nome[0].toUpperCase()
  return (
    <View style={[CARD, s.apptCard]}>
      <View style={s.apptAvatar}>
        <Text style={s.apptAvatarText}>{inicial}</Text>
      </View>
      <View style={s.apptInfo}>
        <Text style={s.apptNome} numberOfLines={1}>{agendamento.nome}</Text>
        <Text style={s.apptSub}>{agendamento.servico} · {formatHora(new Date(agendamento.data))}</Text>
      </View>
      <View style={s.apptRight}>
        <Text style={s.apptPreco}>{formatMoeda(agendamento.preco)}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>Confirmado</Text>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: COLORS.bg },
  center:  { alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 80 },

  topbar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  topbarLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', letterSpacing: 0.08 * 13, textTransform: 'uppercase' },
  logoutBtn:   { backgroundColor: COLORS.card, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 7 },
  logoutText:  { color: '#888', fontSize: 12, fontWeight: '500', letterSpacing: 0.04 * 12 },

  greeting:      { marginBottom: 20 },
  greetingTitle: { color: COLORS.white, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, lineHeight: 30 },
  greetingDate:  { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, lineHeight: 24 },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 5, fontWeight: '500', letterSpacing: 0.06 * 11, textTransform: 'uppercase' },

  miniRow:   { flexDirection: 'row', gap: 10, marginBottom: 20 },
  miniCard:  { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10 },
  miniValue: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  miniLabel: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.06 * 10, marginTop: 4, fontWeight: '500' },

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

  emptyCard:    { alignItems: 'center', paddingVertical: 32 },
  emptyText:    { color: COLORS.textMuted, fontSize: 13, marginBottom: 16 },
  emptyBtn:     { backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 22, paddingVertical: 11 },
  emptyBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  apptCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  apptAvatar:     { width: 38, height: 38, borderRadius: 8, backgroundColor: 'rgba(0,232,122,0.12)', alignItems: 'center', justifyContent: 'center' },
  apptAvatarText: { color: COLORS.green, fontSize: 15, fontWeight: '700' },
  apptInfo:       { flex: 1, minWidth: 0 },
  apptNome:       { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  apptSub:        { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  apptRight:      { alignItems: 'flex-end' },
  apptPreco:      { color: COLORS.green, fontSize: 14, fontWeight: '700' },
  badge:          { backgroundColor: 'rgba(0,232,122,0.12)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,232,122,0.27)', paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  badgeText:      { color: COLORS.green, fontSize: 9, fontWeight: '700', letterSpacing: 0.08 * 9, textTransform: 'uppercase' },
})
