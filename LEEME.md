# Encancha.ec — Etapas 1 a 4

## Si ya tenías la Etapa 3 funcionando (actualizar a la Etapa 4)

No hay que instalar nada, cambiar `.env` ni republicar reglas.

1. Reemplaza la carpeta `src` y el `LEEME.md` por los de este zip (sin tocar `node_modules` ni `.env`).
2. Reinicia con `npm run dev` y sube los cambios:

```
git add .
git commit -m "Etapa 4: pitar el partido en vivo"
git push
```

### Qué incluye la Etapa 4

En **Hoy**, cada partido tiene el botón **Pitar partido** (luego **Continuar** o **Ver partido**).

- **Alineaciones:** marcas los titulares de cada equipo (por defecto los primeros según los jugadores en cancha de las reglas). Los jugadores expulsados en su último partido, o que acumularon las amarillas de suspensión, aparecen marcados como *Suspendido*.
- **Cronómetro:** iniciar, pausar, reanudar, terminar tiempo, descanso e inicio del siguiente tiempo. Fútbol: el reloj sube y el 2.º tiempo sigue desde el 45:00. Básquet: reloj regresivo que se detiene solo en 00:00. Todo según las reglas del campeonato.
- **Anotaciones:** cada tipo de gol o punto que definiste (en fútbol, con opción de gol en contra), con el jugador que anotó o "sin identificar".
- **Disciplina:** faltas (por jugador y de equipo, con aviso de bonus), tarjetas amarilla y roja (la 2.ª amarilla expulsa), expulsión por límite de faltas.
- **Cambios y tiempos muertos:** con sus límites; el tiempo muerto pausa el reloj y cuenta los segundos.
- **Cronología:** todos los eventos con su minuto; "Deshacer último" y quitar cualquier evento recalcula marcador, alineación y estadísticas.
- **Fin del partido:** si hay empate y se necesita ganador (eliminatoria o deporte sin empates) ofrece tiempo extra o penales. Se puede **reabrir** un partido finalizado para corregirlo.
- Los visitantes ven el partido "En juego" con el marcador en vivo.

---


## Si ya tenías la Etapa 2 funcionando (actualizar a la Etapa 3)

No hay que instalar nada ni cambiar `.env`, y **las reglas de Firestore no cambian** (no hace falta republicarlas).

1. Reemplaza la carpeta `src` y el archivo `LEEME.md` del proyecto por los de este zip. **No copies** `node_modules` ni `.env`.
2. Si la app está corriendo, detén la terminal con `Ctrl + C` y ejecuta `npm run dev`.
3. Para subir los cambios:

```
git add .
git commit -m "Etapa 3: sorteo, calendario y encuentros de hoy"
git push
```

### Qué incluye la Etapa 3

- **Sorteo con ruleta** (barra inferior > Sorteo): la ruleta gira y saca un equipo por vez; también hay "Sorteo rápido".
  - *Sorteo de grupos:* reparte los equipos entre los grupos de forma pareja (solo los que no tienen grupo, o todos).
  - *Sorteo de enfrentamientos:* el orden de salida arma las jornadas. Todos contra todos (con ida y vuelta si el campeonato lo tiene activado) o primera ronda de eliminación directa (si sobran equipos, los primeros pasan directo).
  - El resultado se ve antes de confirmar y se puede repetir.
- **Fechas y horas:** al confirmar eliges primer día, hora, días de la semana (por defecto sábado y domingo), partidos por día, minutos entre partidos y canchas. Todo se puede cambiar después.
- **Calendario** (pestaña dentro de Sorteo): lista por día; editar fecha, hora y cancha de cada partido, agregar partidos a mano, eliminarlos, reprogramar fechas o borrar todo el calendario.
- **Encuentros de hoy:** partidos de hoy, pendientes de días anteriores y próximos. El botón "Pitar partido" se activa en la Etapa 4.
- **Visitantes:** ven el cronograma del campeonato (solo lectura).
- Un equipo con partidos en el calendario no se puede eliminar hasta borrar esos partidos.
- Con "grupos y eliminación directa", las llaves se generarán al terminar la fase de grupos (Etapa 5).

---


## Si ya tenías la Etapa 1 funcionando (actualizar a la Etapa 2)

No necesitas instalar nada nuevo ni cambiar tu archivo `.env`. Solo haz esto:

1. Reemplaza la carpeta `src` y los archivos `firestore.rules` y `LEEME.md` del proyecto por los de este zip. **No copies** `node_modules` ni tu archivo `.env`.
2. En Firebase, entra a **Firestore Database > Reglas**, pega todo el contenido del nuevo `firestore.rules` y pulsa **Publicar**. Es obligatorio: las reglas nuevas protegen los campeonatos para que solo su dueño los modifique.
3. Si la app está corriendo, detén la terminal con `Ctrl + C` y vuelve a ejecutar `npm run dev`.
4. Para subir los cambios a GitHub (y a Vercel):

```
git add .
git commit -m "Etapa 2: campeonatos, grupos, equipos y jugadores"
git push
```

### Qué incluye la Etapa 2

- **Campeonato:** lista de tus campeonatos, asistente de 3 pasos (datos generales, formato y reglas) y pantalla del campeonato con sus grupos y equipos.
- **Deporte:** Fútbol o Básquet. Cada uno trae valores iniciales, pero **todo se puede editar**: número y duración de los tiempos, cronómetro, tiempo extra, formas de anotar y su valor, puntos de la clasificación, criterios de desempate, tarjetas, faltas, sustituciones, tiempos muertos, cantidad y posiciones de los jugadores.
- **Formato:** fase de grupos, todos contra todos, eliminación directa, o grupos y eliminación directa.
- **Logo y color:** el logo se reduce automáticamente y se guarda dentro de la base de datos (no usa Firebase Storage, así no necesitas plan de pago). El color se elige con la paleta de índices de Excel.
- **Equipos y jugadores:** equipos con logo, color, sigla, grupo y director técnico. Jugadores con nombre, número y posición, uno por uno o pegando una lista (también copiada desde Excel).
- **Duplicar campeonato:** crea una nueva edición copiando solo las reglas y grupos, o también los equipos, o todo con los jugadores. Las fechas, los partidos y los resultados no se copian.
- **Lista de equipos** (barra inferior) y **vista pública** para visitantes con los equipos y sus jugadores.

---

## Etapa 1

La primera etapa incluye:

- Pantalla de inicio con acceso para **Administrador** y para **Visitante** (sin registro).
- Solicitud de acceso para administradores, que queda **pendiente** hasta que el super admin la apruebe.
- Panel del **super admin** para aprobar, rechazar o revocar administradores.
- Panel del **administrador** con la barra de píldora inferior y sus 6 secciones (Campeonato, Hoy, Equipos, Posiciones, Resultados, Sorteo). Las secciones se fueron activando en cada etapa.
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

Para probar la Etapa 2, entra como administrador aprobado y en **Campeonato** pulsa **Nuevo campeonato**. Crea uno, agrega un par de equipos, entra a un equipo y agrega jugadores. Luego prueba **Duplicar** desde la lista de campeonatos y mira cómo se ve desde la pestaña **Visitante**.

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
  pages/          Pantallas (Login, Pending, SuperAdmin, AdminLayout, VisitorHome, VisitorTournament)
  pages/admin/    Campeonatos, asistente, panel del campeonato, lista de equipos y detalle de equipo
  components/     Piezas reutilizables (barra de píldora, ventanas, selector de color, logo, reglas)
  context/        Manejo de sesión, roles y campeonato activo
  utils/          Deportes y reglas, paleta de Excel, lectura de listas de jugadores, base de datos
  firebase.js     Conexión con Firebase
public/           Logo e íconos de la app
firestore.rules   Reglas de seguridad de la base de datos
```

## Próxima etapa

**Etapa 5: Clasificación, resultados y PDF.** Tabla de posiciones por grupo, lista de resultados, llaves de eliminación, vista completa del visitante y exportación a PDF (informe del partido con jugadores, goleadores y posiciones).
