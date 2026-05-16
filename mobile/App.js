import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet, Modal, Text as RNText, TouchableOpacity } from 'react-native'
import * as Updates from 'expo-updates'
import { registrarPushToken } from './src/services/notifications'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { Ionicons } from '@expo/vector-icons'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { COLORS } from './src/theme'

import LoginScreen           from './src/screens/LoginScreen'
import DashboardScreen       from './src/screens/DashboardScreen'
import AgendaScreen          from './src/screens/AgendaScreen'
import AgendamentoFormScreen from './src/screens/AgendamentoFormScreen'
import AdminConfigScreen     from './src/screens/AdminConfigScreen'
import VendasScreen          from './src/screens/VendasScreen'
import EstoqueScreen         from './src/screens/EstoqueScreen'
import FinanceiroScreen      from './src/screens/FinanceiroScreen'

const Tab   = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const TAB_BAR_STYLE = {
  backgroundColor: COLORS.bg,
  borderTopColor: COLORS.border,
  borderTopWidth: 1,
  paddingBottom: 6,
  paddingTop: 6,
  height: 60,
}

const SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: COLORS.bg },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '700', letterSpacing: -0.3 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.bg },
}

const ADMIN_ICONS = {
  Dashboard:  'speedometer-outline',
  Agenda:     'calendar-outline',
  Vendas:     'bag-outline',
  Financeiro: 'bar-chart-outline',
  Config:     'settings-outline',
}

function AdminRoot() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="AdminTabs"         component={AdminTabs}            options={{ headerShown: false }} />
      <Stack.Screen name="EditarAgendamento" component={AgendamentoFormScreen} options={{ title: 'Agendamento', presentation: 'modal' }} />
      <Stack.Screen name="Estoque"           component={EstoqueScreen}         options={{ title: 'Estoque' }} />
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
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 9, fontWeight: '500', letterSpacing: 0.6, textTransform: 'uppercase' },
        tabBarIcon: ({ size, color }) => (
          <Ionicons name={ADMIN_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard"  component={DashboardScreen}   options={{ title: 'Dashboard', headerShown: false }} />
      <Tab.Screen name="Agenda"     component={AgendaScreen}      options={{ title: 'Agenda', headerTitle: 'Agenda' }} />
      <Tab.Screen name="Vendas"     component={VendasScreen}      options={{ title: 'Vendas', headerTitle: 'Sistema de Vendas' }} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen}  options={{ title: 'Financeiro', headerTitle: 'Controle Financeiro' }} />
      <Tab.Screen name="Config"     component={AdminConfigScreen} options={{ title: 'Config', headerTitle: 'Configurações' }} />
    </Tab.Navigator>
  )
}

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

  if (user) return <AdminRoot />

  return (
    <Stack.Navigator screenOptions={{ ...SCREEN_OPTIONS, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  )
}

function UpdateModal({ visible, onUpdate, onDismiss }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={s.overlay}>
        <View style={s.updateCard}>
          <Ionicons name="refresh-circle-outline" size={48} color={COLORS.green} style={{ marginBottom: 12 }} />
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
            <ActivityIndicator color={COLORS.green} size="large" />
            <RNText style={s.updatingText}>Aplicando atualização...</RNText>
          </View>
        )}
      </NavigationContainer>
    </AuthProvider>
  )
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  updateCard: {
    backgroundColor: COLORS.bg, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 28, alignItems: 'center', width: '100%',
  },
  updateTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  updateText:    { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  updateBtn: {
    backgroundColor: COLORS.green, borderRadius: 10,
    paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10,
  },
  updateBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  laterBtn:      { paddingVertical: 10, width: '100%', alignItems: 'center' },
  laterBtnText:  { color: COLORS.textMuted, fontSize: 14 },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  updatingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
