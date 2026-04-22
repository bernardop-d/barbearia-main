import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native'
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

function formatMes(date) {
  return new Date(date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
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
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Olá, Barbeiro! ✂️</Text>
          <Text style={s.date}>{formatDataLonga(new Date())}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Faturamento */}
      <View style={s.row}>
        <StatCard label="Faturamento total" value={formatMoeda(stats.faturamentoTotal)} icon="💰" accent="green" big />
        <View style={s.spacer} />
        <StatCard label="Este mês"           value={formatMoeda(stats.faturamentoMes)}   icon="📆" accent="gold"  big />
      </View>

      {/* Stats menores */}
      <View style={s.row3}>
        <StatCard label="Hoje"        value={stats.hoje}        icon="⏰" />
        <StatCard label="Confirmados" value={stats.confirmados} icon="✅" />
        <StatCard label="Finalizados" value={stats.finalizados} icon="🏆" />
      </View>

      {/* Banner agendamento online */}
      <TouchableOpacity
        style={s.banner}
        onPress={() => Linking.openURL('https://bernardop-d.github.io/barbearia-main/booking/')}
        activeOpacity={0.8}
      >
        <View style={s.bannerLeft}>
          <Text style={s.bannerEmoji}>💈</Text>
        </View>
        <View style={s.bannerBody}>
          <Text style={s.bannerTitle}>Agendamentos sem dor de cabeça</Text>
          <Text style={s.bannerSub}>Compartilhe o link do site com seus clientes</Text>
        </View>
        <Text style={s.bannerArrow}>›</Text>
      </TouchableOpacity>

      {/* Próximos */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Próximos</Text>
          <Text style={s.sectionCount}>{proximos.length} agendamentos</Text>
        </View>

        {proximos.length === 0 ? (
          <View style={[CARD, s.emptyCard]}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyText}>Nenhum agendamento futuro</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate('Novo')}
            >
              <Text style={s.emptyBtnText}>Criar agendamento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          proximos.map(a => <ProximoCard key={a.id} agendamento={a} />)
        )}
      </View>
    </ScrollView>
  )
}

function StatCard({ label, value, icon, accent, big }) {
  const valueColor = accent === 'green' ? COLORS.greenLight : accent === 'gold' ? COLORS.goldLight : COLORS.white
  return (
    <View style={[CARD, s.statCard, big && s.statCardBig]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, { color: valueColor }, big && s.statValueBig]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function ProximoCard({ agendamento }) {
  const data = new Date(agendamento.data)
  return (
    <View style={[CARD, s.proximoCard]}>
      <View style={s.proximoDate}>
        <Text style={s.proximoDay}>{String(data.getDate()).padStart(2, '0')}</Text>
        <Text style={s.proximoMonth}>{formatMes(data)}</Text>
      </View>
      <View style={s.proximoInfo}>
        <Text style={s.proximoNome} numberOfLines={1}>{agendamento.nome}</Text>
        <Text style={s.proximoSub}>{agendamento.servico} · {formatHora(data)}</Text>
      </View>
      <View style={s.proximoRight}>
        <Text style={s.proximoPreco}>{formatMoeda(agendamento.preco)}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>confirmado</Text>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  center:    { alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting:  { color: COLORS.white, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  date:      { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },

  row:  { flexDirection: 'row', marginBottom: 10 },
  row3: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  spacer: { width: 8 },

  statCard:     { flex: 1, paddingVertical: 16 },
  statCardBig:  { paddingVertical: 20 },
  statIcon:     { fontSize: 20, marginBottom: 6 },
  statValue:    { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  statValueBig: { fontSize: 16 },
  statLabel:    { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  section:      { marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  sectionCount:  { color: COLORS.textMuted, fontSize: 12 },

  emptyCard:    { alignItems: 'center', paddingVertical: 40 },
  emptyIcon:    { fontSize: 36, marginBottom: 12 },
  emptyText:    { color: COLORS.textMuted, fontSize: 13 },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: COLORS.greenBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: { color: COLORS.green, fontSize: 13, fontWeight: '600' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  bannerLeft:  { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center' },
  bannerEmoji: { fontSize: 22 },
  bannerBody:  { flex: 1 },
  bannerTitle: { color: COLORS.greenLight, fontSize: 13, fontWeight: '700' },
  bannerSub:   { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  bannerArrow: { color: COLORS.green, fontSize: 22, fontWeight: '300' },

  proximoCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  proximoDate: {
    width: 48, height: 48,
    backgroundColor: COLORS.greenBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proximoDay:   { color: COLORS.greenLight, fontSize: 14, fontWeight: '700' },
  proximoMonth: { color: 'rgba(74,222,128,0.5)', fontSize: 10, textTransform: 'uppercase' },
  proximoInfo:  { flex: 1 },
  proximoNome:  { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  proximoSub:   { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  proximoRight: { alignItems: 'flex-end' },
  proximoPreco: { color: COLORS.greenLight, fontSize: 14, fontWeight: '700' },
  badge: {
    backgroundColor: COLORS.greenBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  badgeText: { color: COLORS.green, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
})
