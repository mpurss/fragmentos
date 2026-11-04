/* =====================================================================
   3. SENSORES Y CONTROLES: giroscopio (con lerp), cámara AR, táctil
   ===================================================================== */
const Gyro = {
  active: false, raw: new THREE.Quaternion(), smooth: new THREE.Quaternion(), has: false,
  yaw: 0, pitch: 0, yawOffset: 0, screen: 0,
  _e: new THREE.Euler(), _q1: new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), _q0: new THREE.Quaternion(), _z: new THREE.Vector3(0, 0, 1),
  async request() {
    let ok = true;
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ (y Chrome reciente también la expone): si falla o la niega, igual escuchamos
        // los eventos: en muchos Android llegan aunque la promesa diga otra cosa.
        try { ok = (await DeviceOrientationEvent.requestPermission()) === 'granted'; } catch (e) { ok = false; }
      }
      if (typeof DeviceOrientationEvent === 'undefined') return false;
      window.addEventListener('deviceorientation', (e) => this.onEvent(e), true);
      window.addEventListener('deviceorientationabsolute', (e) => this.onEvent(e, true), true); // respaldo Android
      window.addEventListener('orientationchange', () => (this.screen = (screen.orientation ? screen.orientation.angle : window.orientation) || 0));
      this.screen = (screen.orientation ? screen.orientation.angle : window.orientation) || 0;
      if (!ok) await new Promise((r) => setTimeout(r, 600));   // ¿llegó algún evento igual?
      return ok || this.active;
    } catch (e) { return false; }
  },
  onEvent(e, abs = false) {
    if (e.alpha == null && e.beta == null) return;
    if (abs) { if (this.relOk) return; } else if (e.alpha != null) { if (!this.relOk && this.has) this.has = false; this.relOk = true; } else if (this.absOk) return;
    if (abs) this.absOk = true;
    const D = THREE.MathUtils.DEG2RAD;
    State.orientationData.alpha = e.alpha || 0; State.orientationData.beta = e.beta || 0; State.orientationData.gamma = e.gamma || 0;
    this._e.set((e.beta || 0) * D, (e.alpha || 0) * D, -(e.gamma || 0) * D, 'YXZ');
    this.raw.setFromEuler(this._e); this.raw.multiply(this._q1); this.raw.multiply(this._q0.setFromAxisAngle(this._z, -this.screen * D));
    if (!this.has) { this.smooth.copy(this.raw); this.has = true; this.update(1); this.yawOffset = this.yaw; }
    if (!this.active) { this.active = true; State.sensors.gyroscopeAllowed = true; HUD.sensors(); }
  },
  update(dt) {
    if (!this.has) return;
    this.smooth.slerp(this.raw, 1 - Math.exp(-14 * dt));           // suavizado (lerp esférico)
    this._e.setFromQuaternion(this.smooth, 'YXZ');
    this.yaw = this._e.y; this.pitch = this._e.x;
  },
  recenter() { this.yawOffset = this.yaw; },
};

const CamFeed = {
  video: null, texture: null, ok: false,
  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const v = document.createElement('video'); v.playsInline = true; v.muted = true; v.setAttribute('playsinline', ''); v.srcObject = stream;
      await v.play(); this.video = v;
      this.texture = new THREE.VideoTexture(v); this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.userData.keep = true;
      this.ok = true; return true;
    } catch (e) { return false; }
  },
  /** ajusta la textura para cubrir la pantalla sin deformarse */
  fit() {
    if (!this.texture || !this.video || !this.video.videoWidth) return;
    const va = this.video.videoWidth / this.video.videoHeight, sa = innerWidth / innerHeight;
    if (va > sa) { this.texture.repeat.set(sa / va, 1); this.texture.offset.set((1 - sa / va) / 2, 0); }
    else { this.texture.repeat.set(1, va / sa); this.texture.offset.set(0, (1 - va / sa) / 2); }
  },
};

/* ---------- Mirada y movimiento del jugador ---------- */
const Look = { dragYaw: 0, dragPitch: 0, baseYaw: 0, yaw: 0, pitch: 0, maxPitch: 1.35 };
function applyLook(dt, target = camera) {
  Gyro.update(dt);
  let yaw = Look.baseYaw + Look.dragYaw, pitch = Look.dragPitch;
  if (Gyro.active) { yaw += Gyro.yaw - Gyro.yawOffset; pitch = Gyro.pitch + Look.dragPitch * 0.5; }
  Look.yaw = yaw; Look.pitch = clamp(pitch, -Look.maxPitch, Look.maxPitch);
  target.rotation.set(Look.pitch, Look.yaw, 0, 'YXZ');
}

const Input = {
  joy: new THREE.Vector2(), keys: {}, pointers: new Map(), world: null, walkEnabled: false,
  ndc: new THREE.Vector2(),
  init() {
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
    $('recenter').addEventListener('pointerdown', (e) => { e.stopPropagation(); Gyro.recenter(); Look.dragYaw = 0; Look.dragPitch = 0; HUD.toast('Mirada recentrada', 1200); });
  },
  toNdc(e) { return new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); },
  down(e) {
    Audio.resume();
    const p = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), kind: 'look', moved: 0 };
    const ndc = this.toNdc(e);
    const jz = (this.world && this.world.joyZone) || { x: 0.42, y: 0.5 };
    if (this.walkEnabled && e.clientX < innerWidth * jz.x && e.clientY > innerHeight * jz.y && ![...this.pointers.values()].some((q) => q.kind === 'joy')) {
      p.kind = 'joy'; const j = $('joy'); j.style.display = 'block'; j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; $('joyHint').style.opacity = 0;
    } else if (this.world && this.world.onPointerDown && this.world.onPointerDown(ndc, e)) {
      p.kind = 'world';
    }
    this.pointers.set(e.pointerId, p);
  },
  move(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.sx, e.clientY - p.sy));
    if (p.kind === 'joy') {
      const R = 52; let jx = (e.clientX - p.sx) / R, jy = (e.clientY - p.sy) / R; const l = Math.hypot(jx, jy); if (l > 1) { jx /= l; jy /= l; }
      this.joy.set(jx, jy); $('joy').firstElementChild.style.transform = `translate(${jx * R}px,${jy * R}px)`;
    } else if (p.kind === 'world') {
      this.world.onPointerMove && this.world.onPointerMove(this.toNdc(e), e);
    } else {
      Look.dragYaw -= dx * 0.0048; if (!Gyro.active) Look.dragPitch = clamp(Look.dragPitch - dy * 0.004, -1.3, 1.3);
    }
  },
  up(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return; this.pointers.delete(e.pointerId);
    if (p.kind === 'joy') {
      this.joy.set(0, 0); $('joy').style.display = 'none'; $('joy').firstElementChild.style.transform = '';
      if (p.moved < 12 && performance.now() - p.t < 350) this.world && this.world.onTap && this.world.onTap(this.toNdc(e), e); // un toque corto en la zona del joystick sigue siendo un toque
    }
    else if (p.kind === 'world') { this.world.onPointerUp && this.world.onPointerUp(this.toNdc(e), e); }
    else if (p.moved < 12 && performance.now() - p.t < 450) { this.world && this.world.onTap && this.world.onTap(this.toNdc(e), e); }
  },
  /** vector de movimiento combinado (joystick táctil + teclado en PC) */
  moveVec() {
    const v = this.joy.clone();
    if (this.keys.KeyW || this.keys.ArrowUp) v.y -= 1; if (this.keys.KeyS || this.keys.ArrowDown) v.y += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) v.x -= 1; if (this.keys.KeyD || this.keys.ArrowRight) v.x += 1;
    if (v.length() > 1) v.normalize();
    if (!this.keys.ShiftLeft && !this.keys.ShiftRight && (this.joy.lengthSq() === 0)) v.multiplyScalar(0.75); // teclado: caminar (Shift = correr)
    return v;
  },
  cancelAll() { this.pointers.clear(); this.joy.set(0, 0); $('joy').style.display = 'none'; },
};

const ray = new THREE.Raycaster();
function pick(ndc, objects, recursive = true) { ray.setFromCamera(ndc, camera); return ray.intersectObjects(objects, recursive)[0] || null; }

/** Jugador caminante con colisiones contra cajas (AABB) */
const Player = {
  pos: new THREE.Vector3(), height: 1.6, radius: 0.32, speed: 2.4, bob: 0, stepT: 0, vel: new THREE.Vector3(), boxes: [], noise: 0, frozen: false,
  reset(x, z, yaw, boxes) { this.pos.set(x, 0, z); Look.baseYaw = yaw; Look.dragYaw = 0; Look.dragPitch = 0; Gyro.recenter(); this.boxes = boxes || []; this.vel.set(0, 0, 0); },
  update(dt, stepSound = true) {
    const mv = this.frozen ? new THREE.Vector2() : Input.moveVec();
    const fwd = new THREE.Vector3(-Math.sin(Look.yaw), 0, -Math.cos(Look.yaw));
    const right = new THREE.Vector3(Math.cos(Look.yaw), 0, -Math.sin(Look.yaw));
    const want = fwd.multiplyScalar(-mv.y).add(right.multiplyScalar(mv.x)).multiplyScalar(this.speed);
    this.vel.x = damp(this.vel.x, want.x, 10, dt); this.vel.z = damp(this.vel.z, want.z, 10, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    this.collide();
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.noise = (Input.keys.ShiftLeft || Input.keys.ShiftRight) && sp > this.speed * 0.85 ? 0.7 : 0;   // en el celu, caminar con el joystick es silencioso
    this.bob += sp * dt * 3.2;
    camera.position.set(this.pos.x, this.height + Math.sin(this.bob * 2) * 0.035 * Math.min(sp, 1), this.pos.z);
    if (sp > 0.4) { this.stepT -= dt * sp; if (this.stepT <= 0) { this.stepT = 1.1; if (stepSound) Audio.sfx.step(null, 0.07); } }
    return sp;
  },
  collide() {
    const r = this.radius;
    for (const b of this.boxes) {
      if (b.off) continue;
      const cx = clamp(this.pos.x, b.x0, b.x1), cz = clamp(this.pos.z, b.z0, b.z1);
      const dx = this.pos.x - cx, dz = this.pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; this.pos.x += dx * k; this.pos.z += dz * k; }
        else { // centro dentro de la caja: empujar por el lado más cercano
          const o = [this.pos.x - b.x0, b.x1 - this.pos.x, this.pos.z - b.z0, b.z1 - this.pos.z]; const m = Math.min(...o);
          if (m === o[0]) this.pos.x = b.x0 - r; else if (m === o[1]) this.pos.x = b.x1 + r; else if (m === o[2]) this.pos.z = b.z0 - r; else this.pos.z = b.z1 + r;
        }
      }
    }
  },
};
/** crea una caja de colisión a partir de centro y tamaño */
const box = (x, z, w, d) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
