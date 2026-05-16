import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD, INPUT, BTN_PRIMARY, LABEL } from '../theme'
import { getProdutos, registrarVenda, getVendas } from '../services/supabase'

function fmtMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtHora(d) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function VendasScreen({ navigation }) {
  const [produtos,  setProdutos]  = useState([])
  const [vendas,    setVendas]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal,     setModal]     = useState(false)
  const [produto,   setProduto]   = useState(null)
  const [qtd,       setQtd]       = useState('1')
  const [saving,    setSaving]    = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [prods, vens] = await Promise.all([getProdutos('revenda'), getVendas(30)])
      setProdutos(prods)
      setVendas(vens)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData)
    return unsub
  }, [navigation, fetchData])

  function abrirModal(p) { setProduto(p); setQtd('1'); setModal(true) }

  async function confirmar() {
    const n = parseFloat(qtd.replace(',', '.'))
    if (!n || n <= 0) { Alert.alert('Erro', 'Informe uma quantidade válida.'); return }
    if (n > produto.estoque_atual) { Alert.alert('Estoque insuficiente', `Disponível: ${produto.estoque_atual} ${produto.unidade}`); return }
    setSaving(true)
    try {
      await registrarVenda({
        produto_id:     produto.id,
        produto_nome:   produto.nome,
        quantidade:     n,
        preco_unitario: produto.preco,
        total:          n * produto.preco,
      })
      setModal(false)
      await fetchData()
    } catch { Alert.alert('Erro', 'Não foi possível registrar a venda.') }
    finally { setSaving(false) }
  }

  if (loading) return <View style={[s.bg, s.center]}><ActivityIndicator color={COLORS.green} size="large" /></View>

  return (
    <View style={s.bg}>
      <ScrollView
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.green} />}
      >
        {/* Produtos disponíveis */}
        <Text style={s.sectionTitle}>Registrar venda</Text>
        {produtos.length === 0 ? (
          <View style={[CARD, s.empty]}>
            <Ionicons name="cube-outline" size={32} color="#2a2a2a" style={{ marginBottom: 10 }} />
            <Text style={s.emptyText}>Nenhum produto cadastrado</Text>
            <Text style={s.emptyHint}>Adicione produtos no Estoque</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {produtos.map(p => {
              const semEstoque = p.estoque_atual <= 0
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[s.prodCard, semEstoque && s.prodCardOff]}
                  onPress={() => !semEstoque && abrirModal(p)}
                  activeOpacity={semEstoque ? 1 : 0.7}
                >
                  <View style={s.prodIconBox}>
                    <Ionicons name="cube-outline" size={22} color={semEstoque ? '#333' : COLORS.green} />
                  </View>
                  <Text style={[s.prodNome, semEstoque && s.prodNomeOff]} numberOfLines={2}>{p.nome}</Text>
                  <Text style={[s.prodPreco, semEstoque && s.prodNomeOff]}>{fmtMoeda(p.preco)}</Text>
                  <Text style={s.prodEstoque}>{p.estoque_atual} {p.unidade}</Text>
                  {semEstoque && (
                    <View style={s.semEstoqueBadge}>
                      <Text style={s.semEstoqueText}>Sem estoque</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Histórico de vendas */}
        <Text style={[s.sectionTitle, { marginTop: 28 }]}>Vendas recentes</Text>
        {vendas.length === 0 ? (
          <View style={[CARD, s.empty]}>
            <Text style={s.emptyText}>Nenhuma venda registrada</Text>
          </View>
        ) : (
          vendas.map(v => (
            <View key={v.id} style={[CARD, s.vendaRow]}>
              <View style={s.vendaLeft}>
                <Text style={s.vendaNome}>{v.produto_nome}</Text>
                <Text style={s.vendaSub}>{v.quantidade} un · {fmtHora(v.data)}</Text>
              </View>
              <Text style={s.vendaTotal}>{fmtMoeda(v.total)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de venda */}
      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{produto?.nome}</Text>
            <Text style={s.sheetSub}>{fmtMoeda(produto?.preco ?? 0)} por {produto?.unidade} · {produto?.estoque_atual} disponíveis</Text>

            <Text style={[LABEL, { marginTop: 20 }]}>Quantidade</Text>
            <TextInput
              style={INPUT}
              value={qtd}
              onChangeText={setQtd}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={COLORS.textDim}
            />

            {!!qtd && parseFloat(qtd.replace(',', '.')) > 0 && (
              <View style={s.totalBox}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={s.totalValor}>{fmtMoeda(parseFloat(qtd.replace(',', '.') || 0) * (produto?.preco ?? 0))}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[BTN_PRIMARY, { marginTop: 16 }, saving && { opacity: 0.6 }]}
              onPress={confirmar}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={s.btnText}>Confirmar venda</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  bg:      { flex: 1, backgroundColor: COLORS.bg },
  center:  { alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 80 },

  sectionTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prodCard: {
    width: '47%', backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  prodCardOff: { opacity: 0.45 },
  prodIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(0,232,122,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  prodNome:       { color: COLORS.white, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  prodNomeOff:    { color: COLORS.textMuted },
  prodPreco:      { color: COLORS.green, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  prodEstoque:    { color: COLORS.textMuted, fontSize: 11 },
  semEstoqueBadge: { marginTop: 6, backgroundColor: 'rgba(255,77,77,0.12)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  semEstoqueText:  { color: COLORS.error, fontSize: 10, fontWeight: '600' },

  vendaRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  vendaLeft: { flex: 1 },
  vendaNome: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  vendaSub:  { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  vendaTotal: { color: COLORS.green, fontSize: 14, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },
  emptyHint: { color: COLORS.textDim, fontSize: 11, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  sheetSub:    { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  totalBox:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: 14, backgroundColor: COLORS.greenBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.greenBorder },
  totalLabel:  { color: COLORS.textMuted, fontSize: 13 },
  totalValor:  { color: COLORS.green, fontSize: 20, fontWeight: '700' },
  btnText:     { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  cancelBtn:   { alignItems: 'center', marginTop: 12, paddingVertical: 12 },
  cancelText:  { color: COLORS.textMuted, fontSize: 14 },
})
