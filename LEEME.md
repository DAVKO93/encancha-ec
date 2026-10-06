# Encancha.ec — Etapa 1

Esta primera etapa incluye:

- Pantalla de inicio con acceso para **Administrador** y para **Visitante** (sin registro).
- Solicitud de acceso para administradores, que queda **pendiente** hasta que el super admin la apruebe.
- Panel del **super admin** para aprobar, rechazar o revocar administradores.
- Panel del **administrador** con la barra de píldora inferior y sus 6 secciones (Campeonato, Hoy, Equipos, Posiciones, Resultados, Sorteo). Por ahora cada sección muestra su pantalla vacía; se llenan en las siguientes etapas.
- Vista pública para visitantes.
- App instalable en el celular (PWA), con diseño en blanco y negro y el gris azulado del logo en detalles sutiles.

---

## Paso 1. Revisar Node.js en tu Mac

Abre la Terminal (o la terminal integrada de VS Code) y escribe:

```
node -v
```

Si aparece un número igual o mayor a `v20`, perfecto. Si dice "command not found" o es menor:

```
brew install node
```

(Si tampoco tienes Homebrew, instálalo desde https://brew.sh y repite el comando.)

## Paso 2. Abrir el proyecto

1. Descomprime la carpeta `encancha-ec`.
2. Ábrela en VS Code (Archivo > Abrir carpeta).
3. Abre la terminal de VS Code (menú Terminal > Nueva terminal) y ejecuta:

```
npm install
```

Tarda uno o dos minutos la primera vez.

## Paso 3. Crear el proyecto en Firebase

1. Entra a https://console.firebase.google.com e inicia sesión.
2. **Agregar proyecto** y ponle el nombre `encancha-ec`. Google Analytics puedes dejarlo desactivado.
3. En el menú izquierdo entra a **Compilación > Authentication > Comenzar**. En la pestaña **Sign-in method** activa **Correo electrónico/contraseña** y guarda.
4. En **Compilación > Firestore Database > Crear base de datos**:
   - Ubicación: `southamerica-east1` (São Paulo), la más cercana a Ecuador.
   - Modo: **producción**.
5. Vuelve a la pantalla principal del proyecto, haz clic en el ícono web `</>` para **registrar una app web**, ponle el nombre `Encancha` y copia los valores de `firebaseConfig`.

## Paso 4. Conectar la app con Firebase

1. En la carpeta del proyecto, duplica el archivo `.env.example` y llama la copia `.env`
   (en VS Code: clic derecho sobre `.env.example` > Copiar, luego Pegar y renombrar).
2. Pega cada valor de Firebase en su línea. Ejemplo:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=encancha-ec.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=encancha-ec
VITE_FIREBASE_STORAGE_BUCKET=encancha-ec.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Sin comillas ni espacios.

## Paso 5. Publicar las reglas de seguridad

1. En Firebase, entra a **Firestore Database > Reglas**.
2. Borra lo que haya, pega todo el contenido del archivo `firestore.rules` y pulsa **Publicar**.

Estas reglas son las que impiden que alguien se haga pasar por super admin o se apruebe solo.

## Paso 6. Crear tu usuario de super admin

Se hace una sola vez y a mano, por seguridad.

1. En Firebase: **Authentication > Users > Agregar usuario**. Usa el correo `1odsl.ec@gmail.com` y una contraseña segura. Después de crearlo, copia su **UID** (la columna larga de letras y números).
2. En **Firestore Database > Iniciar colección**:
   - ID de la colección: `users`
   - ID del documento: pega tu **UID**
   - Agrega estos 4 campos, todos de tipo *string*:

| Campo  | Valor                  |
|--------|------------------------|
| name   | David                  |
| email  | 1odsl.ec@gmail.com     |
| role   | superadmin             |
| status | approved               |

3. Guarda.

## Paso 7. Probar la app

En la terminal de VS Code:

```
npm run dev
```

Abre http://localhost:5173 en el navegador.

Prueba esto en orden:

1. Entra como **Administrador** con tu correo de super admin. Debes ver el panel de **Administradores**.
2. Abre una **ventana de incógnito**, ve a la misma dirección y toca **Solicitar acceso como administrador** con otro correo de prueba. Verás la pantalla "Solicitud en revisión".
3. Vuelve a tu ventana de super admin: la solicitud aparece en **Pendientes**. Pulsa **Aprobar**.
4. En la ventana de incógnito la pantalla cambia sola y entra al panel con la barra de píldora inferior.
5. Cierra sesión y prueba la pestaña **Visitante**.

Si algo no funciona, copia el mensaje de error de la terminal o de la consola del navegador y pásamelo.

## Paso 8. Probar la instalación como app (PWA)

La instalación solo funciona con la versión compilada:

```
npm run build
npm run preview
```

Abre la dirección que muestra la terminal. En Chrome verás el ícono de instalar en la barra de direcciones. En el celular, una vez publicada en Vercel:

- **iPhone (Safari):** Compartir > Añadir a pantalla de inicio.
- **Android (Chrome):** menú de tres puntos > Instalar aplicación.

## Paso 9. Publicar en Vercel (cuando quieras)

1. Sube el proyecto a un repositorio de GitHub (el archivo `.env` no se sube; ya está excluido).
2. En https://vercel.com, **Add New > Project**, elige el repositorio. Vercel detecta Vite solo.
3. Antes de desplegar, en **Environment Variables** agrega las mismas 6 variables del archivo `.env`.
4. Cuando termine, copia el dominio que te da Vercel y agrégalo en Firebase: **Authentication > Settings > Dominios autorizados**.

---

## Estructura del proyecto

```
src/
  pages/        Pantallas (Login, Pending, SuperAdmin, AdminLayout, VisitorHome)
  components/   Piezas reutilizables (barra de píldora, logo, rutas protegidas)
  context/      Manejo de sesión y roles
  firebase.js   Conexión con Firebase
public/         Logo e íconos de la app
firestore.rules Reglas de seguridad de la base de datos
```

## Próxima etapa

**Etapa 2: Crear campeonato.** Elección de deporte (fútbol o básquet) con tiempos y reglas editables, y registro de grupos, equipos y jugadores con logo y color.
