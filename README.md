# SignTranslate Backend — Migración a PostgreSQL (Railway)

Este backend fue migrado completamente de `db.json` a **PostgreSQL**, alojado en **Railway**.

## 1. Qué cambió respecto a la versión anterior

| Antes | Ahora |
|---|---|
| Todo en un solo `server.js` (71 líneas) | Arquitectura por capas: `routes/ → controllers/ → services/ → database/` |
| Almacenamiento en `db.json` | PostgreSQL (tablas `users`, `refresh_tokens`, `translations`, `notifications`) |
| Contraseñas con SHA-256 + salt fijo | **bcrypt** (salt único por contraseña, factor de costo 12) |
| Token artesanal (`random.userId`) sin expiración | **JWT** (access token 15 min) + **refresh token** persistente en BD (30 días) |
| Sin login con Google | `POST /api/auth/google` con verificación real de ID Token |
| Sin notificaciones | Módulo completo (`notifications`) con los 5 endpoints que definiste |
| Config hardcodeada (`PORT = 8080`) | Variables de entorno vía `.env` / Railway Variables |

`db.json` fue eliminado por completo. Decidiste empezar limpio, así que los 3 usuarios que tenías ahí **no se migran**; deberán registrarse de nuevo una vez esté en producción.

## 2. Estructura final del proyecto

```
SignTranslateBackend/
├── database/
│   ├── pool.js        # Conexión (pg.Pool) a PostgreSQL
│   ├── schema.sql      # Definición de todas las tablas
│   └── migrate.js      # Script que ejecuta schema.sql
├── src/
│   ├── config/env.js               # Lectura centralizada de variables de entorno
│   ├── middleware/
│   │   ├── auth.js                 # Verifica el JWT en rutas protegidas
│   │   └── errorHandler.js         # Manejo global de errores + 404
│   ├── services/                   # Toda la lógica SQL vive aquí
│   │   ├── userService.js
│   │   ├── tokenService.js
│   │   ├── googleAuthService.js
│   │   ├── notificationService.js
│   │   └── translationService.js
│   ├── controllers/                # Lógica HTTP (request -> service -> response)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── notificationController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   └── notificationRoutes.js
│   └── utils/
│       ├── password.js             # bcrypt
│       ├── jwt.js                  # access + refresh tokens
│       └── validators.js
├── server.js            # Punto de entrada
├── package.json
├── .env.example
├── .gitignore
└── railway.json
```

## 3. Paquetes a instalar

Desde la raíz del proyecto:

```bash
npm install pg dotenv bcrypt jsonwebtoken google-auth-library cors express
npm install --save-dev nodemon
```

(Ya están declarados en `package.json`; con `npm install` a secas basta si usas el `package.json` de este repo).

## 4. Crear el proyecto de PostgreSQL en Railway (desde cero)

1. Ve a [railway.app](https://railway.app) e inicia sesión (puedes usar tu cuenta de GitHub).
2. Click en **"New Project"**.
3. Elige **"Provision PostgreSQL"** (o "Deploy PostgreSQL" según la versión de la UI). Railway crea automáticamente un servicio de base de datos.
4. Entra al servicio de Postgres recién creado → pestaña **"Variables"**. Ahí verás `DATABASE_URL` ya generada, algo como:
   ```
   postgresql://postgres:XXXXXXXX@monorail.proxy.rlwy.net:12345/railway
   ```
5. Copia ese valor completo.

## 5. Conectar tu backend a Railway

1. En el mismo proyecto de Railway, click en **"New"** → **"GitHub Repo"** (si tu backend está en GitHub) o **"Empty Service"** y luego despliega con `railway up` desde la CLI.
2. En el servicio de tu backend (NO el de Postgres) → pestaña **"Variables"**, agrega:
   - `DATABASE_URL` → pega el valor que copiaste en el paso anterior. **Tip:** en Railway puedes usar la referencia `${{Postgres.DATABASE_URL}}` para que se autocomplete y quede siempre sincronizada si la base de datos cambia de host.
   - `JWT_ACCESS_SECRET` → genera uno con:
     ```bash
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
     ```
   - `NODE_ENV` → `production`
   - `GOOGLE_CLIENT_ID` → el Client ID de tu proyecto en Google Cloud Console (lo necesitas para el login con Google; si aún no lo tienes, puedes desplegar sin él y esa ruta simplemente devolverá un error 501 hasta que lo configures).
   - `CORS_ORIGIN` → `*` por ahora, o el dominio/paquete de tu app cuando lo tengas.
3. Railway define su propia variable `PORT` automáticamente — no la sobreescribas, nuestro `server.js` ya lee `process.env.PORT` a través de `src/config/env.js`.

## 6. Ejecutar las migraciones (crear las tablas)

Local (contra la BD de Railway, usando tu `.env` con el `DATABASE_URL` real):

```bash
cp .env.example .env
# edita .env y pega tu DATABASE_URL real de Railway
npm install
npm run migrate
```

Deberías ver algo como:

```
🚀 Iniciando migración de base de datos...
✅ Conexión a PostgreSQL verificada correctamente
📄 Ejecutando schema.sql...
✅ Migración completada. Tablas creadas/verificadas:
   - notifications
   - refresh_tokens
   - translations
   - users
```

### Verificar que las tablas se crearon

Opción A — Railway UI: entra al servicio de Postgres → pestaña **"Data"** → deberías ver las 4 tablas listadas ahí, y puedes navegar sus columnas/filas.

Opción B — `psql` (si lo tienes instalado localmente):

```bash
psql "$DATABASE_URL" -c "\dt"
```

Opción C — vía Railway CLI:

```bash
railway connect postgres
\dt
```

## 7. Levantar el servidor

Local:

```bash
npm run dev      # con nodemon, recarga automática
# o
npm start        # producción local
```

En Railway, una vez tengas las variables configuradas y el código desplegado (push a GitHub o `railway up`), Railway ejecuta automáticamente `npm run start` (definido en `railway.json`) y te da una URL pública tipo `https://tu-backend.up.railway.app`.

Verifica que está viva visitando:

```
GET https://tu-backend.up.railway.app/health
```

Debe responder `{"status":"ok","env":"production"}`.

## 8. Endpoints disponibles

### Autenticación (`/api/auth`)
| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/register` | `{ name, email, password }` | Crea usuario, devuelve accessToken + refreshToken |
| POST | `/login` | `{ email, password }` | Devuelve accessToken + refreshToken |
| POST | `/google` | `{ idToken }` | Login/registro con Google |
| POST | `/refresh` | `{ refreshToken }` | Devuelve un nuevo accessToken |
| POST | `/logout` | `{ refreshToken }` | Revoca el refresh token |
| GET | `/me` | — (requiere `Authorization: Bearer <accessToken>`) | Devuelve el usuario autenticado |

### Usuario (`/api/users`) — todas requieren `Authorization: Bearer <accessToken>`
| Método | Ruta | Body | Descripción |
|---|---|---|---|
| PUT | `/avatar` | `{ avatarId }` | Actualiza la referencia de avatar |
| PUT | `/fcm-token` | `{ fcmToken }` | Guarda el token de FCM del dispositivo |
| POST | `/translations` | `{ detectedWord, confidence }` | Guarda una traducción detectada |
| GET | `/translations?limit=50` | — | Historial de traducciones |

### Notificaciones (`/api/notifications`) — todas requieren `Authorization: Bearer <accessToken>`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Todas las notificaciones del usuario |
| GET | `/unread` | Solo no leídas + contador |
| PUT | `/:id/read` | Marca una como leída |
| PUT | `/read-all` | Marca todas como leídas |
| DELETE | `/:id` | Elimina una notificación |

## 9. Sobre el login con Google (pendiente del lado Android)

Como me confirmaste que Google Sign-In todavía no está integrado en Android, el backend ya está listo para recibirlo (`POST /api/auth/google`), pero del lado de Android faltará:

1. Configurar un **OAuth Client ID** en Google Cloud Console (tipo "Android", con el SHA-1 de tu app) y otro tipo **"Web"** (este último es el que va en `GOOGLE_CLIENT_ID` del backend, porque es el `audience` que Google pone en el ID Token).
2. Integrar **Credential Manager** (`androidx.credentials`) en la app para obtener el ID Token.
3. Mandar ese `idToken` a `POST /api/auth/google`.

Puedo ayudarte con ese lado de Android en otra conversación/paso cuando estés listo.

## 10. Notificaciones — arquitectura preparada para FCM

Por ahora el backend solo persiste notificaciones en PostgreSQL (lo que consultan los endpoints de arriba) y la app maneja las **locales** con `NotificationManager` + `WorkManager`, tal como especificaste.

Ya dejamos la base para el push real:
- `users.fcm_token` guarda el token de cada dispositivo (`PUT /api/users/fcm-token`).
- Cuando quieras implementar el envío real, solo se agrega un servicio `services/pushService.js` que use `firebase-admin` para mandar el mensaje al `fcm_token` guardado — no requiere cambiar nada de lo que ya existe.
