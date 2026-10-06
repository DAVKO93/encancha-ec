export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Cargando"
    />
  )
}

export default function FullScreenLoader() {
  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-ink">
        <img src="/logo.png" alt="" className="h-14 w-auto opacity-90" />
        <Spinner className="h-4 w-4" />
      </div>
    </div>
  )
}
