import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../utils/authErrors'
import { homeFor } from '../utils/routes'
import FullScreenLoader, { Spinner } from '../components/Loader'
import Logo from '../components/Logo'

const TABS = [
  { id: 'admin', label: 'Administrador' },
  { id: 'visitante', label: 'Visitante' }
]

export default function Login() {
  const navigate = useNavigate()
  const { user, profile, profileState, authReady, login, requestAdminAccess, resetPassword, logout } =
    useAuth()

  const [tab, setTab] = useState('admin')
  const [mode, setMode] = useState('login') // login | register | reset
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Si ya hay sesión, enviar a la pantalla que corresponde al rol.
  useEffect(() => {
    if (authReady && user && profileState === 'ready' && profile) {
      navigate(homeFor(profile), { replace: true })
    }
  }, [authReady, user, profile, profileState, navigate])

  const changeMode = (next) => {
    setMode(next)
    setError('')
    setInfo('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else if (mode === 'register') {
        if (name.trim().length < 3) throw { code: 'form/name' }
        await requestAdminAccess({ name, email, password })
      } else {
        await resetPassword(email)
        setInfo('Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.')
      }
    } catch (err) {
      setError(err?.code === 'form/name' ? 'Escribe tu nombre completo.' : friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  if (!authReady || (user && profileState === 'loading')) return <FullScreenLoader />

  const title =
    mode === 'login' ? 'Bienvenido' : mode === 'register' ? 'Solicitar acceso' : 'Recuperar contraseña'
  const subtitle =
    mode === 'login'
      ? 'Ingresa con tu cuenta de administrador.'
      : mode === 'register'
        ? 'Crea tu cuenta. El super admin revisará tu solicitud antes de que puedas crear torneos.'
        : 'Te enviaremos un enlace a tu correo.'

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca (solo escritorio) */}
      <aside className="hidden lg:flex flex-col justify-between bg-ink text-paper p-14">
        <Logo white className="h-16 w-auto self-start" />
        <div>
          <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight">
            Cada partido,
            <br />
            en su cancha.
          </h2>
          <p className="mt-6 max-w-sm text-neutral-400 leading-relaxed">
            Crea torneos de fútbol y básquet, arma el calendario, pita los encuentros en vivo y
            comparte resultados al instante.
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-label text-neutral-500">
          Encancha<span className="text-accent">.</span>ec
        </p>
      </aside>

      <main className="flex min-h-dvh items-start justify-center px-6 py-10 lg:pt-[14vh]">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo className="h-16 w-auto" />
            <p className="mt-4 text-[22px] font-semibold tracking-tight">Encancha.ec</p>
          </div>

          {/* Selector Administrador / Visitante */}
          <div className="grid grid-cols-2 rounded-full border border-ink p-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full py-2.5 text-[13px] font-semibold tracking-wide transition ${
                  tab === t.id ? 'bg-ink text-paper' : 'text-ink hover:bg-neutral-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'visitante' ? (
            <section className="mt-10">
              <h1 className="text-3xl font-semibold tracking-tight">Sigue los torneos</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-mute">
                Consulta el cronograma, los resultados y las posiciones de cada campeonato. No
                necesitas crear una cuenta.
              </p>
              <Link to="/visitante" className="btn-solid mt-8 w-full">
                Ver torneos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          ) : (
            <section className="mt-10">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-mute">{subtitle}</p>

              {user && profileState === 'missing' && (
                <div className="mt-6 rounded-xl border border-ink p-4 text-sm">
                  Tu cuenta no tiene un perfil asignado.{' '}
                  <button onClick={logout} className="font-semibold underline underline-offset-4">
                    Cerrar sesión
                  </button>
                </div>
              )}

              <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
                {mode === 'register' && (
                  <div>
                    <label htmlFor="name" className="label">Nombre completo</label>
                    <input
                      id="name"
                      className="input"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="label">Correo</label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    className="input"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>

                {mode !== 'reset' && (
                  <div>
                    <label htmlFor="password" className="label">Contraseña</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        className="input pr-12"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-mute hover:text-ink"
                        aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <p role="alert" className="border-l-2 border-ink pl-3 text-sm text-ink">
                    {error}
                  </p>
                )}
                {info && <p className="border-l-2 border-accent pl-3 text-sm text-ink">{info}</p>}

                <button type="submit" disabled={busy} className="btn-solid w-full">
                  {busy ? (
                    <Spinner className="h-4 w-4" />
                  ) : mode === 'login' ? (
                    'Ingresar'
                  ) : mode === 'register' ? (
                    'Enviar solicitud'
                  ) : (
                    'Enviar enlace'
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2 text-[13px]">
                {mode === 'login' && (
                  <>
                    <button onClick={() => changeMode('reset')} className="text-mute hover:text-ink">
                      Olvidé mi contraseña
                    </button>
                    <button
                      onClick={() => changeMode('register')}
                      className="font-semibold underline underline-offset-4"
                    >
                      Solicitar acceso como administrador
                    </button>
                  </>
                )}
                {mode !== 'login' && (
                  <button
                    onClick={() => changeMode('login')}
                    className="font-semibold underline underline-offset-4"
                  >
                    Volver a ingresar
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
