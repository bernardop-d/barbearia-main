import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD, INPUT, BTN_PRIMARY, LABEL } from '../theme'
import { getAgendamentos, getVendas, getDespesas, criarDespesa, removerDespesa } from '../services/supabase'

const PERIODOS   = [{ id: 'dia', label: 'Hoje' }, { id: 'mes', label: 'Mês' }, { id: 'total', label: 'Total' }]
const CATEGORIAS = ['geral', 'aluguel', 'produto', 'energia', 'outros']

function fmtMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtData(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function filtroPeriodo(periodo) {
  const agora = new Date()
  if (periodo === 'dia') {
    const ini = new Date(agora); ini.setHours(0, 0, 0, 0)
    const fim = new Date(agora); fim.setHours(23, 59, 59, 999)
    return (d) => { const dt = new Date(d); return dt >= ini && dt <= fim }
  }
  if (periodo === 'mes') {
    const ini = new Date(agora.getFullYear(), agora.getMonth(), 1)
    return (d) => new Date(d) >= ini
  }
  return () => true
}

export default function FinanceiroScreen({ navigation }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [vendas,       setVendas]       = useState([])
  const [despesas,     setDespesas]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [periodo,      setPeriodo]      = useState('mes')
  const [modal,        setModal]        = useState(false)
  const [form,         setForm]         = useState({ descricao: '', valor: '', categoria: 'geral', data: new Date().toISOString().slice(0, 10) })
  const [saving,       setSaving]       = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [ag, vd, dp] = await Promise.all([getAgendamentos(), getVendas(200), getDespesas(200)])
      setAgendamentos(ag || [])
      setVendas(vd || [])
      setDespesas(dp || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData)
    return unsub
  }, [navigation, fetchData])

  const stats = useMemo(() => {
    const ok = filtroPeriodo(periodo)
    const recServicos = agendamentos
      .filter(a => a.status === 'finalizado' && ok(a.data))
      .reduce((s, a) => s + Number(a.preco), 0)
    const recProdutos = vendas
      .filter(v => ok(v.data))
      .reduce((s, v) => s + Number(v.total), 0)
    const totalDespesas = despesas
      .filter(d => ok(d.data + 'T12:00:00'))
      .reduce((s, d) => s + Number(d.valor), 0)
    const lucro = recServicos + recProdutos - totalDespesas
    return { recServicos, recProdutos, totalDespesas, lucro }
  }, [agendamentos, vendas, despesas, periodo])

  const despesasFiltradas = useMemo(() => {
    const ok = filtroPeriodo(periodo)
    return despesas.filter(d => ok(d.data + 'T12:00:00'))
  }, [despesas, periodo])

  async function handleAddDespesa() {
    if (!form.descricao.trim()) { Alert.alert('Erro', 'Informe a descrição.'); return }
    const v = parseFloat(form.valor.replace(',', '.'))
    if (!v || v <= 0) { Alert.alert('Erro', 'Informe um valor válido.'); return }
    setSaving(true)
    try {
      await criarDespesa({ descricao: form.descricao.trim(), valor: v, categoria: form.categoria, data: form.data })
      setModal(false)
      setForm({ descricao: '', valor: '', categoria: 'geral', data: new Date().toISOString().slice(0, 10) })
      await fetchData()
    } catch { Alert.alert('Erro', 'Não foi possível lançar a despesa.') }
    finally { setSaving(false) }
  }

  function handleRemoverDespesa(d) {
    Alert.alert('Remover despesa', `Remover "${d.descricao}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try { await removerDespesa(d.id); await fetchData() }
        catch { Alert.alert('Erro', 'Não foi possível remover.') }
      }},
    ])
  }

  if (loading) return <View style={[s.bg, s.center]}><ActivityIndicator color={COLORS.green} size="large" /></View>

  return (
    <View style={s.bg}>
      <ScrollView
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.green} />}
      >
        {/* Seletor de período */}
        <View style={s.periodoRow}>
          {PERIODOS.map(p => (
            <TouchableOpacity key={p.id} style={[s.periodoBt, periodo === p.id && s.periodoBtAtivo]} onPress={() => setPeriodo(p.id)}>
              <Text style={[s.periodoText, periodo === p.id && s.periodoTextAtivo]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lucro líquido destaque */}
        <View style={[CARD, s.lucroCard, { borderColor: stats.lucro >= 0 ? COLORS.greenBorder : 'rgba(255,77,77,0.35)' }]}>
          <Text style={s.lucroLabel}>Lucro líquido</Text>
          <Text style={[s.lucroValor, { color: stats.lucro >= 0 ? COLORS.green : COLORS.error }]}>
            {fmtMoeda(stats.lucro)}
          </Text>
        </View>

        {/* Cards de receita e despesa */}
        <View style={s.cardsRow}>
          <View style={[CARD, s.miniCard]}>
            <Ionicons name="cut-outline" size={16} color={COLORS.green} style={{ marginBottom: 6 }} />
            <Text style={s.miniValor}>{fmtMoeda(stats.recServicos)}</Text>
            <Text style={s.miniLabel}>Serviços</Text>
          </View>
          <View style={[CARD, s.miniCard]}>
            <Ionicons name="cube-outline" size={16} color={COLORS.gold} style={{ marginBottom: 6 }} />
            <Text style={[s.miniValor, { color: COLORS.gold }]}>{fmtMoeda(stats.recProdutos)}</Text>
            <Text style={s.miniLabel}>Produtos</Text>
          </View>
          <View style={[CARD, s.miniCard]}>
            <Ionicons name="arrow-down-outline" size={16} color={COLORS.error} style={{ marginBottom: 6 }} />
            <Text style={[s.miniValor, { color: COLORS.error }]}>{fmtMoeda(stats.totalDespesas)}</Text>
            <Text style={s.miniLabel}>Despesas</Text>
          </View>
        </View>

        {/* Despesas */}
        <View style={s.despesasHeader}>
          <Text style={s.sectionTitle}>Despesas</Text>
          <TouchableOpacity style={s.addDespBtn} onPress={() => setModal(true)}>
            <Ionicons name="add" size={16} color={COLORS.green} />
            <Text style={s.addDespText}>Lançar</Text>
          </TouchableOpacity>
        </View>

        {despesasFiltradas.length === 0 ? (
          <View style={[CARD, s.empty]}>
            <Text style={s.emptyText}>Nenhuma despesa no período</Text>
          </View>
        ) : (
          despesasFiltradas.map(d => (
            <View key={d.id} style={[CARD, s.despRow]}>
              <View style={s.despLeft}>
                <Text style={s.despDesc}>{d.descricao}</Text>
                <Text style={s.despSub}>{d.categoria} · {fmtData(d.data)}</Text>
              </View>
              <View style={s.despRight}>
                <Text style={s.despValor}>{fmtMoeda(d.valor)}</Text>
                <TouchableOpacity onPress={() => handleRemoverDespesa(d)} style={{ marginTop: 4 }}>
                  <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal lançar despesa */}
      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.sheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Lançar despesa</Text>

            <Text style={[LABEL, { marginTop: 16 }]}>Descrição</Text>
            <TextInput style={INPUT} value={form.descricao} onChangeText={t => setForm(f => ({ ...f, descricao: t }))} placeholder="Ex: Aluguel, produto, energia..." placeholderTextColor={COLORS.textDim} />

            <Text style={[LABEL, { marginTop: 12 }]}>Valor (R$)</Text>
            <TextInput style={INPUT} value={form.valor} onChangeText={t => setForm(f => ({ ...f, valor: t }))} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={COLORS.textDim} />

            <Text style={[LABEL, { marginTop: 12 }]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
                {CATEGORIAS.map(c => (
                  <TouchableOpacity key={c} style={[s.catBt, form.categoria === c && s.catBtAtivo]} onPress={() => setForm(f => ({ ...f, categoria: c }))}>
                    <Text style={[s.catText, form.categoria === c && s.catTextAtivo]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[LABEL, { marginTop: 12 }]}>Data</Text>
            <TextInput style={INPUT} value={form.data} onChangeText={t => setForm(f => ({ ...f, data: t }))} placeholder="AAAA-MM-DD" placeholderTextColor={COLORS.textDim} />

            <TouchableOpacity style={[BTN_PRIMARY, { marginTop: 20 }, saving && { opacity: 0.6 }]} onPress={handleAddDespesa} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={s.btnText}>Salvar despesa</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: COLORS.bg },
  center:  { alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 80 },

  periodoRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodoBt:  { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, alignItems: 'center' },
  periodoBtAtivo: { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  periodoText:     { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  periodoTextAtivo: { color: COLORS.green },

  lucroCard:  { alignItems: 'center', paddingVertical: 24, marginBottom: 14 },
  lucroLabel: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600', marginBottom: 8 },
  lucroValor: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  miniCard:  { flex: 1, alignItems: 'center', paddingVertical: 16 },
  miniValor: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  miniLabel: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },

  despesasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  addDespBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.greenBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.greenBorder, paddingHorizontal: 12, paddingVertical: 7 },
  addDespText:    { color: COLORS.green, fontSize: 13, fontWeight: '600' },

  despRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  despLeft:  { flex: 1 },
  despDesc:  { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  despSub:   { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  despRight: { alignItems: 'flex-end' },
  despValor: { color: COLORS.error, fontSize: 14, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, padding: 24,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { color: COLORS.white, fontSize: 18, fontWeight: '700' },

  catBt:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardAlt },
  catBtAtivo: { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  catText:    { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  catTextAtivo: { color: COLORS.green },

  btnText:    { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  cancelBtn:  { alignItems: 'center', marginTop: 12, paddingVertical: 12 },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
})
