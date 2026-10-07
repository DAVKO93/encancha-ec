import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { fileToLogo } from '../utils/image'
import TeamBadge from './TeamBadge'
import { Spinner } from './Loader'

export default function LogoPicker({ value, onChange, preview, size = 256 }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setBusy(true)
    try {
      onChange(await fileToLogo(file, size))
    } catch (err) {
      setError(err.message || 'No se pudo cargar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <TeamBadge item={{ ...preview, logo: value }} size={72} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="btn-outline btn-sm">
            {busy ? <Spinner className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            {value ? 'Cambiar logo' : 'Subir logo'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} className="btn-ghost btn-sm">
              <Trash2 className="h-4 w-4" />
              Quitar
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {error && (
        <p role="alert" className="mt-3 border-l-2 border-ink pl-3 text-sm">
          {error}
        </p>
      )}
      <p className="mt-3 text-[12px] text-mute">
        Se reduce automáticamente. Si no subes uno, se usa el color con las iniciales.
      </p>
    </div>
  )
}
