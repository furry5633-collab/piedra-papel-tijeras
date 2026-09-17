# ⚡ Piedra, Papel o Tijeras — VS CPU con IA

Juego móvil en **orientación horizontal**: partida **al mejor de 3**, cuenta atrás de **5 segundos**
(con contador gigante en los últimos 3), **monedas**, **tienda de skins** y una **CPU que aprende
de tus patrones** para derrotarte.

## 🧠 La IA de la CPU

La CPU no juega al azar: **te analiza**.

- **Cadena de Markov de orden 2**: observa tus dos últimas jugadas para predecir la siguiente.
- **Cadena de Markov de orden 1**: si eso no basta, mira solo tu última jugada.
- **Análisis de frecuencia**: si tienes un sesgo claro (ej. abusas de la piedra), lo detecta.
- Cuando predice algo, **contrarresta** la jugada prevista. Cuando no hay señal, juega aleatorio
  puro (imposible de leer).
- Su **memoria persiste entre rondas y partidas** (durante la sesión): cuanto más juegues
  con el mismo patrón, más te castigará. Cambia de estrategia para vencerla.

### Dificultades

| Nivel | CPU | "Inteligencia" | Recompensa por victoria |
|---|---|---|---|
| 😎 FÁCIL | CPU NOVATA | contrarresta ~35% de las veces | 🪙 40 |
| 🤖 NORMAL | CPU PRO | contrarresta ~62% | 🪙 75 |
| 👹 DIFÍCIL | CPU DEMONIO | contrarresta ~86% | 🪙 150 |

Cuando la CPU acierta una predicción te lo hace saber: *“🧠 ¡Predijo tu PIEDRA!”*.

## 🚀 Cómo jugar

No necesita instalación ni servidor: **abre `index.html`** en cualquier navegador
(idealmente en el móvil, en horizontal) o publícalo en cualquier hosting estático
(GitHub Pages, Netlify…).

## 📁 Archivos

| Archivo | Descripción |
|---|---|
| `index.html` | Juego completo en un solo archivo (HTML+CSS+JS, sin dependencias) |
| `src/` | Fuentes por partes + `build.py` para regenerar `index.html` |

## 🌐 Publicar en GitHub Pages

1. Sube el contenido del repo a GitHub (rama `main`).
2. **Settings → Pages** → Source: *Deploy from a branch* → `main` / `/ (root)` → **Save**.
3. En 1–2 minutos: `https://TUUSUARIO.github.io/piedra-papel-tijeras/`

## 🛠️ Regenerar index.html tras editar src/

```bash
python3 src/build.py
```
