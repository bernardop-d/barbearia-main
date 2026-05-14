import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native'
import { COLORS, INPUT, BTN_PRIMARY, LABEL } from '../theme'
import { login } from '../services/supabase'

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit() {
    if (!email || !password) { setError('Preencha todos os campos.'); return }
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.')
      } else {
        setError('Erro ao entrar.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={s.bg}
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Image source={require('../../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
          <Text style={s.subtitle}>Área do proprietário</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Entrar</Text>
          <Text style={s.cardSub}>Acesse sua conta de proprietário</Text>

          <View style={s.field}>
            <Text style={LABEL}>E-mail</Text>
            <TextInput
              style={INPUT}
              placeholder="seu@email.com"
              placeholderTextColor={COLORS.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.field}>
            <Text style={LABEL}>Senha</Text>
            <TextInput
              style={INPUT}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[BTN_PRIMARY, s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.bg} />
              : <Text style={s.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>
          DUNGABARBER © {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex:      { flex: 1 },
  bg:        { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImg:  { width: 200, height: 100, marginBottom: 12 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  cardTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  cardSub:   { color: COLORS.textMuted, fontSize: 13, marginTop: 4, marginBottom: 20 },
  field:     { marginBottom: 16 },

  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: COLORS.error, fontSize: 13 },
  btn:       { marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText:   { color: COLORS.bg, fontSize: 15, fontWeight: '700' },

  footer:    { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
})
