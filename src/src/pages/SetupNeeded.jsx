import Logo from '../components/Logo'

// Se muestra solo si todavía no se pegaron las claves de Firebase en el archivo .env
export default function SetupNeeded() {
  return (
    <div className="min-h-dvh grid place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Logo className="h-14 w-auto" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Falta conectar Firebase</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute">
          La app está lista, pero todavía no tiene las claves de tu proyecto de Firebase.
        </p>
        <ol className="mt-6 space-y-3 text-[15px] leading-relaxed">
          <li className="flex gap-3">
            <span className="font-semibold">1.</span>
            <span>
              Duplica el archivo <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px]">.env.example</code> y
              llámalo <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px]">.env</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold">2.</span>
            <span>Pega los valores de tu proyecto de Firebase en cada línea.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold">3.</span>
            <span>
              Detén la app en la terminal (<code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px]">Ctrl + C</code>) y
              vuelve a ejecutar <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px]">npm run dev</code>
            </span>
          </li>
        </ol>
        <p className="mt-6 text-sm text-mute">El archivo LEEME.md explica cada paso con más detalle.</p>
      </div>
    </div>
  )
}
