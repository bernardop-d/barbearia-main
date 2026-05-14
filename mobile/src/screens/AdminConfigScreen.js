import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, Switch, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, CARD, LABEL, INPUT, BTN_PRIMARY, BTN_GHOST } from '../theme'
import {
  getAgendamentos, buscarConfig, salvarConfig,
  getServicosCustom, criarServico, removerServico,
} from '../services/supabase'
import { SERVICOS, HORARIOS } from '../constants'

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const HORAS_ALMOCO = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

export default function AdminConfigScreen() {
  const [agendamentos, setAgendamentos]     = useState([])
  const [aceitarAgen, setAceitarAgen]       = useState(true)

  const [almocoAtivo, setAlmocoAtivo]       = useState(false)
  const [almocoInicio, setAlmocoInicio]     = useState(12)
  const [almocoFim, setAlmocoFim]           = useState(13)
  const [salvandoAlmoco, setSalvandoAlmoco] = useState(false)

  const [servicosCustom, setServicosCustom]   = useState([])
  const [modalServico, setModalServico]       = useState(false)
  const [novoServico, setNovoServico]         = useState({ label: '', desc: '', preco: '' })
  const [salvandoServico, setSalvandoServico] = useState(false)

  const carregarDados = useCallback(async () => {
    getAgendamentos().then(d => setAgendamentos(d || []))
    buscarConfig('almoco').then(v => {
      if (v) {
        setAlmocoAtivo(v.ativo ?? false)
        setAlmocoInicio(v.inicio ?? 12)
        setAlmocoFim(v.fim ?? 13)
      }
    })
    getServicosCustom().then(setServicosCustom)
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  const stats = useMemo(() => {
    const agora  = new Date()
    const ini    = new Date(agora); ini.setHours(0, 0, 0, 0)
    const fim    = new Date(agora); fim.setHours(23, 59, 59, 999)
    const iniMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    let realizados = 0, receita = 0, receitaMes = 0, receitaTotal = 0
    const pendentes = agendamentos.filter(a => a.status === 'confirmado').length
    for (const a of agendamentos) {
      const d = new Date(a.data)
      const p = Number(a.preco)
      if (a.status === 'finalizado') {
        receitaTotal += p
        if (d >= iniMes) receitaMes += p
        if (d >= ini && d <= fim) { realizados++; receita += p }
      }
    }
    return { realizados, receita, receitaMes, receitaTotal, pendentes }
  }, [agendamentos])

  async function salvarAlmoco() {
    setSalvandoAlmoco(true)
    try {
      await salvarConfig('almoco', { ativo: almocoAtivo, inicio: almocoInicio, fim: almocoFim })
      Alert.alert('Salvo', 'Horário de almoço atualizado.')
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.')
    } finally {
      setSalvandoAlmoco(false)
    }
  }

  async function handleCriarServico() {
    if (!novoServico.label.trim()) return Alert.alert('Aviso', 'Informe o nome do serviço.')
    if (!novoServico.preco || Number(novoServico.preco) <= 0) return Alert.alert('Aviso', 'Informe um preço válido.')
    setSalvandoServico(true)
    try {
      await criarServico({
        label: novoServico.label.trim(),
        desc:  novoServico.desc.trim(),
        preco: Number(novoServico.preco),
      })
      setNovoServico({ label: '', desc: '', preco: '' })
      setModalServico(false)
      getServicosCustom().then(setServicosCustom)
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o serviço.')
    } finally {
      setSalvandoServico(false)
    }
  }

  function handleRemoverServico(id, label) {
    Alert.alert('Remover', `Remover "${label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          try { await removerServico(id); getServicosCustom().then(setServicosCustom) }
          catch { Alert.alert('Erro', 'Não foi possível remover.') }
        },
      },
    ])
  }

  return (
    <ScrollView style={s.bg} contentContainerStyle={s.container}>
      <Text style={s.title}>Configurações</Text>

      {/* Faturamento */}
      <View style={[CARD, s.section]}>
        <Text style={LABEL}>Faturamento</Text>
        <Row label="Serviços hoje"     value={String(stats.realizados)}        accent="green" />
        <Divider />
        <Row label="Receita hoje"      value={formatMoeda(stats.receita)}      accent="green" />
        <Divider />
        <Row label="Este mês"          value={formatMoeda(stats.receitaMes)}   accent="gold" />
        <Divider />
        <Row label="Faturamento total" value={formatMoeda(stats.receitaTotal)} accent="gold" />
        <Divider />
        <Row label="Confirmados"       value={String(stats.pendentes)}         accent="default" />
      </View>

      {/* Disponibilidade */}
      <View style={[CARD, s.section]}>
        <Text style={LABEL}>Disponibilidade</Text>
        <ToggleRow label="Aceitar agendamentos" value={aceitarAgen} onChange={setAceitarAgen} />
      </View>

      {/* Horário de almoço */}
      <View style={[CARD, s.section]}>
        <Text style={LABEL}>Horário de almoço</Text>
        <ToggleRow label="Bloquear horário de almoço" value={almocoAtivo} onChange={setAlmocoAtivo} />
        {almocoAtivo && (
          <>
            <Divider />
            <View style={s.almocoRow}>
              <Text style={s.almocoLabel}>De</Text>
              <ScrollViewH>
                {HORAS_ALMOCO.filter(h => h < almocoFim).map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[s.hrBtn, almocoInicio === h && s.hrBtnActive]}
                    onPress={() => setAlmocoInicio(h)}
                  >
                    <Text style={[s.hrBtnText, almocoInicio === h && s.hrBtnTextActive]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </ScrollViewH>
            </View>
            <View style={s.almocoRow}>
              <Text style={s.almocoLabel}>Até</Text>
              <ScrollViewH>
                {HORAS_ALMOCO.filter(h => h > almocoInicio).map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[s.hrBtn, almocoFim === h && s.hrBtnActive]}
                    onPress={() => setAlmocoFim(h)}
                  >
                    <Text style={[s.hrBtnText, almocoFim === h && s.hrBtnTextActive]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </ScrollViewH>
            </View>
          </>
        )}
        <TouchableOpacity
          style={[BTN_PRIMARY, { marginTop: 12 }, salvandoAlmoco && s.disabled]}
          onPress={salvarAlmoco}
          disabled={salvandoAlmoco}
        >
          {salvandoAlmoco
            ? <ActivityIndicator color={COLORS.bg} />
            : <Text style={s.btnText}>Salvar horário de almoço</Text>}
        </TouchableOpacity>
      </View>

      {/* Serviços ativos */}
      <View style={[CARD, s.section]}>
        <View style={s.sectionHeaderRow}>
          <Text style={LABEL}>Serviços ativos</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setModalServico(true)}>
            <Ionicons name="add" size={15} color={COLORS.green} />
            <Text style={s.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {SERVICOS.filter(sv => sv.preco > 0).map((sv, i, arr) => (
          <View key={sv.id}>
            <View style={s.svcRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.svcName}>{sv.label}</Text>
                <Text style={s.svcDesc}>{sv.desc}</Text>
              </View>
              <Text style={s.svcPrice}>{formatMoeda(sv.preco)}</Text>
            </View>
            {(i < arr.length - 1 || servicosCustom.length > 0) && <Divider />}
          </View>
        ))}

        {servicosCustom.map((sv, i) => (
          <View key={sv.id}>
            <View style={s.svcRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.svcName}>{sv.label}</Text>
                  <View style={s.customBadge}>
                    <Text style={s.customBadgeText}>custom</Text>
                  </View>
                </View>
                {!!sv.desc && <Text style={s.svcDesc}>{sv.desc}</Text>}
              </View>
              <Text style={s.svcPrice}>{formatMoeda(sv.preco)}</Text>
              <TouchableOpacity onPress={() => handleRemoverServico(sv.id, sv.label)} style={{ marginLeft: 8 }}>
                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            {i < servicosCustom.length - 1 && <Divider />}
          </View>
        ))}
      </View>

      {/* Modal novo serviço */}
      <Modal visible={modalServico} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Novo serviço</Text>
            <TextInput
              style={[INPUT, s.modalInput]}
              placeholder="Nome do serviço"
              placeholderTextColor={COLORS.textDim}
              value={novoServico.label}
              maxLength={60}
              onChangeText={t => setNovoServico(prev => ({ ...prev, label: t }))}
            />
            <TextInput
              style={[INPUT, s.modalInput]}
              placeholder="Descrição (opcional)"
              placeholderTextColor={COLORS.textDim}
              value={novoServico.desc}
              maxLength={80}
              onChangeText={t => setNovoServico(prev => ({ ...prev, desc: t }))}
            />
            <TextInput
              style={[INPUT, s.modalInput]}
              placeholder="Preço (ex: 45)"
              placeholderTextColor={COLORS.textDim}
              value={novoServico.preco}
              keyboardType="decimal-pad"
              onChangeText={t => setNovoServico(prev => ({ ...prev, preco: t }))}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[BTN_GHOST, { flex: 1 }]}
                onPress={() => { setModalServico(false); setNovoServico({ label: '', desc: '', preco: '' }) }}
              >
                <Text style={s.ghostText}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity
                style={[BTN_PRIMARY, { flex: 1 }, salvandoServico && s.disabled]}
                onPress={handleCriarServico}
                disabled={salvandoServico}
              >
                {salvandoServico
                  ? <ActivityIndicator color={COLORS.bg} />
                  : <Text style={s.btnText}>Criar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

function ScrollViewH({ children }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
        {children}
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

  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowLabel:    { color: COLORS.textMuted, fontSize: 12 },
  rowValue:    { fontSize: 13, fontWeight: '600' },
  toggleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  toggleLabel: { color: COLORS.white, fontSize: 13, fontWeight: '500', flex: 1 },
  divider:     { height: 1, backgroundColor: COLORS.border, marginHorizontal: -16 },

  almocoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  almocoLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', width: 26 },
  hrBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  hrBtnActive:    { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  hrBtnText:      { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  hrBtnTextActive: { color: COLORS.green },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  addBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: COLORS.greenBg, borderRadius: 6, borderWidth: 1, borderColor: COLORS.greenBorder },
  addBtnText:       { color: COLORS.green, fontSize: 11, fontWeight: '600' },

  svcRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  svcName:  { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  svcDesc:  { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  svcPrice: { color: COLORS.white, fontSize: 14, fontWeight: '600' },

  customBadge:     { backgroundColor: COLORS.greenBg, borderRadius: 4, borderWidth: 1, borderColor: COLORS.greenBorder, paddingHorizontal: 5, paddingVertical: 1 },
  customBadgeText: { color: COLORS.green, fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalTitle:  { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 18 },
  modalInput:  { marginBottom: 12 },
  modalBtns:   { flexDirection: 'row', marginTop: 8 },
  ghostText:   { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  btnText:     { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  disabled:    { opacity: 0.6 },
})
