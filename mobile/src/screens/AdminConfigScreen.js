import { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native'
import { COLORS, CARD, LABEL } from '../theme'
import { getAgendamentos } from '../services/supabase'
import { SERVICOS } from '../constants'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function AdminConfigScreen() {
  const [agendamentos, setAgendamentos]           = useState([])
  const [aceitarAgen, setAceitarAgen]             = useState(true)
  const [notifWhatsApp, setNotifWhatsApp]         = useState(false)

  useEffect(() => {
    getAgendamentos().then(d => setAgendamentos(d || []))
  }, [])

  const stats = useMemo(() => {
    const hoje = new Date()
    const ini  = new Date(hoje); ini.setHours(0, 0, 0, 0)
    const fim  = new Date(hoje); fim.setHours(23, 59, 59, 999)
    let realizados = 0, receita = 0
    const pendentes = agendamentos.filter(a => a.status === 'confirmado').length
    for (const a of agendamentos) {
      const d = new Date(a.data)
      if (d >= ini && d <= fim && a.status === 'finalizado') {
        realizados++
        receita += Number(a.preco)
      }
    }
    return { realizados, receita, pendentes }
  }, [agendamentos])

  return (
    <ScrollView style={s.bg} contentContainerStyle={s.container}>
      <Text style={s.title}>Configurações</Text>

      <View style={[CARD, s.section]}>
        <Text style={LABEL}>Faturamento hoje</Text>
        <Row label="Serviços realizados" value={String(stats.realizados)} accent="green" />
        <Divider />
        <Row label="Receita do dia"      value={formatMoeda(stats.receita)}  accent="green" />
        <Divider />
        <Row label="Pendentes"           value={String(stats.pendentes)}    accent="gold" />
      </View>

      <View style={[CARD, s.section]}>
        <Text style={LABEL}>Disponibilidade</Text>
        <ToggleRow
          label="Aceitar agendamentos"
          value={aceitarAgen}
          onChange={setAceitarAgen}
        />
        <Divider />
        <ToggleRow
          label="Notificações WhatsApp"
          value={notifWhatsApp}
          onChange={setNotifWhatsApp}
        />
      </View>

      <View style={[CARD, s.section]}>
        <Text style={LABEL}>Serviços ativos</Text>
        {SERVICOS.filter(sv => sv.preco > 0).map((sv, i, arr) => (
          <View key={sv.id}>
            <View style={s.svcRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.svcName}>{sv.label}</Text>
                <Text style={s.svcDesc}>{sv.desc}</Text>
              </View>
              <Text style={s.svcPrice}>{formatMoeda(sv.preco)}</Text>
            </View>
            {i < arr.length - 1 && <Divider />}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function Row({ label, value, accent }) {
  const valueColor = accent === 'green' ? COLORS.green : accent === 'gold' ? COLORS.gold : COLORS.white
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  )
}

function ToggleRow({ label, value, onChange }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.cardAlt, true: COLORS.green }}
        thumbColor={value ? '#000' : '#444'}
        ios_backgroundColor={COLORS.cardAlt}
      />
    </View>
  )
}

function Divider() {
  return <View style={s.divider} />
}

const s = StyleSheet.create({
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },
  title:     { color: COLORS.white, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginBottom: 20 },
  section:   { marginBottom: 10 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowLabel:  { color: COLORS.textMuted, fontSize: 12 },
  rowValue:  { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  toggleLabel: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  divider:   { height: 1, backgroundColor: COLORS.border, marginHorizontal: -16 },
  svcRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  svcName:   { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  svcDesc:   { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  svcPrice:  { color: COLORS.white, fontSize: 14, fontWeight: '600' },
})
