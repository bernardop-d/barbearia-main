import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, RefreshControl, Switch, Share,
} from 'react-native'
import { supabase } from '../services/supabase'
import { COLORS, CARD } from '../theme'

const SUPABASE_URL  = 'https://phhvzajbomoyedbwebgl.supabase.co'
const BOOKING_BASE  = 'https://bernardop-d.github.io/barbearia-main/booking/?b='

const TABS = ['Pendentes', 'Ativas', 'Vencidas', 'Todas']

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

function hoje() {
  return new Date().toLocaleDateString('sv-SE')
}

function diasRestantes(vencimento) {
  if (!vencimento) return null
  return Math.max(0, Math.ceil((new Date(vencimento + 'T23:59:59') - new Date()) / 86400000))
}

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

async function godFetch(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(json.error || `Erro ${resp.status}`)
  return json
}

export default function GodPanelScreen({ onLogout }) {
  const [barbearias, setBarbearias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalNova,  setModalNova]  = useState(false)
  const [busca,      setBusca]      = useState('')
  const [tab,        setTab]        = useState('Pendentes')

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('barbearias')
      .select('id, nome, slug, owner_email, ativo, vencimento, created_at')
      .order('created_at', { ascending: false })
    if (error) Alert.alert('Erro ao carregar', error.message)
    setBarbearias(data || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const pendentes = barbearias.filter(b => !b.ativo && !b.vencimento)
  const ativas    = barbearias.filter(b => b.ativo && (!b.vencimento || b.vencimento >= hoje()))
  const vencidas  = barbearias.filter(b => b.vencimento && b.vencimento < hoje())

  function filtered(list) {
    if (!busca.trim()) return list
    const q = busca.toLowerCase()
    return list.filter(b =>
      b.nome?.toLowerCase().includes(q) ||
      b.owner_email?.toLowerCase().includes(q) ||
      b.slug?.toLowerCase().includes(q)
    )
  }

  const currentList = filtered({
    Pendentes: pendentes,
    Ativas:    ativas,
    Vencidas:  vencidas,
    Todas:     barbearias,
  }[tab] || [])

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={COLORS.green} size="large" /></View>
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.godBadge}><Text style={s.godBadgeText}>GOD</Text></View>
          <Text style={s.headerTitle}>Your Barber</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity style={s.btnNovaHeader} onPress={() => setModalNova(true)}>
            <Text style={s.btnNovaHeaderText}>+ Nova conta</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats clicáveis */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 12 }}>
        <StatCard label="Total"     value={barbearias.length} active={tab === 'Todas'}     onPress={() => setTab('Todas')} />
        <StatCard label="Ativas"    value={ativas.length}    color={COLORS.green} active={tab === 'Ativas'}    onPress={() => setTab('Ativas')} />
        <StatCard label="Vencidas"  value={vencidas.length}  color="#f59e0b"      active={tab === 'Vencidas'}  onPress={() => setTab('Vencidas')} />
        <StatCard label="Pendentes" value={pendentes.length} color="#f97316"      active={tab === 'Pendentes'} onPress={() => setTab('Pendentes')} badge={pendentes.length > 0} />
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabAtivo]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextAtivo]}>{t}</Text>
            {t === 'Pendentes' && pendentes.length > 0 && (
              <View style={s.tabDot} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Busca */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar nome, email ou slug..."
          placeholderTextColor={COLORS.textMuted}
          value={busca}
          onChangeText={setBusca}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, gap: 10, paddingTop: 4, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll() }}
            tintColor={COLORS.green}
          />
        }
      >
        {currentList.length === 0 && (
          <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 32, fontSize: 13 }}>
            {busca ? 'Nenhum resultado para "' + busca + '".' : `Nenhuma conta ${tab.toLowerCase()}.`}
          </Text>
        )}

        {tab === 'Pendentes'
          ? currentList.map(b => <PendenteCard key={b.id} barbearia={b} onUpdate={fetchAll} />)
          : currentList.map(b => <BarbeariaCard key={b.id} barbearia={b} onUpdate={fetchAll} />)
        }
      </ScrollView>

      {modalNova && <NovaContaModal onClose={() => setModalNova(false)} onCreated={() => { fetchAll(); setTab('Ativas') }} />}
    </View>
  )
}

function StatCard({ label, value, color = '#fff', active, onPress, badge }) {
  return (
    <TouchableOpacity
      style={[CARD, s.statCard, active && { borderColor: 'rgba(0,232,122,0.4)', backgroundColor: 'rgba(0,232,122,0.05)' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ position: 'relative' }}>
        <Text style={[s.statValue, { color }]}>{value}</Text>
        {badge && value > 0 && <View style={s.statBadge} />}
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </TouchableOpacity>
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
    const { error } = await supabase.from('barbearias').update({ ativo: true, vencimento }).eq('id', b.id)
    setSaving(false)
    if (error) { Alert.alert('Erro', error.message); return }
    Alert.alert('✓ Aprovado', `${b.nome} agora tem acesso até ${vencimento}.`)
    onUpdate()
  }

  async function rejeitar() {
    Alert.alert(
      'Rejeitar conta',
      `Excluir permanentemente a conta de ${b.nome}? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          setSaving(true)
          try {
            await godFetch('deletar-conta', { barbearia_id: b.id })
            onUpdate()
          } catch (e) {
            Alert.alert('Erro ao excluir', e.message)
          } finally {
            setSaving(false)
          }
        }},
      ]
    )
  }

  return (
    <View style={s.pendenteCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardNome}>{b.nome}</Text>
          <Text style={s.cardEmail}>{b.owner_email || '—'}</Text>
          <Text style={s.cardSlug}>/{b.slug}  ·  cadastro {fmtData(b.created_at)}</Text>
        </View>
        <View style={s.pendenteBadge}><Text style={s.pendenteBadgeText}>pendente</Text></View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
        {[[1,'1 dia'],[7,'7 dias'],[30,'30 dias']].map(([days, label]) => (
          <TouchableOpacity
            key={label}
            style={[s.preset, { flex: 1 }, vencimento === addDays(days) && s.presetAtivo]}
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
          {saving
            ? <ActivityIndicator color={COLORS.error} size="small" />
            : <Text style={s.btnRejeitarText}>Rejeitar</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={s.btnAprovar} onPress={aprovar} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={s.btnAprovarText}>Aprovar</Text>
          }
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
  const vencido = vencimento && vencimento < hoje()

  async function toggleAtivo(val) {
    setAtivo(val)
    const { error } = await supabase.from('barbearias').update({ ativo: val }).eq('id', b.id)
    if (error) { setAtivo(!val); Alert.alert('Erro', error.message); return }
    onUpdate()
  }

  async function salvarVenc(val) {
    setVencimento(val)
    setSaving(true)
    const { error } = await supabase.from('barbearias').update({ vencimento: val || null }).eq('id', b.id)
    setSaving(false)
    if (error) Alert.alert('Erro', error.message)
    else onUpdate()
  }

  async function excluir() {
    Alert.alert(
      'Excluir conta',
      `Excluir permanentemente ${b.nome}?\n\nTodos os agendamentos, serviços e dados serão removidos. Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          setSaving(true)
          try {
            await godFetch('deletar-conta', { barbearia_id: b.id })
            onUpdate()
          } catch (e) {
            Alert.alert('Erro ao excluir', e.message)
          } finally {
            setSaving(false)
          }
        }},
      ]
    )
  }

  async function compartilharLink() {
    await Share.share({
      message: `Agende seu horário na ${b.nome}: ${BOOKING_BASE}${b.slug}`,
      url: `${BOOKING_BASE}${b.slug}`,
    })
  }

  return (
    <View style={[CARD, vencido && { borderColor: 'rgba(245,158,11,0.3)' }, !ativo && { opacity: 0.65 }]}>
      {/* Linha topo */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={s.cardNome}>{b.nome}</Text>
            {vencido && !ativo && <View style={s.vencidoBadge}><Text style={s.vencidoText}>vencida</Text></View>}
            {vencido && ativo  && <View style={s.vencidoBadge}><Text style={s.vencidoText}>vencida</Text></View>}
            {!ativo && !vencido && <View style={s.inativoBadge}><Text style={s.inativoText}>inativa</Text></View>}
          </View>
          <Text style={s.cardEmail}>{b.owner_email || '—'}</Text>
          <Text style={s.cardSlug}>/{b.slug}  ·  desde {fmtData(b.created_at)}</Text>
        </View>
        <Switch
          value={ativo}
          onValueChange={toggleAtivo}
          trackColor={{ false: '#333', true: COLORS.green }}
          thumbColor="#fff"
        />
      </View>

      {/* Dias restantes */}
      {dias !== null && (
        <Text style={[s.cardDias, dias <= 3 && { color: '#f97316' }, vencido && { color: '#f59e0b' }]}>
          {vencido ? `Venceu em ${vencimento}` : `${dias} ${dias === 1 ? 'dia restante' : 'dias restantes'} (${vencimento})`}
        </Text>
      )}

      {/* Presets vencimento */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        {[[1,'1d'],[7,'7d'],[30,'30d']].map(([days, label]) => (
          <TouchableOpacity
            key={label}
            style={[s.preset, { flex: 1 }]}
            onPress={() => salvarVenc(addDays(days))}
            disabled={saving}
          >
            <Text style={s.presetText}>{saving ? '...' : label}</Text>
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

      {/* Ações */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <TouchableOpacity style={s.btnShare} onPress={compartilharLink}>
          <Text style={s.btnShareText}>Compartilhar link</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={excluir} disabled={saving}>
          <Text style={{ color: 'rgba(255,77,77,0.5)', fontSize: 12 }}>
            {saving ? 'Excluindo...' : '× Excluir conta'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function NovaContaModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ nome: '', slug: '', email: '', password: '', vencimento: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function slugify(str) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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
      await godFetch('criar-conta', form)
      onCreated()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.modalOverlay}>
      <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={s.modalCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Nova conta</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: COLORS.textMuted, fontSize: 22 }}>×</Text></TouchableOpacity>
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
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {[[1,'1 dia'],[7,'7 dias'],[30,'30 dias']].map(([days, label]) => (
              <TouchableOpacity
                key={label}
                style={[s.preset, { flex: 1 }, form.vencimento === addDays(days) && s.presetAtivo]}
                onPress={() => set('vencimento', addDays(days))}
              >
                <Text style={[s.presetText, form.vencimento === addDays(days) && s.presetTextAtivo]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={{ color: COLORS.error, fontSize: 12, marginBottom: 10 }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={onClose}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={handleSubmit} disabled={loading}>
              <Text style={s.btnPrimaryText}>{loading ? 'Criando...' : 'Criar conta'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  center:           { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle:      { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  godBadge:         { backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  godBadgeText:     { color: '#f87171', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  btnNovaHeader:    { backgroundColor: 'rgba(0,232,122,0.1)', borderWidth: 1, borderColor: 'rgba(0,232,122,0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  btnNovaHeaderText:{ color: COLORS.green, fontSize: 12, fontWeight: '700' },
  statCard:         { flex: 1, alignItems: 'center', padding: 10 },
  statValue:        { fontSize: 20, fontWeight: '800' },
  statLabel:        { color: COLORS.textMuted, fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  statBadge:        { position: 'absolute', top: -2, right: -6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#f97316' },
  tabsRow:          { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 6 },
  tab:              { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabAtivo:         { backgroundColor: 'rgba(0,232,122,0.08)', borderColor: 'rgba(0,232,122,0.35)' },
  tabText:          { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  tabTextAtivo:     { color: COLORS.green },
  tabDot:           { width: 5, height: 5, borderRadius: 3, backgroundColor: '#f97316', marginTop: 1 },
  searchInput:      { backgroundColor: '#111', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 13 },
  cardNome:         { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardEmail:        { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  cardSlug:         { color: 'rgba(0,232,122,0.5)', fontSize: 11, marginTop: 1 },
  cardDias:         { color: COLORS.textMuted, fontSize: 11 },
  pendenteCard:     { backgroundColor: 'rgba(249,115,22,0.05)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 12, padding: 14 },
  pendenteBadge:    { backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, height: 20 },
  pendenteBadgeText:{ color: '#f97316', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  vencidoBadge:     { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  vencidoText:      { color: '#f59e0b', fontSize: 9, fontWeight: '700' },
  inativoBadge:     { backgroundColor: 'rgba(255,77,77,0.1)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  inativoText:      { color: COLORS.error, fontSize: 9, fontWeight: '700' },
  preset:           { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  presetAtivo:      { backgroundColor: 'rgba(0,232,122,0.1)', borderColor: 'rgba(0,232,122,0.4)' },
  presetText:       { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  presetTextAtivo:  { color: COLORS.green },
  input:            { backgroundColor: '#111', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#fff', fontSize: 13 },
  inputLabel:       { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  btnPrimary:       { backgroundColor: COLORS.green, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnPrimaryText:   { color: '#000', fontSize: 14, fontWeight: '700' },
  btnGhost:         { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnAprovar:       { backgroundColor: COLORS.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center', minWidth: 72 },
  btnAprovarText:   { color: '#000', fontSize: 12, fontWeight: '700' },
  btnRejeitar:      { backgroundColor: 'rgba(255,77,77,0.1)', borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center', minWidth: 72 },
  btnRejeitarText:  { color: COLORS.error, fontSize: 12, fontWeight: '700' },
  btnShare:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnShareText:     { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  modalOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
  modalCard:        { backgroundColor: '#161616', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 20, paddingBottom: 36 },
})
