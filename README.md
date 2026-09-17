# ⚡ Piedra, Papel o Tijeras — Multijugador Online

Juego móvil en **orientación horizontal** con partida **al mejor de 3**, cuenta atrás de **5 segundos**
(con contador gigante en los últimos 3), **multijugador online** con búsqueda de rival,
**monedas** por victoria y **tienda de skins** (guantes, mangas y auras).

## 🌐 Publicar en GitHub Pages

**A) Desde la web, sin comandos (lo más fácil)**
1. Entra en [github.com/new](https://github.com/new) → nombre `piedra-papel-tijeras` → Público → **Create repository** (sin añadir README).
2. En la página del repo pulsa *"uploading an existing file"* y **arrastra todo el contenido** de esta carpeta (`index.html`, `server.js`, `README.md` y la carpeta `src/`) → **Commit changes**.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `/ (root)` → **Save**.
4. En 1–2 minutos estará en `https://TUUSUARIO.github.io/piedra-papel-tijeras/`

**B) Con git**
```bash
cd piedra-papel-tijeras
git init -b main && git add -A && git commit -m "⚡ PPT multijugador"
git remote add origin https://github.com/TUUSUARIO/piedra-papel-tijeras.git
git push -u origin main
# después: Settings → Pages → main / (root)
```

**C) Con GitHub CLI**
```bash
gh repo create piedra-papel-tijeras --public --source=. --push
gh api repos/{owner}/piedra-papel-tijeras/pages -f 'source[branch]'=main -f 'source[path]=/'
```

> ⚠️ **Nota**: GitHub Pages solo sirve archivos estáticos → el modo **VS CPU, menú
> y tienda funcionan perfectos**, pero el **multijugador online necesita `server.js`**
> (el juego lo detecta y muestra el aviso correspondiente). Para jugar online,
> ejecuta `node server.js` en cualquier máquina con Node.js.

## 🚀 Cómo ejecutarlo

```bash
node server.js        # sirve el juego + servidor multijugador en el puerto 8000
```

Abre `http://localhost:8000` (o la URL del servidor) en el móvil, en horizontal.
Para probar el multijugador necesitas **dos dispositivos/pestañas** a la vez.

> El archivo `index.html` también funciona solo (modo VS CPU y tienda) abriéndolo
> directamente, pero el modo online requiere el servidor.

## 📁 Archivos

| Archivo | Descripción |
|---|---|
| `index.html` | Cliente completo (HTML+CSS+JS en un solo archivo, sin dependencias) |
| `server.js` | Servidor Node sin dependencias: estático + WebSockets + matchmaking + arbitraje |
| `src/` | Fuentes del cliente por partes + `build.py` para regenerar `index.html` |

## 🎮 Reglas del modo online

- Al pulsar **🌐 MULTIJUGADOR** entras en la cola; si hay otro jugador esperando, os empareja.
- Si a los **12 segundos** no hay nadie, avisa: *"Nadie más está jugando ahora mismo"*.
- El **servidor arbitra** cada ronda: valida las elecciones, rellena aleatorio si alguien
  no elige, calcula el resultado y sincroniza la siguiente ronda.
- Primero en ganar **2 rondas** gana la partida. Los empates no puntúan.
- 🪙 **+200 monedas** por ganar online, **+75** contra la CPU. Si el rival abandona, victoria.

## 🛠️ API interna

- `GET /health` → `{ ok, clients, waiting, matches }` (estado del servidor).
