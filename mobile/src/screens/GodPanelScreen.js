import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, RefreshControl, Switch,
} from 'react-native'
import { supabase } from '../services/supabase'
import { COLORS, CARD } from '../theme'

const SUPABASE_URL = 'https://phhvzajbomoyedbwebgl.supabase.co'

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

function diasRestantes(vencimento) {
  if (!vencimento) return null
  return Math.max(0, Math.ceil((new Date(vencimento + 'T23:59:59') - new Date()) / 86400000))
}

export default function GodPanelScreen({ onLogout }) {
  const [barbearias, setBarbearias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalNova,  setModalNova]  = useState(false)

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('barbearias')
      .select('id, nome, slug, owner_email, ativo, vencimento, created_at')
      .order('created_at', { ascending: false })
    setBarbearias(data || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const pendentes = barbearias.filter(b => !b.ativo && !b.vencimento)
  const ativas    = barbearias.filter(b => b.ativo && (!b.vencimento || new Date(b.vencimento) >= new Date()))
  const vencidas  = barbearias.filter(b => b.vencimento && new Date(b.vencimento) < new Date())

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.godBadge}><Text style={s.godBadgeText}>GOD</Text></View>
          <Text style={s.headerTitle}>Your Barber</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll() }} tintColor={COLORS.green} />}
      >
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard label="Total"     value={barbearias.length} />
          <StatCard label="Ativas"    value={ativas.length}     color={COLORS.green} />
          <StatCard label="Vencidas"  value={vencidas.length}   color="#f59e0b" />
          <StatCard label="Pendentes" value={pendentes.length}  color="#f97316" />
        </View>

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={s.sectionTitle}>⏳ Aguardando aprovação ({pendentes.length})</Text>
            {pendentes.map(b => (
              <PendenteCard key={b.id} barbearia={b} onUpdate={fetchAll} />
            ))}
          </View>
        )}

        {/* Nova conta */}
        <TouchableOpacity style={s.btnPrimary} onPress={() => setModalNova(true)}>
          <Text style={s.btnPrimaryText}>+ Nova conta</Text>
        </TouchableOpacity>

        {/* Lista */}
        <Text style={s.sectionTitle}>Todas as contas</Text>
        {barbearias.filter(b => b.ativo || b.vencimento).map(b => (
          <BarbeariaCard key={b.id} barbearia={b} onUpdate={fetchAll} />
        ))}
      </ScrollView>

      {modalNova && <NovaContaModal onClose={() => setModalNova(false)} onCreated={fetchAll} />}
    </View>
  )
}

function StatCard({ label, value, color = '#fff' }) {
  return (
    <View style={[CARD, s.statCard]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function PendenteCard({ barbearia: b, onUpdate }) {
  const [vencimento, setVencimento] = useState('')
  const [saving,     setSaving]     = useState(false)

  async function aprovar() {
    if (!vencimento) {
      Alert.alert('Defina o vencimento', 'Escolha quantos dias de acesso antes de aprovar.')
      return
    }
    setSaving(true)
    await supabase.from('barbearias').update({ ativo: true, vencimento }).eq('id', b.id)
    setSaving(false)
    onUpdate()
  }

  async function rejeitar() {
    Alert.alert('Rejeitar conta', `Excluir permanentemente a conta de ${b.nome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        setSaving(true)
        const { data: { session } } = await supabase.auth.getSession()
        await fetch(`${SUPABASE_URL}/functions/v1/deletar-conta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ barbearia_id: b.id }),
        })
        onUpdate()
      }},
    ])
  }

  return (
    <View style={s.pendenteCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardNome}>{b.nome}</Text>
          <Text style={s.cardEmail}>{b.owner_email || '—'}</Text>
          <Text style={s.cardSlug}>/{b.slug}</Text>
        </View>
        <View style={s.pendenteBadge}><Text style={s.pendenteBadgeText}>pendente</Text></View>
      </View>

      {/* Presets */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
        {[[1,'1d'],[7,'7d'],[30,'30d']].map(([days, label]) => (
          <TouchableOpacity
            key={label}
            style={[s.preset, vencimento === addDays(days) && s.presetAtivo]}
            onPress={() => setVencimento(addDays(days))}
          >
            <Text style={[s.presetText, vencimento === addDays(days) && s.presetTextAtivo]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={vencimento}
          onChangeText={setVencimento}
        />
        <TouchableOpacity style={s.btnRejeitar} onPress={rejeitar} disabled={saving}>
          <Text style={s.btnRejeitarText}>Rejeitar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnAprovar} onPress={aprovar} disabled={saving}>
          <Text style={s.btnAprovarText}>{saving ? '...' : 'Aprovar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function BarbeariaCard({ barbearia: b, onUpdate }) {
  const [ativo,      setAtivo]      = useState(b.ativo)
  const [vencimento, setVencimento] = useState(b.vencimento || '')
  const [saving,     setSaving]     = useState(false)

  const dias    = diasRestantes(vencimento)
  const vencido = vencimento && new Date(vencimento) < new Date()

  async function toggleAtivo(val) {
    setAtivo(val)
    await supabase.from('barbearias').update({ ativo: val }).eq('id', b.id)
    onUpdate()
  }

  async function salvarVenc(val) {
    setVencimento(val)
    setSaving(true)
    await supabase.from('barbearias').update({ vencimento: val || null }).eq('id', b.id)
    setSaving(false)
    onUpdate()
  }

  async function excluir() {
    Alert.alert('Excluir conta', `Excluir permanentemente ${b.nome}? Todos os dados serão removidos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch(`${SUPABASE_URL}/functions/v1/deletar-conta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ barbearia_id: b.id }),
        })
        onUpdate()
      }},
    ])
  }

  return (
    <View style={[CARD, !ativo && { borderColor: 'rgba(255,77,77,0.3)', opacity: 0.7 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={s.cardNome}>{b.nome}</Text>
            {vencido && <View style={s.vencidoBadge}><Text style={s.vencidoText}>vencida</Text></View>}
            {!ativo  && <View style={s.inativoBadge}><Text style={s.inativoText}>inativa</Text></View>}
          </View>
          <Text style={s.cardEmail}>{b.owner_email || '—'}</Text>
          <Text style={s.cardSlug}>/{b.slug}</Text>
        </View>
        <Switch
          value={ativo}
          onValueChange={toggleAtivo}
          trackColor={{ false: '#333', true: COLORS.green }}
          thumbColor="#fff"
        />
      </View>

      {dias !== null && (
        <Text style={[s.cardDias, dias <= 3 && { color: '#f97316' }]}>
          {dias} {dias === 1 ? 'dia restante' : 'dias restantes'}
        </Text>
      )}

      {/* Presets vencimento */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {[[1,'1d'],[7,'7d'],[30,'30d']].map(([days, label]) => (
          <TouchableOpacity
            key={label}
            style={[s.preset, { flex: 1 }]}
            onPress={() => salvarVenc(addDays(days))}
            disabled={saving}
          >
            <Text style={s.presetText}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={[s.input, { flex: 2 }]}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={vencimento}
          onChangeText={v => { setVencimento(v); if (v.length === 10) salvarVenc(v) }}
        />
      </View>

      <TouchableOpacity style={{ marginTop: 10, alignSelf: 'flex-end' }} onPress={excluir}>
        <Text style={{ color: 'rgba(255,77,77,0.5)', fontSize: 12 }}>× Excluir conta</Text>
      </TouchableOpacity>
    </View>
  )
}

function NovaContaModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ nome: '', slug: '', email: '', password: '', vencimento: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function set(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'nome') next.slug = slugify(v)
      return next
    })
  }

  async function handleSubmit() {
    if (!form.nome || !form.slug || !form.email || !form.password) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    setError(''); setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/criar-conta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      })
      const json = await resp.json()
      if (!resp.ok) { setError(json.error || 'Erro ao criar conta.'); return }
      onCreated(); onClose()
    } catch { setError('Erro de conexão.') }
    finally { setLoading(false) }
  }

  return (
    <View style={s.modalOverlay}>
      <View style={s.modalCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Nova conta</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: COLORS.textMuted, fontSize: 20 }}>×</Text></TouchableOpacity>
        </View>

        {[
          ['Nome da barbearia *', 'nome',     false, 'Barbearia do João'],
          ['Slug (URL) *',        'slug',     false, 'barbearia-do-joao'],
          ['Email *',             'email',    false, 'dono@email.com'],
          ['Senha *',             'password', true,  'mínimo 6 caracteres'],
        ].map(([label, key, secure, ph]) => (
          <View key={key} style={{ marginBottom: 10 }}>
            <Text style={s.inputLabel}>{label}</Text>
            <TextInput
              style={s.input}
              placeholder={ph}
              placeholderTextColor={COLORS.textMuted}
              value={form[key]}
              onChangeText={v => set(key, key === 'slug' ? slugify(v) : v)}
              secureTextEntry={secure}
              autoCapitalize="none"
              keyboardType={key === 'email' ? 'email-address' : 'default'}
            />
          </View>
        ))}

        <Text style={s.inputLabel}>Vencimento</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {[[1,'1d'],[7,'7d'],[30,'30d']].map(([days, label]) => (
            <TouchableOpacity
              key={label}
              style={[s.preset, { flex: 1 }, form.vencimento === addDays(days) && s.presetAtivo]}
              onPress={() => set('vencimento', addDays(days))}
            >
              <Text style={[s.presetText, form.vencimento === addDays(days) && s.presetTextAtivo]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={{ color: COLORS.error, fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={onClose}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={s.btnPrimaryText}>{loading ? 'Criando...' : 'Criar conta'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  center:          { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  godBadge:        { backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  godBadgeText:    { color: '#f87171', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  sectionTitle:    { color: '#f97316', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  statCard:        { flex: 1, alignItems: 'center', padding: 12 },
  statValue:       { fontSize: 22, fontWeight: '800' },
  statLabel:       { color: COLORS.textMuted, fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  cardNome:        { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardEmail:       { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  cardSlug:        { color: 'rgba(0,232,122,0.5)', fontSize: 11, marginTop: 1 },
  cardDias:        { color: COLORS.textMuted, fontSize: 11 },
  pendenteCard:    { backgroundColor: 'rgba(249,115,22,0.05)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 12, padding: 14 },
  pendenteBadge:   { backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, height: 20 },
  pendenteBadgeText: { color: '#f97316', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  vencidoBadge:    { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  vencidoText:     { color: '#f59e0b', fontSize: 9, fontWeight: '700' },
  inativoBadge:    { backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  inativoText:     { color: COLORS.error, fontSize: 9, fontWeight: '700' },
  preset:          { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  presetAtivo:     { backgroundColor: 'rgba(0,232,122,0.1)', borderColor: 'rgba(0,232,122,0.4)' },
  presetText:      { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  presetTextAtivo: { color: COLORS.green },
  input:           { backgroundColor: '#111', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#fff', fontSize: 13 },
  inputLabel:      { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  btnPrimary:      { backgroundColor: COLORS.green, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnPrimaryText:  { color: '#000', fontSize: 14, fontWeight: '700' },
  btnGhost:        { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnAprovar:      { backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  btnAprovarText:  { color: '#000', fontSize: 12, fontWeight: '700' },
  btnRejeitar:     { backgroundColor: 'rgba(255,77,77,0.1)', borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  btnRejeitarText: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
  modalOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', padding: 16, paddingBottom: 32 },
  modalCard:       { backgroundColor: '#161616', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 20 },
})
