# ⚡ Piedra, Papel o Tijeras — Multijugador Online

Juego móvil en **orientación horizontal** con partida **al mejor de 3**, cuenta atrás de **5 segundos**
(con contador gigante en los últimos 3), **multijugador online** con búsqueda de rival,
**monedas** por victoria y **tienda de skins** (guantes, mangas y auras).

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
