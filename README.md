# Panel de escucha — Cerdos & Rosas y Don Fadrique

Dos apps móviles de comunicación y un backend. Sirve para:

1. **Ver de un vistazo las noticias** que la prensa publica sobre vuestros temas (rastreo automático, se actualiza solo).
2. **Redactar comentarios** en la voz adecuada para publicarlos en redes.

**Importante:** la herramienta NO publica nada en Instagram ni X. Las noticias las
rastrea sola; los comentarios los redacta la app, pero los publicas tú a mano.
Esto es a propósito: protege las cuentas reales y cumple las normas de las plataformas.

---

## Qué hay en la carpeta

```
backend/            → el servicio que va en Easypanel
  server.js
  package.json
apps/               → las dos apps que van en GitHub Pages
  cerdos-y-rosas.html
  don-fadrique.html
```

---

## PARTE 1 — Backend en Easypanel

1. Sube la carpeta `backend/` a un repositorio de GitHub (puede ser el mismo que
   las apps, en una subcarpeta).
2. En Easypanel: **Create → App → desde repositorio de GitHub**, apunta a la carpeta `backend`.
3. Easypanel detecta Node. Comando de arranque: `npm start`.
4. En **Environment / Variables de entorno**, añade:
   - `ANTHROPIC_API_KEY` = tu clave de Anthropic (empieza por `sk-ant-...`).
   - `ALLOWED_ORIGINS` = la URL de tus apps en GitHub Pages
     (p. ej. `https://tuusuario.github.io`). Puedes poner varias separadas por comas.
   - (opcional) `MODEL` = `claude-sonnet-5` (por defecto) o `claude-haiku-4-5-20251001` (más barato).
5. Despliega. Easypanel te dará una URL pública, p. ej.
   `https://panel-backend-xxxx.easypanel.host`. **Guárdala.**
6. Comprueba que vive: abre esa URL + `/health` en el navegador. Debe responder `{"ok":true,...}`.

La clave de Anthropic vive SOLO aquí, nunca en las apps.

---

## PARTE 2 — Conectar las apps

En cada archivo de `apps/`, arriba del todo del `<script>`, verás:

```js
const BACKEND_URL = "";
```

Pega ahí la URL del backend (sin barra final):

```js
const BACKEND_URL = "https://panel-backend-xxxx.easypanel.host";
```

Guarda los dos archivos.

---

## PARTE 3 — Apps en GitHub Pages

1. Crea un repositorio (o usa el mismo) y sube los dos HTML de `apps/`.
2. **Settings → Pages → Source: rama `main`, carpeta `/root`** (o donde estén).
3. GitHub te dará una URL, p. ej. `https://tuusuario.github.io/panel/`.
4. Abre en el móvil:
   - `https://tuusuario.github.io/panel/cerdos-y-rosas.html`
   - `https://tuusuario.github.io/panel/don-fadrique.html`
5. En cada una: menú del navegador → **Añadir a pantalla de inicio**. Ya las tienes como apps.

Recuerda que la URL de GitHub Pages debe coincidir con lo que pusiste en `ALLOWED_ORIGINS`.

---

## Uso diario

- Abres la app → pestaña **Novedades**: ahí está lo último sin buscar nada.
- ¿Merece comentario? Vas a **Comentar**, pegas el post, eliges voz, copias la propuesta y la publicas tú en la red.
- **Seguir**: tu lista de cuentas y temas. **Registro**: lo que ya comentaste.

## Coste

- GitHub Pages: gratis.
- Easypanel: lo que ya pagues por tu VPS.
- API de Anthropic: se paga por uso. Unos comentarios al día son céntimos.
  El rastreo de noticias no usa la API (es RSS gratuito).

## Editar los temas que se rastrean

En `backend/server.js`, busca `const TOPICS`. Edita las listas `cr` y `df`
con las búsquedas que quieras. Reinicia el servicio en Easypanel.
