import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native'
import { COLORS, INPUT, BTN_PRIMARY, LABEL } from '../theme'
import { supabase } from '../services/supabase'

function gerarSlug(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export default function OnboardingScreen({ user, onConcluir }) {
  const [nome,    setNome]    = useState('')
  const [slug,    setSlug]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function handleNome(t) {
    setNome(t)
    setSlug(gerarSlug(t))
  }

  async function handleSalvar() {
    if (!nome.trim()) { setError('Informe o nome da barbearia.'); return }
    if (!slug.trim())  { setError('Slug inválido.'); return }
    setError('')
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('barbearias')
        .insert([{ owner_id: user.id, nome: nome.trim(), slug: slug.trim() }])
        .select().single()
      if (err) {
        if (err.code === '23505') setError('Esse slug já está em uso. Escolha outro.')
        else throw err
        return
      }
      // Vincular dados órfãos existentes (dados do owner antes do onboarding)
      for (const t of ['agendamentos','config','servicos','dias_bloqueados','produtos','vendas','despesas']) {
        await supabase.from(t).update({ barbearia_id: data.id })
          .eq('user_id', user.id).is('barbearia_id', null)
      }
      onConcluir(data)
    } catch (e) {
      setError('Erro ao criar barbearia. Tente novamente.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.bg} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>Configure sua barbearia</Text>
          <Text style={s.sub}>Isso leva menos de 1 minuto. Faça uma vez só.</Text>
        </View>

        <View style={s.card}>
          <View style={s.field}>
            <Text style={LABEL}>Nome da barbearia</Text>
            <TextInput
              style={INPUT}
              value={nome}
              onChangeText={handleNome}
              placeholder="Ex: Dunga Barber"
              placeholderTextColor={COLORS.textDim}
              maxLength={60}
            />
          </View>

          <View style={s.field}>
            <Text style={LABEL}>Link do agendamento (slug)</Text>
            <View style={s.slugRow}>
              <Text style={s.slugPrefix}>seuapp.com/</Text>
              <TextInput
                style={[INPUT, s.slugInput]}
                value={slug}
                onChangeText={t => setSlug(gerarSlug(t))}
                placeholder="dunga-barber"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
                maxLength={40}
              />
            </View>
            <Text style={s.slugHint}>
              Clientes acessarão: <Text style={{ color: COLORS.green }}>seuapp.com/{slug || 'sua-barbearia'}</Text>
            </Text>
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[BTN_PRIMARY, loading && { opacity: 0.6 }]}
            onPress={handleSalvar}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.bg} />
              : <Text style={s.btnText}>Criar minha barbearia</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Você pode editar essas informações depois nas configurações.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex:      { flex: 1 },
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:    { alignItems: 'center', marginBottom: 32 },
  logo:      { width: 180, height: 90, marginBottom: 16 },
  title:     { color: COLORS.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  sub:       { color: COLORS.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center' },
  card:      { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 24 },
  field:     { marginBottom: 20 },
  slugRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slugPrefix: { color: COLORS.textMuted, fontSize: 13 },
  slugInput: { flex: 1 },
  slugHint:  { color: COLORS.textDim, fontSize: 11, marginTop: 8 },
  errorBox:  { backgroundColor: COLORS.errorBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.errorBorder, padding: 12, marginBottom: 16 },
  errorText: { color: COLORS.error, fontSize: 13 },
  btnText:   { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  footer:    { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
})
