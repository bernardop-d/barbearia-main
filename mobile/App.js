import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet, Modal, Text as RNText, TouchableOpacity } from 'react-native'
import * as Updates from 'expo-updates'
import { registrarPushToken } from './src/services/notifications'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import { COLORS } from './src/theme'

import LoginScreen            from './src/screens/LoginScreen'
import DashboardScreen        from './src/screens/DashboardScreen'
import AgendaScreen           from './src/screens/AgendaScreen'
import AgendamentoFormScreen  from './src/screens/AgendamentoFormScreen'
import BookingScreen          from './src/screens/BookingScreen'
import BookingSuccessScreen   from './src/screens/BookingSuccessScreen'

const Tab   = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const TAB_BAR_STYLE = {
  backgroundColor: COLORS.card,
  borderTopColor: COLORS.border,
  borderTopWidth: 1,
  paddingBottom: 6,
  paddingTop: 6,
  height: 60,
}

const SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: COLORS.bg },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '800', letterSpacing: 0.5 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.bg },
}

// ─── Admin: Stack com tabs + tela de edição ──────────────────────────────────
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="EditarAgendamento"
        component={AgendamentoFormScreen}
        options={{ title: 'Editar Agendamento', presentation: 'modal' }}
      />
    </Stack.Navigator>
  )
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...SCREEN_OPTIONS,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ size }) => {
          const icons = { Dashboard: '📊', Agenda: '📅', Novo: '➕' }
          return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Agenda"    component={AgendaScreen}    options={{ title: 'Agenda' }} />
      <Tab.Screen
        name="Novo"
        component={AgendamentoFormScreen}
        options={{ title: 'Novo', headerTitle: 'Novo Agendamento' }}
      />
    </Tab.Navigator>
  )
}

// ─── Booking: Stack público ──────────────────────────────────────────────────
function BookingStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingSuccess"
        component={BookingSuccessScreen}
        options={{ title: 'Confirmação', headerBackVisible: false }}
      />
    </Stack.Navigator>
  )
}

// ─── Raiz: troca entre autenticado e guest ───────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (user) registrarPushToken()
  }, [user])

  if (loading) {
    return (
      <View style={s.splash}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    )
  }

  if (user) {
    // Usuário logado: Admin tabs + aba de Agendamento público
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          ...SCREEN_OPTIONS,
          headerShown: false,
          tabBarStyle: TAB_BAR_STYLE,
          tabBarActiveTintColor: COLORS.green,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
          tabBarIcon: ({ size }) => {
            const icons = { Admin: '🔧', Agendar: '💈' }
            return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>
          },
        })}
      >
        <Tab.Screen name="Admin"   component={AdminStack}   options={{ title: 'Admin' }} />
        <Tab.Screen name="Agendar" component={BookingStack} options={{ title: 'Agendar' }} />
      </Tab.Navigator>
    )
  }

  // Guest: aba de Agendamento + Login de admin
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...SCREEN_OPTIONS,
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIcon: ({ size }) => {
          const icons = { Agendar: '💈', Entrar: '🔐' }
          return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>
        },
      })}
    >
      <Tab.Screen name="Agendar" component={BookingStack} options={{ title: 'Agendar' }} />
      <Tab.Screen name="Entrar"  component={LoginScreen}  options={{ title: 'Admin', headerShown: true, headerTitle: 'BarberPro' }} />
    </Tab.Navigator>
  )
}

function UpdateModal({ visible, onUpdate, onDismiss }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={s.overlay}>
        <View style={s.updateCard}>
          <RNText style={s.updateIcon}>🆕</RNText>
          <RNText style={s.updateTitle}>Atualização disponível</RNText>
          <RNText style={s.updateText}>Uma nova versão do DUNGABARBER está pronta. Deseja atualizar agora?</RNText>
          <TouchableOpacity style={s.updateBtn} onPress={onUpdate}>
            <RNText style={s.updateBtnText}>Atualizar agora</RNText>
          </TouchableOpacity>
          <TouchableOpacity style={s.laterBtn} onPress={onDismiss}>
            <RNText style={s.laterBtnText}>Mais tarde</RNText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating]               = useState(false)

  useEffect(() => {
    async function checkUpdate() {
      if (__DEV__) return
      try {
        const result = await Updates.checkForUpdateAsync()
        if (result.isAvailable) setUpdateAvailable(true)
      } catch {}
    }
    checkUpdate()
  }, [])

  async function handleUpdate() {
    setUpdating(true)
    try {
      await Updates.fetchUpdateAsync()
      await Updates.reloadAsync()
    } catch {
      setUpdating(false)
      setUpdateAvailable(false)
    }
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
        <UpdateModal
          visible={updateAvailable && !updating}
          onUpdate={handleUpdate}
          onDismiss={() => setUpdateAvailable(false)}
        />
        {updating && (
          <View style={s.updatingOverlay}>
            <ActivityIndicator color="#22c55e" size="large" />
            <RNText style={s.updatingText}>Aplicando atualização...</RNText>
          </View>
        )}
      </NavigationContainer>
    </AuthProvider>
  )
}

const s = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  updateCard: {
    backgroundColor: '#161616', borderRadius: 24,
    borderWidth: 1, borderColor: '#2A2A2A',
    padding: 28, alignItems: 'center', width: '100%',
  },
  updateIcon:    { fontSize: 40, marginBottom: 12 },
  updateTitle:   { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  updateText:    { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  updateBtn: {
    backgroundColor: '#22c55e', borderRadius: 14,
    paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10,
  },
  updateBtnText: { color: '#0D0D0D', fontSize: 15, fontWeight: '700' },
  laterBtn:      { paddingVertical: 10, width: '100%', alignItems: 'center' },
  laterBtnText:  { color: '#666', fontSize: 14 },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  updatingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
