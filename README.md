# Fragmentos del Portal

Experiencia web 3D inmersiva para celular, hecha con **Three.js** y los sensores del teléfono.
Diseño y Programación Web II · Parcial 2 · Milagros Urssino

## Concepto
Una grieta se abre en tu realidad. Para volver tenés que atravesar tres mundos conectados por portales y recuperar en cada uno un **fragmento azul**. Al final los tres fragmentos se fusionan, se abre el portal de regreso y volvés a tu realidad… aunque algo cruza con vos.

Estilo visual: low-poly facetado (cristales quebrados y peces de caras planas), con una identidad común en todos los mundos: azul para todo lo que tiene que ver con los portales y los fragmentos.

## Mundos y mecánicas
| Mundo | Qué hacés | Sensores |
|---|---|---|
| 0 · La grieta | Una fractura 3D real (hueco extruido con paredes, profundidad, luz interior y escombros) aparece sobre la imagen de tu cámara. Caminás hasta ella y caés adentro. | Cámara (AR), giroscopio |
| 1 · Océano | Desde adentro de un submarino cerrado manejás una garra mecánica: mantené apretado para extenderla hacia donde tocás y soltá para cerrarla. Si no hay un pez entre las pinzas, no se atrapa nada. Con 3 capturas aparece el pez brillante; al atraparlo la cabina se inunda y tenés que contener la respiración (silencio total en el micrófono) hasta que se vacíe. Tocás el fragmento y cruzás el portal con el submarino. | Giroscopio, micrófono, vibración |
| 2 · Museo | El dinosaurio solo se mueve cuando no lo mirás. En la galería armás un rompecabezas 3D de 6 piezas arrastrándolas a mano; cada pieza encaja y queda fija. Recién ahí se habilita el botón rojo físico, que apaga los láseres. El fragmento está a la vista (sin caja) y se recoge al acercarte. | Táctil (raycaster + arrastre), giroscopio, vibración |
| 3 · Casa embrujada | Oscuridad, niebla, linterna, luces que parpadean, puertas que se cierran de golpe, objetos que se mueven, sombras y pasos. Una entidad ciega recorre la casa y va hacia el ruido que capta el micrófono. Buscás 4 números en las paredes, abrís la caja fuerte y la casa se derrumba. | Micrófono (sigilo), giroscopio, vibración |
| Final | Los fragmentos se fusionan solos cuando te acercás al altar. Cruzás el portal y volvés a la cámara real, donde aparece la anomalía. | Cámara (AR) |

No hay botones de confirmación: los portales se cruzan caminando y todas las acciones pasan dentro de la escena 3D.

## Controles
- **Mirar:** mové el celular (giroscopio). Sin giroscopio, arrastrá con el dedo en el lado derecho.
- **Moverse:** arrastrá con el pulgar en la parte inferior izquierda (joystick). En PC: W A S D.
- **Interactuar:** tocá los objetos (botón rojo, perillas de la caja fuerte, fragmentos) o arrastralos (piezas del rompecabezas). En el océano, mantené apretado y soltá para usar la garra.
- **Recentrar la mirada:** el ícono ↻ de abajo a la derecha.

## Permisos
Giroscopio, micrófono y cámara se piden después de tocar **Iniciar experiencia**. Si alguno se rechaza, el juego sigue con alternativas: arrastre para mirar, mantener el dedo apoyado para la respiración y pasos para el sigilo.
**Importante:** los navegadores solo dan acceso a los sensores en páginas **HTTPS** (GitHub Pages, Netlify o Vercel sirven). Si abrís el archivo directamente desde el disco, los sensores no funcionan.

## Optimización mobile
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, con resize y orientación adaptados.
- Geometrías low-poly, texturas generadas por código en canvas (no se descargan imágenes) y sombras solo en las luces clave.
- Solo está cargado el mundo activo: al cruzar un portal se liberan las geometrías, materiales y texturas del anterior.
- El juego se pausa cuando la pestaña queda oculta. Hay un loader mientras carga Three.js.

## Publicación y QR
1. Subí `index.html`, `poster.html` y este README a un repositorio de GitHub y activá **Settings → Pages** (rama `main`, carpeta raíz).
2. Abrí `https://TU-USUARIO.github.io/TU-REPO/poster.html`: genera solo el afiche con el QR que lleva al juego. Desde ahí lo podés imprimir o guardar como PDF.

## Código fuente
El juego publicado es un único `index.html`. El código está separado en módulos dentro de `src/` (núcleo, audio, sensores y controles, entidades compartidas, un archivo por mundo y el bucle principal), y `build.sh` los une en el `index.html` final.

## Créditos
- Three.js r160 (MIT), cargado por CDN.
- Tipografías: Unbounded, Manrope y JetBrains Mono (Google Fonts, licencia OFL).
- Modelos, texturas y sonidos: todos generados por código dentro del proyecto (no se usan assets externos).
- QR: qrcodejs (MIT), solo en `poster.html`.
