import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registrarPushToken() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DUNGABARBER',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22c55e',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return null

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'cbf99ac9-681f-4e93-b551-da63cd72a7c4',
    })

    const token = tokenData.data

    await supabase
      .from('push_tokens')
      .upsert([{ token }], { onConflict: 'token' })

    return token
  } catch (e) {
    console.error('Push token error:', e)
    return null
  }
}
