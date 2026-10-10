import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Spinner } from './Loader'

// Botón que genera un PDF. La librería de PDF se carga solo al pulsarlo, para no hacer pesada la app.
export default function PdfButton({ label = 'Exportar PDF', make, className = 'btn-outline btn-sm', iconOnly = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const pdf = await import('../utils/pdf')
      await make(pdf)
    } catch (err) {
      console.error(err)
      setError('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={run} disabled={busy} className={className} aria-label={label}>
        {busy ? <Spinner className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
        {!iconOnly && label}
      </button>
      {error && <span role="alert" className="mt-1 text-[12px]">{error}</span>}
    </span>
  )
}
