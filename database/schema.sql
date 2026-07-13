-- =========================================================================
-- schema.sql — Esquema completo de SignTranslate en PostgreSQL
-- =========================================================================
-- Ejecutar una sola vez (o mediante el script database/migrate.js) contra
-- la base de datos de Railway. Es idempotente: usa IF NOT EXISTS en todo,
-- así que puedes volver a correrlo sin romper nada.
-- =========================================================================

-- pgcrypto nos da gen_random_uuid(), así usamos UUID en vez de IDs
-- numéricos autoincrementales (más seguros: no se pueden adivinar/enumerar).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------------
-- Tabla: users
-- -------------------------------------------------------------------------
-- password_hash es NULLABLE porque un usuario que se registra con Google
-- no tiene contraseña propia.
-- avatar_id: referencia al set de animación de avatar (el sistema de
-- animaciones se genera/administra por fuera de este backend).
-- fcm_token: para cuando se implemente el envío real de push vía FCM.
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(120)  NOT NULL,
    email          VARCHAR(255)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255),
    google_id      VARCHAR(255)  UNIQUE,
    avatar_id      VARCHAR(100),
    fcm_token      VARCHAR(255),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

    -- Un usuario debe tener contraseña propia O estar vinculado a Google
    -- (o ambos, si más adelante vincula Google a una cuenta con password).
    CONSTRAINT users_auth_method_check
        CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

-- -------------------------------------------------------------------------
-- Tabla: refresh_tokens
-- -------------------------------------------------------------------------
-- Permite que el login sea persistente (el usuario no tiene que volver a
-- iniciar sesión cada vez que el access token expira) y permite revocar
-- sesiones (por ejemplo, "cerrar sesión en todos los dispositivos").
-- Guardamos el HASH del token, nunca el token en texto plano.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- -------------------------------------------------------------------------
-- Tabla: translations
-- -------------------------------------------------------------------------
-- Historial de traducciones de señas detectadas por el modelo de IA
-- (el modelo vive fuera de este backend; aquí solo guardamos el resultado
-- que la app envía después de cada detección).
CREATE TABLE IF NOT EXISTS translations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    detected_word   VARCHAR(255) NOT NULL,
    confidence      NUMERIC(5,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_translations_user_id ON translations (user_id);
CREATE INDEX IF NOT EXISTS idx_translations_created_at ON translations (created_at DESC);

-- -------------------------------------------------------------------------
-- Tabla: notifications
-- -------------------------------------------------------------------------
-- type sugerido (validado también en la capa de aplicación):
--   'update'     -> Nueva actualización disponible
--   'new_signs'  -> Nuevas señas disponibles
--   'download'   -> Descarga completada
--   'tip'        -> Consejo del día
--   'reminder'   -> Recordatorio de práctica
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    type        VARCHAR(50) NOT NULL DEFAULT 'general',
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, is_read);

-- -------------------------------------------------------------------------
-- Trigger genérico para mantener updated_at al día en users
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------------------
-- Tabla: dictionary_categories
-- -------------------------------------------------------------------------
-- Cada carpeta de video (Alfabeto, Numeros, Familia, etc.) es una fila
-- aquí. "slug" es el identificador estable que usa el front (ej. en la
-- URL /api/dictionary/categories/:slug/videos); "name" es lo que se
-- muestra en pantalla. icon_key es un identificador libre que tu Compose
-- UI mapea a un ícono local (Tt, #, paleta, etc., como en el mockup).
CREATE TABLE IF NOT EXISTS dictionary_categories (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           VARCHAR(100) NOT NULL UNIQUE,
    name           VARCHAR(150) NOT NULL,
    icon_key       VARCHAR(50),
    display_order  INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dictionary_categories_slug ON dictionary_categories (slug);

-- -------------------------------------------------------------------------
-- Tabla: dictionary_videos
-- -------------------------------------------------------------------------
-- video_url: URL pública de Cloudinary (o el proveedor que uses), lista
-- para pasarle directo a un reproductor (ExoPlayer/Media3).
-- storage_public_id: el public_id que Cloudinary asigna al archivo; lo
-- guardamos para poder borrar/reemplazar el video después sin tener que
-- volver a subir todo.
CREATE TABLE IF NOT EXISTS dictionary_videos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         UUID NOT NULL REFERENCES dictionary_categories(id) ON DELETE CASCADE,
    word                VARCHAR(150) NOT NULL,
    video_url           TEXT NOT NULL,
    thumbnail_url       TEXT,
    storage_public_id   TEXT,
    display_order       INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dictionary_videos_category ON dictionary_videos (category_id);

-- Evita duplicados si vuelves a correr el script de subida masiva:
-- la misma palabra dentro de la misma categoría solo puede existir una vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_videos_category_word
    ON dictionary_videos (category_id, word);
