import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export function RegistrationDeliveryStatus() {
  const [state, setState] = useState({ loading: true, rows: [], available: false })
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }))
    try {
      const result = await supabase?.rpc('registration_delivery_summary')
      setState({ loading: false, rows: result?.data ?? [], available: Boolean(result && !result.error) })
    } catch { setState({ loading: false, rows: [], available: false }) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  const total = (status) => state.rows.filter((row) => status.includes(row.status)).reduce((sum, row) => sum + Number(row.total), 0)
  return <section className="k-panel mb-4 p-4" aria-label="Correo de bienvenida">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-bold text-white">Correo de bienvenida</h2>
      <button className="k-button-secondary min-h-11 px-3" disabled={state.loading} onClick={refresh} type="button">Actualizar estado</button>
    </div>
    <div className="mt-2 text-sm text-text-secondary" role="status" aria-live="polite">
      {state.loading ? 'Consultando estado…' : !state.available
        ? 'El estado del correo todavía no está disponible. No asumas que se envió una bienvenida al crear un alumno.'
        : <><p>{total(['queued', 'processing'])} pendientes · {total(['sent'])} aceptados por el proveedor · {total(['failed'])} requieren revisión.</p><p className="mt-1">Un correo aceptado por el proveedor aún puede rebotar o llegar a spam.</p></>}
    </div>
  </section>
}
