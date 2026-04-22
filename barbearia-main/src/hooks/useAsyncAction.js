// src/hooks/useAsyncAction.js
import { useState } from 'react'

/**
 * Centraliza o padrão try/catch para ações assíncronas.
 * Retorna { loading, error, setError, run }
 */
export function useAsyncAction() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function run(fn) {
    setLoading(true)
    setError('')
    try {
      return await fn()
    } catch (err) {
      const msg = err?.message || 'Erro inesperado. Tente novamente.'
      setError(msg)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, setError, run }
}
