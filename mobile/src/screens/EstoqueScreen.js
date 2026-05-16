import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD, INPUT, BTN_PRIMARY, LABEL } from '../theme'
import { getProdutos, criarProduto, removerProduto, ajustarEstoque } from '../services/supabase'

const CATEGORIAS = ['revenda', 'insumo']
const UNIDADES   = ['un', 'ml', 'g', 'kg', 'L']

function fmtMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function EstoqueScreen({ navigation }) {
  const [produtos,   setProdutos]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [aba,        setAba]        = useState('revenda')

  // modal adicionar
  const [addModal, setAddModal] = useState(false)
  const [form,     setForm]     = useState({ nome: '', tipo: 'revenda', preco: '', estoque_atual: '', estoque_minimo: '1', unidade: 'un' })
  const [saving,   setSaving]   = useState(false)

  // modal ajuste
  const [ajusteModal, setAjusteModal] = useState(false)
  const [prodSel,     setProdSel]     = useState(null)
  const [delta,       setDelta]       = useState('')
  const [tipoAjuste,  setTipoAjuste]  = useState('entrada')

  const fetchData = useCallback(async () => {
    try { setProdutos(await getProdutos()) }
    catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData)
    return unsub
  }, [navigation, fetchData])

  const lista = produtos.filter(p => p.tipo === aba)

  async function handleAdd() {
    if (!form.nome.trim()) { Alert.alert('Erro', 'Informe o nome do produto.'); return }
    setSaving(true)
    try {
      await criarProduto({
        nome:           form.nome.trim(),
        tipo:           form.tipo,
        preco:          parseFloat(form.preco.replace(',', '.') || 0),
        estoque_atual:  parseFloat(form.estoque_atual.replace(',', '.') || 0),
        estoque_minimo: parseFloat(form.estoque_minimo.replace(',', '.') || 1),
        unidade:        form.unidade,
      })
      setAddModal(false)
      setForm({ nome: '', tipo: 'revenda', preco: '', estoque_atual: '', estoque_minimo: '1', unidade: 'un' })
      await fetchData()
    } catch { Alert.alert('Erro', 'Não foi possível cadastrar o produto.') }
    finally { setSaving(false) }
  }

  async function handleAjuste() {
    const n = parseFloat(delta.replace(',', '.'))
    if (!n || n <= 0) { Alert.alert('Erro', 'Informe uma quantidade válida.'); return }
    setSaving(true)
    try {
      await ajustarEstoque(prodSel.id, tipoAjuste === 'entrada' ? n : -n)
      setAjusteModal(false)
      setDelta('')
      await fetchData()
    } catch { Alert.alert('Erro', 'Não foi possível ajustar o estoque.') }
    finally { setSaving(false) }
  }

  function handleRemover(p) {
    Alert.alert('Remover produto', `Remover "${p.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try { await removerProduto(p.id); await fetchData() }
        catch { Alert.alert('Erro', 'Não foi possível remover.') }
      }},
    ])
  }

  if (loading) return <View style={[s.bg, s.center]}><ActivityIndicator color={COLORS.green} size="large" /></View>

  return (
    <View style={s.bg}>
      {/* Abas revenda / insumo */}
      <View style={s.abas}>
        {CATEGORIAS.map(c => (
          <TouchableOpacity key={c} style={[s.aba, aba === c && s.abaAtiva]} onPress={() => setAba(c)}>
            <Text style={[s.abaText, aba === c && s.abaTextAtiva]}>{c === 'revenda' ? 'Revenda' : 'Insumos'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.addBtn} onPress={() => { setForm(f => ({ ...f, tipo: aba })); setAddModal(true) }}>
          <Ionicons name="add" size={20} color={COLORS.green} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.green} />}
      >
        {lista.length === 0 ? (
          <View style={[CARD, s.empty]}>
            <Ionicons name="cube-outline" size={32} color="#2a2a2a" style={{ marginBottom: 10 }} />
            <Text style={s.emptyText}>Nenhum produto cadastrado</Text>
            <TouchableOpacity style={s.emptyAddBtn} onPress={() => { setForm(f => ({ ...f, tipo: aba })); setAddModal(true) }}>
              <Text style={s.emptyAddText}>Adicionar produto</Text>
            </TouchableOpacity>
          </View>
        ) : lista.map(p => {
          const baixo = p.estoque_atual <= p.estoque_minimo
          const pct   = p.estoque_minimo > 0 ? Math.min(1, p.estoque_atual / (p.estoque_minimo * 3)) : 1
          return (
            <View key={p.id} style={[CARD, s.prodRow, baixo && s.prodRowBaixo]}>
              <View style={s.prodTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.prodNome}>{p.nome}</Text>
                  {p.preco > 0 && <Text style={s.prodPreco}>{fmtMoeda(p.preco)}</Text>}
                </View>
                <View style={s.prodActions}>
                  <TouchableOpacity style={s.ajusteBtn} onPress={() => { setProdSel(p); setTipoAjuste('entrada'); setDelta(''); setAjusteModal(true) }}>
                    <Ionicons name="swap-vertical-outline" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemover(p)}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.barRow}>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${pct * 100}%`, backgroundColor: baixo ? COLORS.error : COLORS.green }]} />
                </View>
                <Text style={[s.estoqueText, baixo && { color: COLORS.error }]}>
                  {p.estoque_atual} / {p.estoque_minimo} {p.unidade}
                </Text>
              </View>
              {baixo && (
                <View style={s.alertRow}>
                  <Ionicons name="warning-outline" size={12} color={COLORS.error} />
                  <Text style={s.alertText}>Estoque baixo — mínimo: {p.estoque_minimo} {p.unidade}</Text>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Modal adicionar produto */}
      <Modal visible={addModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.sheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Novo produto</Text>

            <Text style={[LABEL, { marginTop: 16 }]}>Nome</Text>
            <TextInput style={INPUT} value={form.nome} onChangeText={t => setForm(f => ({ ...f, nome: t }))} placeholder="Ex: Pomada Modeladora" placeholderTextColor={COLORS.textDim} />

            <Text style={[LABEL, { marginTop: 12 }]}>Tipo</Text>
            <View style={s.tipoRow}>
              {CATEGORIAS.map(c => (
                <TouchableOpacity key={c} style={[s.tipoBt, form.tipo === c && s.tipoBtAtivo]} onPress={() => setForm(f => ({ ...f, tipo: c }))}>
                  <Text style={[s.tipoBtText, form.tipo === c && s.tipoBtTextAtivo]}>{c === 'revenda' ? 'Revenda' : 'Insumo'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={LABEL}>Preço (R$)</Text>
                <TextInput style={INPUT} value={form.preco} onChangeText={t => setForm(f => ({ ...f, preco: t }))} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={COLORS.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={LABEL}>Estoque atual</Text>
                <TextInput style={INPUT} value={form.estoque_atual} onChangeText={t => setForm(f => ({ ...f, estoque_atual: t }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textDim} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={LABEL}>Mínimo</Text>
                <TextInput style={INPUT} value={form.estoque_minimo} onChangeText={t => setForm(f => ({ ...f, estoque_minimo: t }))} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={COLORS.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={LABEL}>Unidade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
                    {UNIDADES.map(u => (
                      <TouchableOpacity key={u} style={[s.unidBtn, form.unidade === u && s.unidBtnAtivo]} onPress={() => setForm(f => ({ ...f, unidade: u }))}>
                        <Text style={[s.unidText, form.unidade === u && s.unidTextAtivo]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={[BTN_PRIMARY, { marginTop: 20 }, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={s.btnText}>Salvar produto</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setAddModal(false)}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal ajuste de estoque */}
      <Modal visible={ajusteModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{prodSel?.nome}</Text>
            <Text style={s.sheetSub}>Estoque atual: {prodSel?.estoque_atual} {prodSel?.unidade}</Text>

            <View style={s.tipoRow}>
              {['entrada', 'saida'].map(t => (
                <TouchableOpacity key={t} style={[s.tipoBt, tipoAjuste === t && s.tipoBtAtivo]} onPress={() => setTipoAjuste(t)}>
                  <Text style={[s.tipoBtText, tipoAjuste === t && s.tipoBtTextAtivo]}>{t === 'entrada' ? '+ Entrada' : '− Saída'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[LABEL, { marginTop: 16 }]}>Quantidade</Text>
            <TextInput style={INPUT} value={delta} onChangeText={setDelta} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textDim} />

            <TouchableOpacity style={[BTN_PRIMARY, { marginTop: 16 }, saving && { opacity: 0.6 }]} onPress={handleAjuste} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={s.btnText}>Confirmar ajuste</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setAjusteModal(false)}>
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

  abas: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  aba:  { flex: 1, paddingVertical: 14, alignItems: 'center' },
  abaAtiva: { borderBottomWidth: 2, borderBottomColor: COLORS.green },
  abaText:  { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  abaTextAtiva: { color: COLORS.green },
  addBtn: { paddingVertical: 14, paddingLeft: 8, justifyContent: 'center' },

  empty:       { alignItems: 'center', paddingVertical: 40 },
  emptyText:   { color: COLORS.textMuted, fontSize: 13 },
  emptyAddBtn: { marginTop: 12, backgroundColor: COLORS.greenBg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.greenBorder, paddingHorizontal: 16, paddingVertical: 9 },
  emptyAddText: { color: COLORS.green, fontSize: 13, fontWeight: '600' },

  prodRow:      { marginBottom: 10 },
  prodRowBaixo: { borderColor: 'rgba(255,77,77,0.35)' },
  prodTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  prodNome:     { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  prodPreco:    { color: COLORS.green, fontSize: 13, fontWeight: '600', marginTop: 2 },
  prodActions:  { flexDirection: 'row', gap: 14, alignItems: 'center' },
  ajusteBtn:    { padding: 4 },

  barRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack:   { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 2 },
  estoqueText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500', minWidth: 60, textAlign: 'right' },
  alertRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  alertText:  { color: COLORS.error, fontSize: 11 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, padding: 24,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  sheetSub:    { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  tipoRow:  { flexDirection: 'row', gap: 8, marginTop: 12 },
  tipoBt:   { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardAlt, alignItems: 'center' },
  tipoBtAtivo: { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  tipoBtText:  { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tipoBtTextAtivo: { color: COLORS.green },

  unidBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardAlt },
  unidBtnAtivo: { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  unidText:     { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  unidTextAtivo: { color: COLORS.green },

  btnText:    { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  cancelBtn:  { alignItems: 'center', marginTop: 12, paddingVertical: 12 },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
})
