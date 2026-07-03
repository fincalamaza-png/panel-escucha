# Mapa Completo — PANEL DE ESCUCHA (Cerdos & Rosas + Don Fadrique)
*Última actualización: Julio 2026*
*⚠️ LEER ANTES DE MODIFICAR LAS APPS O EL BACKEND*

---

## QUÉ ES

Dos apps móviles de comunicación + un backend, para:
1. **Rastrear noticias de prensa** (Google News RSS) sobre los temas de cada marca. Automático, cada 2 h.
2. **Redactar comentarios** en la voz adecuada (vía Groq) para publicarlos a mano en redes.

⚠️ **NO publica nada en redes sociales.** Solo rastrea prensa y redacta borradores. Publicar es manual (a propósito: protege las cuentas y cumple las normas de las plataformas).
⚠️ **No puede leer posts de Instagram/X/Facebook** (las plataformas lo bloquean). Solo prensa vía RSS.

---

## URLS DE ACCESO

| Qué | URL |
|-----|-----|
| App Cerdos & Rosas | https://escucha.palaciocondealdana.com/cerdos-y-rosas.html |
| App Don Fadrique | https://escucha.palaciocondealdana.com/don-fadrique.html |
| Salud del backend | https://escucha.palaciocondealdana.com/health |
| API noticias | https://escucha.palaciocondealdana.com/api/news?app=cr (o app=df) |
| API temas | https://escucha.palaciocondealdana.com/api/topics?app=cr (o app=df) |

**Para móvil:** abrir la URL → menú navegador → "Añadir a pantalla de inicio".

---

## INFRAESTRUCTURA — DÓNDE VIVE CADA COSA

| Pieza | Dónde | Detalle |
|-------|-------|---------|
| Código fuente | **GitHub** | https://github.com/fincalamaza-png/panel-escucha (PÚBLICO) |
| Backend (servidor) | **Easypanel** | Proyecto `hotel` → servicio `panel-escucha` |
| Dominio | **Hostinger DNS** | `escucha` → A → 72.61.160.67 |
| Enrutado + SSL | **Traefik** | Automático (como los demás subdominios) |
| IA (comentarios) | **Groq** | API gratuita, clave en variables de Easypanel |
| Noticias | **Google News RSS** | Gratis, sin clave |

- **Puerto interno del servicio:** 3006
- **Contenedor Docker:** `hotel_panel-escucha` (Swarm)
- **Ruta del código en el servidor:** `/etc/easypanel/projects/hotel/panel-escucha/code/`
- **Ruta dentro del contenedor:** `/app/`

---

## VARIABLES DE ENTORNO (en Easypanel → servicio → Entorno)

```
GROQ_API_KEY=gsk_...            (clave de Groq, https://console.groq.com)
ALLOWED_ORIGINS=https://escucha.palaciocondealdana.com
MODEL=llama-3.3-70b-versatile
PORT=3006
```

⚠️ La clave de Groq vive SOLO aquí, nunca en los HTML.

---

## ARCHIVOS DEL REPOSITORIO GitHub

| Archivo | Qué es |
|---------|--------|
| `server.js` | Backend: rastreo de noticias + proxy Groq + gestión de temas + sirve los HTML |
| `cerdos-y-rosas.html` | App de la marca (voces: Manuel, Nicolás, C&R) |
| `don-fadrique.html` | App del restaurante (voces: Cocina, Sala, La casa) |
| `package.json` | Dependencias (express, cors, node-cron, rss-parser) |
| `README.md` | Documentación básica |

⚠️ **NOMBRES EXACTOS:** deben llamarse así, sin "(1)" ni traducciones. Al descargar del
navegador a veces se renombran solos (`servidor.js`, `paquete.json`, `LÉAME.md`,
`cerdos-y-rosas (1).html`). SIEMPRE verificar los nombres en GitHub tras subir.

---

## CÓMO MODIFICAR LAS APPS (procedimiento probado)

El backend se despliega **desde GitHub**. Editar en el servidor "en caliente" NO
sirve: se pierde en cada reinicio/reconstrucción (Swarm revive la imagen). La única
vía permanente es: **cambiar en GitHub → Deploy en Easypanel.**

### Pasos:
1. Editar el archivo (`server.js`, `cerdos-y-rosas.html` o `don-fadrique.html`).
2. Subirlo a GitHub (repositorio `panel-escucha`), reemplazando el viejo.
   - Mejor: **borrar el viejo** (papelera) y **subir el nuevo por arrastre** (Add file → Upload files).
   - ⚠️ Comprobar que el nombre queda EXACTO (sin "(1)").
3. En Easypanel → servicio `panel-escucha` → **Implementaciones** → **Deploy**.
   - Un deploy bueno tarda 1-2 min. Si tarda 2-4 segundos, FALLÓ (mirar causa).
4. Comprobar en el navegador que el cambio aparece.

### Verificar que GitHub tiene la versión correcta (desde SSH):
```bash
# ¿el server.js de GitHub tiene la función que esperas? (ejemplo: api/topics)
curl -s https://raw.githubusercontent.com/fincalamaza-png/panel-escucha/main/server.js | grep -c api/topics
# ¿los HTML tienen la pestaña temas?
curl -s https://raw.githubusercontent.com/fincalamaza-png/panel-escucha/main/cerdos-y-rosas.html | grep -c tab-temas
```
Si devuelve 0, GitHub NO tiene la versión buena (revisar nombre/subida).

---

## GESTIÓN DE TEMAS DE PRENSA (sin tocar código)

Desde la app, pestaña **Temas**: añadir/quitar búsquedas. Se guardan en
`/app/topics.json` dentro del contenedor y el rastreador los recoge al momento.

⚠️ `topics.json` vive dentro del contenedor. Si se **reconstruye** la imagen, los
temas vuelven a los de por defecto del `server.js` (constante `DEFAULT_TOPICS`).
Para cambios permanentes de los temas por defecto, editar `DEFAULT_TOPICS` en
`server.js` y subir a GitHub.

---

## COMANDOS ÚTILES (SSH: ssh root@72.61.160.67)

⚠️ En el cmd de Windows el pegado con Ctrl+V DUPLICA los comandos. Usar **clic
derecho** para pegar, o envolver en `bash -c "..."` (aguanta la duplicación).

```bash
# Ver el contenedor del panel
docker ps | grep escucha

# Ver logs del servicio
docker service logs hotel_panel-escucha --tail 40

# Reiniciar el servicio (seguro, no toca otros)
bash -c "docker service update --force hotel_panel-escucha"

# Comprobar que responde
curl -s https://escucha.palaciocondealdana.com/health

# Ver noticias / temas
curl -s "https://escucha.palaciocondealdana.com/api/news?app=cr"
curl -s "https://escucha.palaciocondealdana.com/api/topics?app=cr"

# Forzar recarga de noticias
curl -s -X POST https://escucha.palaciocondealdana.com/api/refresh
```

---

## ESTRUCTURA DE LAS APPS (para editar el frontend)

Cada HTML es autónomo (HTML+CSS+JS en un archivo). Config arriba del `<script>`:
```js
const BACKEND_URL = "https://escucha.palaciocondealdana.com";
const APP_KEY = "cr";   // "cr" en cerdos-y-rosas, "df" en don-fadrique
```

**Pestañas:** Novedades, Comentar, Seguir, Registro, Temas.
**Datos locales del usuario** (lista de seguimiento, registro de comentarios) se
guardan en `localStorage` del navegador (prefijo `cr_` / `df_`). NO usar
localStorage para nada que deba compartirse entre dispositivos.

**Voces** (definidas en cada HTML, objeto `voiceBrief`):
- Cerdos & Rosas: Manuel (oficio/curación), Nicolás (cocina), Cerdos & Rosas (producto).
- Don Fadrique: Cocina (técnica), Sala (servicio/vino), Don Fadrique (la casa).

Para cambiar cómo suena una voz: editar el texto en `voiceBrief` del HTML → subir a GitHub → Deploy.

---

## API DEL BACKEND (endpoints)

| Método | Ruta | Qué hace |
|--------|------|----------|
| GET | `/health` | Estado |
| GET | `/api/news?app=cr\|df` | Noticias rastreadas |
| POST | `/api/refresh` | Fuerza recarga de noticias |
| GET | `/api/topics?app=cr\|df` | Lista de temas |
| POST | `/api/topics/add` | Añade tema `{app, topic}` |
| POST | `/api/topics/remove` | Quita tema `{app, topic}` |
| POST | `/api/generate` | Genera comentarios `{voiceBrief, who, post}` (usa Groq) |
| GET | `/cerdos-y-rosas.html` `/don-fadrique.html` `/` | Sirve las apps |

---

## PARA CREAR UNA APP NUEVA (tercera marca, etc.)

Opción más simple: reutilizar este mismo backend.
1. Duplicar un HTML, cambiar `APP_KEY` a una clave nueva (p. ej. `"xx"`), branding y voces.
2. En `server.js`: añadir la clave nueva en `DEFAULT_TOPICS`, en `cache`, en `refreshAll()`,
   y en la ruta que sirve el HTML.
3. Subir a GitHub → Deploy.
No hace falta otro dominio ni otro servicio; todo cuelga de `escucha.palaciocondealdana.com`.

---

## REGLAS DE ORO (de este sistema)

1. **Modificar SIEMPRE vía GitHub + Deploy.** Nunca editar en caliente y esperar que dure.
2. **Verificar nombres de archivo en GitHub** tras subir (sin "(1)" ni traducciones).
3. **Reconstruir este servicio es seguro** (no tiene base de datos). No afecta a hotel/TPV/restaurante.
4. **La clave de Groq** solo en variables de Easypanel, jamás en los HTML.
5. **Publicar en redes = manual.** El sistema no automatiza publicaciones (ni debe).
6. En el cmd, **pegar con clic derecho** o usar `bash -c "..."` para evitar duplicados.
