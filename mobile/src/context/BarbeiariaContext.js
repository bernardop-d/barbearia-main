import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)

export function BarbeiariaProvider({ children }) {
  const { user }                    = useAuth()
  const [barbearia, setBarbearia]   = useState(null)
  const [loading,   setLoading]     = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setBarbearia(null); setLoading(false); return }
    const { data } = await supabase
      .from('barbearias').select('*').eq('owner_id', user.id).maybeSingle()
    setBarbearia(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => { setLoading(true); refresh() }, [refresh])

  return (
    <Ctx.Provider value={{ barbearia, setBarbearia, loading, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useBarbearia() { return useContext(Ctx) }
