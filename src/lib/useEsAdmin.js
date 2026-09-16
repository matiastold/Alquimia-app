import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useEsAdmin() {
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle()
      setEsAdmin(data?.rol === 'admin')
    }
    cargar()
  }, [])

  return esAdmin
}