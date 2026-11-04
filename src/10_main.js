/* =====================================================================
   10. GESTOR DE MUNDOS, FLUJO DE PERMISOS Y BUCLE DE ANIMACIÓN
   ===================================================================== */
const WORLDS = {
  intro: { cls: IntroWorld, card: ['MUNDO 00', 'La grieta', 'La realidad se está rompiendo'] },
  ocean: { cls: OceanWorld, card: ['MUNDO 01', 'Océano', 'A bordo del submarino'] },
  museum: { cls: MuseumWorld, card: ['MUNDO 02', 'Museo', 'Las obras no duermen'] },
  hauntedHouse: { cls: HouseWorld, card: ['MUNDO 03', 'Casa embrujada', 'No hagas ruido'] },
  final: { cls: FinalWorld, card: ['FINAL', 'El umbral', 'Tres fragmentos, una salida'] },
  reality: { cls: RealityWorld, card: null },
};
const Game = {
  world: null, busy: false,
  set(w) { this.world = w; Input.world = w; },
  async goto(name) {
    if (this.busy) return; this.busy = true;
    Audio.sfx.whoosh(); haptic([40, 30, 120]); HUD.flash(true); Input.cancelAll();
    await new Promise((r) => setTimeout(r, 650));
    if (this.world) this.world.dispose();                 // libera el mundo anterior
    const def = WORLDS[name]; const w = new def.cls(); w.build();
    State.currentWorld = name; this.set(w); w.enter(); HUD.meter(false); HUD.reticle(false);
    renderer.compile(w.scene, camera);
    setTimeout(() => { HUD.flash(false); if (def.card) HUD.worldCard(...def.card); this.busy = false; }, 250);
  },
};

/* ---------- inicio: pantalla de título + permisos tras el gesto del usuario ---------- */
const title = new TitleScene(); title.build(); Game.set(title); Input.init();
window.addEventListener('pointermove', (e) => { if (Game.world === title) Input.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });

$('startBtn').addEventListener('click', async () => {
  if (State.isInitialized) return; State.isInitialized = true;
  const gyroP = Gyro.request();                         // iOS: debe pedirse dentro del gesto
  Audio.init(); Audio.resume(); Audio.sfx.click();
  $('perm').classList.add('show');
  const st = (id, ok, txt) => { const e = $(id); e.textContent = txt || (ok ? 'ACTIVO' : 'TÁCTIL'); e.className = 'st ' + (ok ? 'ok' : 'no'); };
  const gyro = await gyroP; st('stGyro', gyro, gyro ? 'ACTIVO' : 'TÁCTIL');
  const mic = await Audio.startMic(); State.sensors.micAllowed = mic; st('stMic', mic, mic ? 'ACTIVO' : 'SIN MIC');
  const cam = await CamFeed.start(); State.sensors.cameraAllowed = cam; st('stCam', cam, cam ? 'ACTIVO' : 'SIN AR');
  const notes = [];
  if (!gyro) notes.push('Sin giroscopio: arrastrá con el dedo para mirar.');
  if (!mic) notes.push('Sin micrófono: el sigilo depende de no correr y la respiración, de mantener el dedo apoyado.');
  if (!cam) notes.push('Sin cámara: los portales aparecerán en un espacio virtual.');
  $('permNote').textContent = notes.join(' ');
  // calibración del umbral de ruido con el ambiente real
  if (mic) { let acc = 0, n = 0; const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { Audio.readMic(); acc += State.audioMetrics.volume; n++; if (performance.now() - t0 > 900) { clearInterval(iv); res(); } }, 30); }); State.gameplay.noiseThreshold = clamp(acc / n + 0.16, 0.2, 0.62); }
  HUD.sensors();
  await new Promise((r) => setTimeout(r, notes.length ? 2600 : 900));
  $('perm').classList.remove('show'); $('title').classList.add('hide'); setTimeout(() => ($('title').style.display = 'none'), 1100);
  $('hud').classList.add('show'); HUD.fragments();
  Game.goto('intro');
});

/* ---------- resize / orientación ---------- */
function onResize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight; camera.fov = camera.aspect < 1 ? 78 : 66; camera.updateProjectionMatrix();
  CamFeed.fit();
}
window.addEventListener('resize', onResize); window.addEventListener('orientationchange', () => setTimeout(onResize, 300)); onResize();

/* ---------- pausa cuando la pestaña no está visible ---------- */
let paused = false, gameTime = 0;
document.addEventListener('visibilitychange', () => { paused = document.hidden; if (Audio.ctx) paused ? Audio.ctx.suspend() : Audio.ctx.resume(); if (!paused) clock.getDelta(); });

/* ---------- bucle principal ---------- */
function loop() {
  requestAnimationFrame(loop);
  if (paused) return;
  const dt = Math.min(clock.getDelta(), 0.05); gameTime += dt; const t = gameTime;
  Audio.readMic();
  if (Game.world) { Game.world.update(t, dt); renderer.render(Game.world.scene, camera); }
}
loop();
// precarga de modelos 3D con progreso real; el título aparece cuando terminan (o a los 25 s como máximo)
{ const bar = document.querySelector('.ld-bar'); bar.classList.add('real'); const fill = bar.querySelector('i');
  const hide = () => $('loader').classList.add('hide');
  const to = setTimeout(hide, 25000);
  Assets.load((k) => { fill.style.width = Math.round(k * 100) + '%'; $('ldTxt').textContent = 'CARGANDO MODELOS 3D · ' + Math.round(k * 100) + '%'; })
    .then(() => { clearTimeout(to); setTimeout(hide, 250); }); }
window.__game = { Game, State, Player, Look, camera, THREE, Gyro, Input, Assets,
  step(sec, dt = 1 / 30) { for (let k = 0; k < sec / dt; k++) { gameTime += dt; Game.world.update(gameTime, dt); } } };   // ganchos de depuración
