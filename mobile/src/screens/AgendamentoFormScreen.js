import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { COLORS, CARD, INPUT, BTN_PRIMARY, BTN_GHOST, LABEL } from '../theme'
import { criarAgendamento, atualizarAgendamento } from '../services/supabase'
import { SERVICOS, STATUS_OPTS } from '../constants'

function calcMinDate() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 30)
  d.setSeconds(0, 0)
  return d
}

function validar(form) {
  const nome = form.nome.trim()
  if (!nome) return 'Informe o nome do cliente.'
  if (nome.length < 2) return 'Nome deve ter pelo menos 2 caracteres.'
  if (!form.data) return 'Informe a data e horário.'
  if (Number(form.preco) <= 0) return 'Informe um preço válido.'
  const w = form.whatsapp.replace(/\D/g, '')
  if (w && (w.length < 10 || w.length > 11)) return 'WhatsApp deve ter 10 ou 11 dígitos.'
  return null
}

export default function AgendamentoFormScreen({ route, navigation }) {
  const editando = route?.params?.agendamento ?? null

  const [form, setForm] = useState({
    nome: '', servico: 'Corte', preco: 35, data: null, whatsapp: '', status: 'confirmado',
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerMode, setPickerMode]         = useState('date')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')

  const minDate = useMemo(calcMinDate, [])

  useEffect(() => {
    if (editando) {
      setForm({
        nome:     editando.nome     || '',
        servico:  editando.servico  || 'Corte',
        preco:    String(editando.preco ?? 35),
        data:     new Date(editando.data),
        whatsapp: editando.whatsapp || '',
        status:   editando.status   || 'confirmado',
      })
    }
  }, [editando])

  function handleServico(id) {
    const servico = SERVICOS.find(s => s.id === id)
    setForm(prev => ({
      ...prev,
      servico: servico.label,
      preco: servico.preco > 0 ? String(servico.preco) : prev.preco,
    }))
  }

  function openPicker(mode) {
    setPickerMode(mode)
    setShowDatePicker(true)
  }

  function onDateChange(event, selected) {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (!selected) return
    if (pickerMode === 'date') {
      const d = form.data ? new Date(form.data) : new Date()
      d.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
      setForm(prev => ({ ...prev, data: d }))
      if (Platform.OS === 'android') {
        setTimeout(() => openPicker('time'), 300)
      }
    } else {
      const d = form.data ? new Date(form.data) : new Date()
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
      setForm(prev => ({ ...prev, data: d }))
      setShowDatePicker(false)
    }
  }

  function formatDataHora(date) {
    if (!date) return 'Selecionar data e horário'
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  async function handleSubmit() {
    const erroValidacao = validar({ ...form })
    if (erroValidacao) { setError(erroValidacao); return }
    setError('')
    setLoading(true)
    try {
      const payload = {
        nome:     form.nome.trim().replace(/[<>]/g, '').slice(0, 100),
        servico:  form.servico,
        preco:    Number(form.preco),
        data:     form.data.toISOString(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        status:   form.status,
      }
      if (editando) {
        await atualizarAgendamento(editando.id, payload)
      } else {
        await criarAgendamento(payload)
      }
      navigation.goBack()
    } catch (e) {
      setError('Erro ao salvar. Tente novamente.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={s.bg} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.title}>{editando ? 'Editar' : 'Novo'} Agendamento</Text>
          <Text style={s.subtitle}>
            {editando ? 'Atualize as informações' : 'Preencha os dados do cliente'}
          </Text>
        </View>

        {/* Nome */}
        <View style={s.field}>
          <Text style={LABEL}>Nome do cliente *</Text>
          <TextInput
            style={INPUT}
            placeholder="João Silva"
            placeholderTextColor={COLORS.textDim}
            value={form.nome}
            maxLength={100}
            onChangeText={t => setForm(prev => ({ ...prev, nome: t.replace(/[<>]/g, '') }))}
          />
        </View>

        {/* Serviço */}
        <View style={s.field}>
          <Text style={LABEL}>Serviço *</Text>
          <View style={s.servicosGrid}>
            {SERVICOS.map(sv => {
              const active = form.servico === sv.label
              return (
                <TouchableOpacity
                  key={sv.id}
                  style={[s.servicoBtn, active && s.servicoBtnActive]}
                  onPress={() => handleServico(sv.id)}
                >
                  <Text style={s.servicoEmoji}>{sv.emoji}</Text>
                  <Text style={[s.servicoLabel, active && s.servicoLabelActive]}>{sv.label}</Text>
                  {sv.preco > 0 && (
                    <Text style={s.servicoPreco}>R${sv.preco}</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Preço */}
        <View style={s.field}>
          <Text style={LABEL}>Preço (R$) *</Text>
          <TextInput
            style={INPUT}
            placeholder="0.00"
            placeholderTextColor={COLORS.textDim}
            value={String(form.preco)}
            onChangeText={t => setForm(prev => ({ ...prev, preco: t }))}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Data e horário */}
        <View style={s.field}>
          <Text style={LABEL}>Data e horário *</Text>
          <TouchableOpacity
            style={[INPUT, s.datePicker]}
            onPress={() => openPicker('date')}
          >
            <Text style={form.data ? s.dateText : s.datePlaceholder}>
              {formatDataHora(form.data)}
            </Text>
            <Text style={s.calIcon}>📅</Text>
          </TouchableOpacity>
        </View>

        {/* WhatsApp */}
        <View style={s.field}>
          <Text style={LABEL}>WhatsApp</Text>
          <TextInput
            style={INPUT}
            placeholder="(11) 99999-9999"
            placeholderTextColor={COLORS.textDim}
            value={form.whatsapp}
            maxLength={20}
            onChangeText={t => setForm(prev => ({ ...prev, whatsapp: t }))}
            keyboardType="phone-pad"
          />
        </View>

        {/* Status (apenas ao editar) */}
        {editando && (
          <View style={s.field}>
            <Text style={LABEL}>Status</Text>
            <View style={s.statusRow}>
              {STATUS_OPTS.map(opcao => {
                const active = form.status === opcao
                const color  = opcao === 'confirmado' ? COLORS.green : opcao === 'finalizado' ? COLORS.goldLight : COLORS.error
                return (
                  <TouchableOpacity
                    key={opcao}
                    style={[s.statusBtn, active && { backgroundColor: `${color}20`, borderColor: `${color}60` }]}
                    onPress={() => setForm(prev => ({ ...prev, status: opcao }))}
                  >
                    <Text style={[s.statusBtnText, active && { color }]}>{opcao}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.btnRow}>
          <TouchableOpacity style={[BTN_GHOST, s.flex]} onPress={() => navigation.goBack()}>
            <Text style={s.ghostText}>Cancelar</Text>
          </TouchableOpacity>
          <View style={{ width: 10 }} />
          <TouchableOpacity
            style={[BTN_PRIMARY, s.flex, loading && s.disabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.bg} />
              : <Text style={s.primaryText}>{editando ? 'Salvar' : 'Criar'}</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={s.modalOverlay}>
              <View style={s.modalSheet}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{pickerMode === 'date' ? 'Escolha a data' : 'Escolha o horário'}</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={s.modalDone}>Pronto</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={form.data || minDate}
                  mode={pickerMode}
                  display="spinner"
                  minimumDate={minDate}
                  onChange={onDateChange}
                  textColor={COLORS.white}
                  style={s.iosPicker}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={form.data || minDate}
            mode={pickerMode}
            display="default"
            minimumDate={minDate}
            onChange={onDateChange}
          />
        )
      )}
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex:        { flex: 1 },
  bg:          { flex: 1, backgroundColor: COLORS.bg },
  container:   { padding: 20, paddingBottom: 40 },
  header:      { marginBottom: 24 },
  title:       { color: COLORS.white, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  subtitle:    { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  field:       { marginBottom: 18 },
  servicosGrid: { flexDirection: 'row', gap: 8 },
  servicoBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: 16, borderWidth: 1,
    backgroundColor: COLORS.card, borderColor: COLORS.border,
  },
  servicoBtnActive: { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  servicoEmoji:     { fontSize: 18, marginBottom: 4 },
  servicoLabel:     { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  servicoLabelActive: { color: COLORS.green },
  servicoPreco:     { color: COLORS.textDim, fontSize: 9, marginTop: 2 },
  datePicker:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText:         { color: COLORS.white, fontSize: 15 },
  datePlaceholder:  { color: COLORS.textDim, fontSize: 15 },
  calIcon:          { fontSize: 16 },
  statusRow:        { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', borderWidth: 1,
    backgroundColor: COLORS.card, borderColor: COLORS.border,
  },
  statusBtnText:    { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  errorBox: {
    backgroundColor: COLORS.errorBg, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.errorBorder,
    padding: 12, marginBottom: 16,
  },
  errorText:  { color: COLORS.error, fontSize: 13 },
  btnRow:     { flexDirection: 'row', marginTop: 8 },
  ghostText:  { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  primaryText: { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  disabled:   { opacity: 0.6 },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  modalDone:  { color: COLORS.green, fontSize: 15, fontWeight: '700' },
  iosPicker:  { backgroundColor: '#1A1A1A' },
})
