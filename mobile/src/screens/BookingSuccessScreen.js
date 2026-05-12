import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD, BTN_PRIMARY } from '../theme'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDataExibicao(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^./, s => s.toUpperCase())
}

export default function BookingSuccessScreen({ route, navigation }) {
  const resultado = route.params?.resultado

  if (!resultado) {
    return (
      <View style={[s.bg, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
        <Text style={{ color: COLORS.textMuted }}>Sem dados de agendamento.</Text>
      </View>
    )
  }

  const data    = new Date(resultado.data)
  const dataStr = data.toISOString().slice(0, 10)
  const hora    = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  function handleNovo() {
    navigation.reset({ index: 0, routes: [{ name: 'Booking' }] })
  }

  return (
    <ScrollView style={s.bg} contentContainerStyle={s.container}>
      <View style={s.iconBox}>
        <Ionicons name="checkmark-circle" size={48} color={COLORS.green} />
      </View>
      <Text style={s.title}>Agendado!</Text>
      <Text style={s.subtitle}>Seu horário está confirmado</Text>

      <View style={[CARD, s.card]}>
        <Row iconName="person-outline"     label="Cliente"  value={resultado.nome} />
        <Divider />
        <Row iconName="cut-outline"        label="Serviço"  value={resultado.servico} />
        <Divider />
        <Row iconName="calendar-outline"   label="Data"     value={formatDataExibicao(dataStr)} />
        <Divider />
        <Row iconName="time-outline"       label="Horário"  value={hora} />
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>{formatMoeda(resultado.preco)}</Text>
        </View>
      </View>

      <TouchableOpacity style={BTN_PRIMARY} onPress={handleNovo}>
        <Text style={s.btnText}>Fazer outro agendamento</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function Row({ iconName, label, value }) {
  return (
    <View style={s.row}>
      <Ionicons name={iconName} size={20} color={COLORS.textMuted} />
      <View>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value}</Text>
      </View>
    </View>
  )
}

function Divider() {
  return <View style={s.divider} />
}

const s = StyleSheet.create({
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },

  iconBox: {
    width: 88, height: 88,
    backgroundColor: COLORS.greenBg,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title:    { color: COLORS.white, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 4, marginBottom: 28 },

  card: { width: '100%', marginBottom: 24, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowLabel: { color: COLORS.textMuted, fontSize: 11 },
  rowValue: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginTop: 1 },
  divider:  { height: 1, backgroundColor: COLORS.border, marginHorizontal: -16 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 14, marginTop: 4,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  totalLabel: { color: COLORS.textMuted, fontSize: 14 },
  totalValue: { color: COLORS.greenLight, fontSize: 18, fontWeight: '800' },
  btnText: { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
})
