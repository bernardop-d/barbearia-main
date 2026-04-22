import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native'
import { COLORS, INPUT, BTN_PRIMARY, LABEL } from '../theme'
import { criarAgendamentoPublico, buscarHorariosOcupados, buscarDiasBloqueados } from '../services/supabase'
import { HORARIOS } from '../constants'

const SERVICOS = [
  { id: 'corte',       label: 'Corte Normal',   preco: 35,  emoji: '✂️', desc: 'Corte tradicional' },
  { id: 'combo',       label: 'Cabelo + Barba', preco: 55,  emoji: '💈', desc: 'Corte + barba completa' },
  { id: 'platinado',   label: 'Platinado',      preco: 60,  emoji: '⚡', desc: 'Descoloração' },
  { id: 'tinta',       label: 'Tinta Preta',    preco: 15,  emoji: '🖤', desc: 'Adicional de tinta' },
  { id: 'mensal',      label: 'Plano Mensal',   preco: 80,  emoji: '📅', desc: 'Corte mensal' },
  { id: 'mensaltinta', label: 'Mensal + Tinta', preco: 100, emoji: '💎', desc: 'Corte mensal + tinta' },
]

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDataExibicao(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^./, s => s.toUpperCase())
}

function formatMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function validar(form, hora) {
  const nome = form.nome.trim()
  if (!nome) return 'Informe seu nome.'
  if (nome.length < 2) return 'Nome muito curto.'
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) return 'Nome inválido (só letras).'
  if (!form.data) return 'Escolha a data.'
  if (form.data < hojeISO()) return 'Data inválida.'
  if (hora === null) return 'Escolha um horário.'
  const wa = form.whatsapp.replace(/\D/g, '')
  if (wa) {
    if (wa.length < 10 || wa.length > 11) return 'WhatsApp inválido.'
    if (parseInt(wa.slice(0, 2)) < 11) return 'DDD inválido.'
  }
  return null
}

export default function BookingScreen({ navigation }) {
  const [servico, setServico]               = useState(SERVICOS[0])
  const [form, setForm]                     = useState({ nome: '', whatsapp: '', data: hojeISO() })
  const [horaSelecionada, setHoraSelecionada] = useState(null)
  const [horasOcupadas, setHorasOcupadas]   = useState([])
  const [diasBloqueados, setDiasBloqueados] = useState([])
  const [loadingSlots, setLoadingSlots]     = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => {
    buscarDiasBloqueados().then(setDiasBloqueados)
  }, [])

  useEffect(() => {
    if (!form.data) return
    setHoraSelecionada(null)
    setLoadingSlots(true)
    buscarHorariosOcupados(form.data)
      .then(setHorasOcupadas)
      .catch(() => setHorasOcupadas([]))
      .finally(() => setLoadingSlots(false))
  }, [form.data])

  const diaBloqueado = diasBloqueados.includes(form.data)

  const slotDesabilitado = useMemo(() => {
    const agora  = new Date()
    const ehHoje = form.data === hojeISO()
    return (hora) => {
      if (horasOcupadas.includes(hora)) return true
      if (ehHoje && hora <= agora.getHours()) return true
      return false
    }
  }, [horasOcupadas, form.data])

  async function handleSubmit() {
    const err = validar(form, horaSelecionada)
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      const datetime = new Date(`${form.data}T${String(horaSelecionada).padStart(2, '0')}:00:00`)
      const payload  = {
        nome:     form.nome.trim(),
        servico:  servico.label,
        preco:    servico.preco,
        data:     datetime.toISOString(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
      }
      const resultado = await criarAgendamentoPublico(payload)
      navigation.navigate('BookingSuccess', { resultado })
    } catch (e) {
      const msg = e.message || ''
      if (msg.includes('Horário indisponível')) setError('Horário indisponível. Escolha outro.')
      else if (msg.includes('já tem um agendamento')) setError(msg)
      else if (msg.includes('Serviço inválido') || msg.includes('Data inválida')) setError(msg)
      else setError('Erro ao agendar. Tente novamente.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const todosOcupados = HORARIOS.every(h => slotDesabilitado(h))

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.bg} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Image source={require('../../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
          <Text style={s.logoCaption}>Agende seu horário online</Text>
        </View>

        {/* Serviço */}
        <View style={s.section}>
          <Text style={LABEL}>Serviço</Text>
          {SERVICOS.map(sv => {
            const ativo = servico.id === sv.id
            return (
              <TouchableOpacity
                key={sv.id}
                style={[s.servicoCard, ativo && s.servicoCardActive]}
                onPress={() => setServico(sv)}
              >
                <Text style={s.servicoEmoji}>{sv.emoji}</Text>
                <View style={s.servicoInfo}>
                  <Text style={[s.servicoLabel, ativo && s.servicoLabelActive]}>{sv.label}</Text>
                  <Text style={s.servicoDesc}>{sv.desc}</Text>
                </View>
                <Text style={[s.servicoPreco, ativo && s.servicoPrecoActive]}>{formatMoeda(sv.preco)}</Text>
                {ativo && <Text style={s.checkIcon}>✓</Text>}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Data */}
        <View style={s.section}>
          <Text style={LABEL}>Data</Text>
          <TextInput
            style={INPUT}
            value={form.data}
            onChangeText={t => setForm(prev => ({ ...prev, data: t }))}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={COLORS.textDim}
            keyboardType="numeric"
            maxLength={10}
          />
          {!!form.data && (
            <Text style={s.dataExibicao}>{formatDataExibicao(form.data)}</Text>
          )}
        </View>

        {/* Horários */}
        <View style={s.section}>
          <Text style={LABEL}>Horário disponível</Text>
          {diaBloqueado ? (
            <View style={s.bloqueioBox}>
              <Text style={s.bloqueioText}>🔒 Sem atendimento nessa data. Escolha outro dia.</Text>
            </View>
          ) : loadingSlots ? (
            <View style={s.loadingSlots}>
              <ActivityIndicator color={COLORS.green} size="small" />
              <Text style={s.loadingSlotsText}>Verificando horários...</Text>
            </View>
          ) : (
            <View style={s.horariosGrid}>
              {HORARIOS.map(hora => {
                const ocupado = slotDesabilitado(hora)
                const ativo   = horaSelecionada === hora
                return (
                  <TouchableOpacity
                    key={hora}
                    disabled={ocupado}
                    onPress={() => setHoraSelecionada(hora)}
                    style={[
                      s.horarioBtn,
                      ocupado && s.horaroBtnOcupado,
                      ativo && s.horarioBtnAtivo,
                    ]}
                  >
                    <Text style={[
                      s.horarioBtnText,
                      ocupado && s.horarioBtnTextOcupado,
                      ativo && s.horarioBtnTextAtivo,
                    ]}>
                      {String(hora).padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
          {!diaBloqueado && !loadingSlots && todosOcupados && (
            <Text style={s.semHorarios}>Sem horários disponíveis nessa data. Escolha outro dia.</Text>
          )}
        </View>

        {/* Nome */}
        <View style={s.section}>
          <Text style={LABEL}>Seu nome *</Text>
          <TextInput
            style={INPUT}
            placeholder="João Silva"
            placeholderTextColor={COLORS.textDim}
            value={form.nome}
            maxLength={100}
            onChangeText={t => setForm(prev => ({ ...prev, nome: t }))}
          />
        </View>

        {/* WhatsApp */}
        <View style={s.section}>
          <Text style={[LABEL, { marginBottom: 4 }]}>
            WhatsApp <Text style={s.optional}>(opcional)</Text>
          </Text>
          <TextInput
            style={INPUT}
            placeholder="(11) 99999-9999"
            placeholderTextColor={COLORS.textDim}
            value={form.whatsapp}
            keyboardType="phone-pad"
            maxLength={20}
            onChangeText={t => setForm(prev => ({ ...prev, whatsapp: t }))}
          />
        </View>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[BTN_PRIMARY, loading && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.bg} />
            : <Text style={s.btnText}>Confirmar agendamento</Text>
          }
        </TouchableOpacity>

        <Text style={s.footer}>DUNGABARBER © {new Date().getFullYear()}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex:      { flex: 1 },
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 48 },

  header:    { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  logoImg:   { width: 220, height: 110, marginBottom: 8 },
  logoCaption: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  section: { marginBottom: 22 },

  servicoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.card,
    marginBottom: 8,
  },
  servicoCardActive: { borderColor: COLORS.greenBorder, backgroundColor: COLORS.greenBg },
  servicoEmoji:      { fontSize: 24 },
  servicoInfo:       { flex: 1 },
  servicoLabel:      { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  servicoLabelActive: { color: COLORS.green },
  servicoDesc:       { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  servicoPreco:      { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  servicoPrecoActive: { color: COLORS.greenLight },
  checkIcon:         { color: COLORS.green, fontSize: 18, fontWeight: '900' },

  dataExibicao: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },

  loadingSlots:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 20 },
  loadingSlotsText: { color: COLORS.textMuted, fontSize: 13 },

  horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  horarioBtn: {
    width: '22%', paddingVertical: 12, borderRadius: 14, alignItems: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  horaroBtnOcupado:    { backgroundColor: 'rgba(26,26,26,0.4)', borderColor: COLORS.border },
  horarioBtnAtivo:     { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder },
  horarioBtnText:      { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  horarioBtnTextOcupado: { color: COLORS.textDim, textDecorationLine: 'line-through' },
  horarioBtnTextAtivo: { color: COLORS.greenLight },
  semHorarios:         { color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: 8 },
  bloqueioBox:         { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', padding: 12, marginTop: 4 },
  bloqueioText:        { color: '#f87171', fontSize: 13, textAlign: 'center' },

  optional:    { color: COLORS.textDim, fontWeight: '400', textTransform: 'none', fontSize: 11 },
  errorBox: {
    backgroundColor: COLORS.errorBg, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.errorBorder, padding: 12, marginBottom: 16,
  },
  errorText:   { color: COLORS.error, fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  footer:      { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
})
