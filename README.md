# Fragmentos del Portal

Experiencia web 3D inmersiva para celular, hecha con **Three.js** y los sensores del teléfono.
Diseño y Programación Web II · Parcial 2

**Equipo:** Milagros Urssino, Benjamin Azcona, Luna Etcheverry y Valentina Vacca

## Concepto
Una grieta se abre en tu realidad. Para volver tenés que atravesar tres mundos conectados por portales y recuperar en cada uno un **fragmento azul**. Al final los tres fragmentos se fusionan, se abre el portal de regreso y volvés a tu realidad… aunque algo cruza con vos.

Estilo visual: low-poly facetado (cristales quebrados y peces de caras planas), con una identidad común en todos los mundos: azul para todo lo que tiene que ver con los portales y los fragmentos.

## Mundos y mecánicas
| Mundo | Qué hacés | Sensores |
|---|---|---|
| 0 · Tu cuarto | Empezás en el cuarto del protagonista y mirás alrededor en 360° moviendo el celular. La pared cruje, se rompe y se abre una grieta 3D real (hueco extruido con profundidad, luz interior y partículas). Caminás hasta ella y la atravesás. | Giroscopio, vibración |
| 1 · Océano | Una toma exterior muestra el submarino sumergiéndose y pasás a la cabina. Desde adentro de un submarino cerrado manejás una garra mecánica: mantené apretado para extenderla hacia donde tocás y soltá para cerrarla. Si no hay un pez entre las pinzas, no se atrapa nada. Con 3 capturas aparece el pez brillante; al atraparlo la cabina se inunda y tenés que contener la respiración (silencio total en el micrófono) hasta que se vacíe. Tocás el fragmento y cruzás el portal con el submarino. | Giroscopio, micrófono, vibración |
| 2 · Museo | El dinosaurio solo se mueve cuando no lo mirás. En la galería armás un rompecabezas 3D de 6 piezas arrastrándolas a mano; cada pieza encaja y queda fija. Recién ahí se habilita el botón rojo físico, que apaga los láseres. El fragmento está a la vista (sin caja) y se recoge al acercarte. | Táctil (raycaster + arrastre), giroscopio, vibración |
| 3 · Casa embrujada | Oscuridad, niebla, linterna, luces que parpadean, puertas que se cierran de golpe, objetos que se mueven, sombras y pasos. Una entidad fantasma ciega (translúcida, flota y parpadea) recorre la casa y va hacia el ruido que capta el micrófono. Buscás 4 números en las paredes, abrís la caja fuerte y la casa se derrumba. | Micrófono (sigilo), giroscopio, vibración |
| Final | Los fragmentos se fusionan solos cuando te acercás al altar. Cruzás el portal y volvés a la cámara real, donde aparece la anomalía. | Cámara (AR) |

No hay botones de confirmación: los portales se cruzan caminando y todas las acciones pasan dentro de la escena 3D.

## Controles
- **Mirar:** mové el celular (giroscopio). Sin giroscopio, arrastrá con el dedo en el lado derecho.
- **Moverse:** arrastrá con el pulgar en la parte inferior izquierda (joystick). En PC: W A S D.
- **Submarino:** el joystick avanza y gira; mirá hacia arriba para subir y hacia abajo para bajar.
- **Interactuar:** tocá los objetos (botón rojo, perillas de la caja fuerte, fragmentos) o arrastralos (piezas del rompecabezas). En el océano, mantené apretado y soltá para usar la garra.
- **Recentrar la mirada:** el ícono ↻ de abajo a la derecha.

## Permisos
Giroscopio, micrófono y cámara se piden después de tocar **Iniciar experiencia**. Si alguno se rechaza, el juego sigue con alternativas: arrastre para mirar, mantener el dedo apoyado para la respiración y pasos para el sigilo.
**Importante:** los navegadores solo dan acceso a los sensores en páginas **HTTPS** (GitHub Pages, Netlify o Vercel sirven). Si abrís el archivo directamente desde el disco, los sensores no funcionan.

## Optimización mobile
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, con resize y orientación adaptados.
- Modelos glTF optimizados con gltf-transform: mallas simplificadas y comprimidas con **meshopt** y texturas en **WebP** de 512 px como máximo. Los 6 modelos pasaron de 45 MB a unos 2,5 MB (el esqueleto, de 180.000 a 21.000 triángulos).
- El resto de la escena es geometría low-poly procedural con texturas generadas en canvas, y sombras solo en las luces clave.
- Si un modelo no carga, ese objeto usa su versión procedural y el juego sigue funcionando.
- Solo está cargado el mundo activo: al cruzar un portal se liberan las geometrías, materiales y texturas del anterior.
- El juego se pausa cuando la pestaña queda oculta. El loader muestra el porcentaje real de descarga de los modelos 3D.

## Publicación y QR
- **Juego publicado (GitHub Pages):** https://mpurss.github.io/fragmentos/
- **Afiche con el QR e instrucciones:** https://mpurss.github.io/fragmentos/poster.html (se imprime o se guarda como PDF desde el navegador).
- **QR en alta resolución:** `qr-fragmentos.png` (2000 × 2000 px) y la gráfica `afiche-qr.png`.
- **Repositorio:** https://github.com/mpurss/fragmentos

Para publicarlo de nuevo: en el repositorio, **Settings → Pages**, rama `main`, carpeta `/ (root)`.

## Código fuente
El juego publicado es un `index.html` más la carpeta `models/` con los modelos 3D. El código está separado en módulos dentro de `src/` (núcleo, audio, sensores y controles, carga de modelos `03b_assets.js`, entidades compartidas, un archivo por mundo y el bucle principal), y `build.sh` los une en el `index.html` final.

## Créditos
- Three.js r160 (MIT), cargado por CDN.
- Tipografías: Unbounded, Manrope y JetBrains Mono (Google Fonts, licencia OFL).
- Sonidos, texturas de paredes y pisos, portales, grietas y el resto de la escena: generados por código dentro del proyecto.
- Modelos 3D de Sketchfab (optimizados para mobile, sin otros cambios de forma):

| Modelo | Autor | Licencia | Uso en el juego |
|---|---|---|---|
| [Bedroom (Low Poly) FREE](https://sketchfab.com/3d-models/bedroom-low-poly-free-b399487c55c949b4ad6aadd02544f02b) | VX-Designs | CC BY 4.0 | Cuarto del protagonista |
| [fish](https://sketchfab.com/3d-models/fish-f818484ff04e47a7ace688faa5015a55) | konstaintin | CC BY 4.0 | Peces del océano (teñidos por especie) |
| [Yellow Submarine](https://sketchfab.com/3d-models/yellow-submarine-0dcb53b8f0734509a83a51e672d27dc4) | Landon Wright | CC BY 4.0 | Exterior del submarino |
| [Allosaurus skeleton](https://sketchfab.com/3d-models/allosaurus-skeleton-2193dcd84b694f659719b4b99c91228b) | Olof Moleman | CC BY-NC 4.0 (uso no comercial) | Esqueleto del museo |
| [Gaunt Horror Creature](https://sketchfab.com/3d-models/gaunt-horror-creature-free-creepy-3d-model-22a418d047764a23b73b539686b988c6) | PurplePoint | CC BY 4.0 | Entidad fantasma de la casa (material translúcido propio) |
| [Frozen Crystal, LowPoly](https://sketchfab.com/3d-models/frozen-crystal-lowpoly-game-ready-daaa5faac85342a6a877f54c8bb79d70) | kEam | CC BY 4.0 | Fragmentos azules |
- QR: qrcodejs (MIT), solo en `poster.html`.
